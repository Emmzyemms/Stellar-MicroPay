import { HttpException, HttpStatus } from '@nestjs/common';
const { withCircuitBreaker } = require('../middleware/horizonCircuitBreaker');

export const MIN_PAYMENT_XLM = 0.0001; // 1000 stroops (exceeds min fee of ~100 stroops to prevent dust)
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

export interface PaymentSubmissionDto {
  amount: number;
  recipient: string;
  memo?: string;
  sourceSecret?: string;
}

export interface HorizonResultCodes {
  transaction?: string;
  operations?: string[];
}

export interface HorizonErrorResponse {
  status?: number;
  data?: {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    extras?: {
      envelope_xdr?: string;
      result_codes?: HorizonResultCodes;
    };
  };
}

export interface HorizonSubmitter {
  submitTransaction(transaction: any): Promise<{ hash: string; ledger?: number }>;
  loadAccount?(publicKey: string): Promise<{ sequence: string }>;
}

export class PaymentService {
  constructor(
    private readonly horizonClient?: HorizonSubmitter,
    private readonly maxRetries: number = 2
  ) {}

  async submitPayment(dto: PaymentSubmissionDto): Promise<{ success: boolean; txHash?: string }> {
    // 1. Validate amount before submitting to Horizon
    if (typeof dto.amount !== 'number' || isNaN(dto.amount) || dto.amount < MIN_PAYMENT_XLM) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Amount too small — minimum payment is 0.0001 XLM',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // 2. Validate destination account
    if (!dto.recipient || !STELLAR_PUBLIC_KEY_REGEX.test(dto.recipient)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Malformed destination account — recipient must be a valid Stellar public key (G...)',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // 3. Submit transaction with circuit breaker & retry semantics
    return await this.executeSubmissionWithRetries(dto, 0);
  }

  private async executeSubmissionWithRetries(
    dto: PaymentSubmissionDto,
    attempt: number
  ): Promise<{ success: boolean; txHash?: string }> {
    try {
      // Horizon call wrapped in circuit breaker
      const result = await withCircuitBreaker(async () => {
        if (this.horizonClient) {
          return await this.horizonClient.submitTransaction(dto);
        }
        // Default mock submission if no client injected
        return { hash: 'mock_tx_hash_abc123' };
      });

      return {
        success: true,
        txHash: result?.hash || 'mock_tx_hash_abc123',
      };
    } catch (err: any) {
      // Circuit breaker open error (status 503)
      if (err?.status === 503 || err?.message === 'Stellar network temporarily unavailable') {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Stellar network temporarily unavailable — circuit breaker is open',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      const responseStatus = err?.response?.status || err?.status;
      const responseData = err?.response?.data || err?.data;
      const resultCodes: HorizonResultCodes | undefined = responseData?.extras?.result_codes;

      // 504 Gateway Timeout from Horizon HTTP response
      if (responseStatus === 504) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            message: responseData?.detail || 'Horizon gateway timeout (504)',
            error: 'Gateway Timeout',
            extras: responseData?.extras,
          },
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      // Timeout detection (network timeout, ECONNABORTED, or socket timeout)
      if (err?.code === 'ECONNABORTED' || err?.isTimeout || (err?.message?.toLowerCase().includes('timeout') && !err?.response)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            message: 'Horizon request timed out',
            error: 'Gateway Timeout',
          },
          HttpStatus.GATEWAY_TIMEOUT
        );
      }

      // Check result codes if transaction failed
      if (resultCodes) {
        // tx_bad_seq retry semantics
        if (resultCodes.transaction === 'tx_bad_seq') {
          if (attempt < this.maxRetries) {
            // If horizonClient provides loadAccount, refresh sequence
            if (this.horizonClient?.loadAccount && dto.sourceSecret) {
              await this.horizonClient.loadAccount(dto.sourceSecret);
            }
            return await this.executeSubmissionWithRetries(dto, attempt + 1);
          }

          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Transaction failed with tx_bad_seq: sequence number out of sync after retries',
              error: 'Bad Request',
              resultCodes,
            },
            HttpStatus.BAD_REQUEST
          );
        }

        // Insufficient balance result codes (op_underfunded, tx_insufficient_balance, op_low_reserve)
        const isUnderfunded =
          resultCodes.transaction === 'tx_insufficient_balance' ||
          resultCodes.operations?.includes('op_underfunded') ||
          resultCodes.operations?.includes('op_low_reserve');

        if (isUnderfunded) {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Payment failed: insufficient balance to complete payment (op_underfunded)',
              error: 'Bad Request',
              resultCodes,
            },
            HttpStatus.BAD_REQUEST
          );
        }

        // General 400 with other result codes (e.g. tx_bad_auth, op_no_destination)
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: responseData?.detail || `Transaction rejected with result code: ${resultCodes.transaction || 'unknown'}`,
            error: 'Bad Request',
            resultCodes,
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // General 400 Bad Request without result codes
      if (responseStatus === 400) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: responseData?.detail || responseData?.message || err?.message || 'Bad Request from Horizon',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Rethrow existing HttpException
      if (err instanceof HttpException) {
        throw err;
      }

      // 500 / other unexpected errors
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: err?.message || 'Internal payment submission error',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}