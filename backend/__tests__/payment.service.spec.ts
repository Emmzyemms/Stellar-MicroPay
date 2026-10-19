import { PaymentService, PaymentSubmissionDto } from '../src/services/payment.service';
import { HttpException, HttpStatus } from '@nestjs/common';
const {
  resetCircuit,
  _forceStateForTesting,
  STATE,
} = require('../src/middleware/horizonCircuitBreaker');

describe('PaymentService Error Handling & Validation (#1414)', () => {
  const validRecipient = 'GDJX25F6ZLNST7G4Q73T464VMRYF6Y2YQO7R3Y7WJ7YVHYV7YVHYV7YV';
  const invalidRecipient = 'BAD_ADDRESS_123';

  beforeEach(() => {
    resetCircuit();
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    let service: PaymentService;

    beforeEach(() => {
      service = new PaymentService();
    });

    it('rejects payments with amount less than 0.0001 XLM with 400 Bad Request', async () => {
      const payload: PaymentSubmissionDto = { amount: 0.00005, recipient: validRecipient };

      await expect(service.submitPayment(payload)).rejects.toThrow(HttpException);

      try {
        await service.submitPayment(payload);
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toMatchObject({
          message: 'Amount too small — minimum payment is 0.0001 XLM',
        });
      }
    });

    it('rejects invalid or NaN payment amounts with 400 Bad Request', async () => {
      const payload: any = { amount: NaN, recipient: validRecipient };

      try {
        await service.submitPayment(payload);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toContain('Amount too small');
      }
    });

    it('rejects payments with malformed destination account', async () => {
      const payload: PaymentSubmissionDto = { amount: 10, recipient: invalidRecipient };

      await expect(service.submitPayment(payload)).rejects.toThrow(HttpException);

      try {
        await service.submitPayment(payload);
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toMatchObject({
          message: expect.stringContaining('Malformed destination account'),
        });
      }
    });

    it('accepts payments with amount equal to or greater than 0.0001 XLM and valid recipient', async () => {
      const payloadValid: PaymentSubmissionDto = { amount: 0.0001, recipient: validRecipient };
      const result = await service.submitPayment(payloadValid);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('mock_tx_hash_abc123');
    });
  });

  describe('Circuit Breaker Short-Circuit', () => {
    it('short-circuits with 503 Service Unavailable when circuit breaker is OPEN', async () => {
      _forceStateForTesting(STATE.OPEN);

      const mockSubmitter = {
        submitTransaction: jest.fn(),
      };
      const service = new PaymentService(mockSubmitter);

      const payload: PaymentSubmissionDto = { amount: 1, recipient: validRecipient };

      try {
        await service.submitPayment(payload);
        fail('Should have thrown 503');
      } catch (error: any) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(error.getResponse().message).toContain('circuit breaker is open');
      }

      expect(mockSubmitter.submitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Horizon Timeouts (Network vs 504)', () => {
    it('maps network timeout (ECONNABORTED) to 504 Gateway Timeout', async () => {
      const timeoutError: any = new Error('connect ECONNABORTED');
      timeoutError.code = 'ECONNABORTED';

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(timeoutError),
      };
      const service = new PaymentService(mockSubmitter);

      const payload: PaymentSubmissionDto = { amount: 5, recipient: validRecipient };

      try {
        await service.submitPayment(payload);
        fail('Should have thrown 504');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
        expect(error.getResponse().message).toBe('Horizon request timed out');
      }
    });

    it('maps Horizon 504 HTTP Gateway Timeout response', async () => {
      const gatewayTimeoutError: any = new Error('Gateway Timeout');
      gatewayTimeoutError.response = {
        status: 504,
        data: {
          type: 'https://stellar.org/horizon-errors/timeout',
          title: 'Gateway Timeout',
          status: 504,
          detail: 'Horizon timed out communicating with stellar-core',
          extras: { duration_ms: 10000 },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(gatewayTimeoutError),
      };
      const service = new PaymentService(mockSubmitter);

      const payload: PaymentSubmissionDto = { amount: 5, recipient: validRecipient };

      try {
        await service.submitPayment(payload);
        fail('Should have thrown 504');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
        expect(error.getResponse().message).toContain('Horizon timed out');
        expect(error.getResponse().extras).toBeDefined();
      }
    });
  });

  describe('Horizon tx_bad_seq Retry Semantics', () => {
    it('retries on tx_bad_seq and succeeds when subsequent attempt passes', async () => {
      const badSeqError: any = new Error('Bad Sequence');
      badSeqError.response = {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_seq',
            },
          },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest
          .fn()
          .mockRejectedValueOnce(badSeqError)
          .mockResolvedValueOnce({ hash: 'tx_success_after_bad_seq' }),
        loadAccount: jest.fn().mockResolvedValue({ sequence: '101' }),
      };

      const service = new PaymentService(mockSubmitter, 2);
      const payload: PaymentSubmissionDto = {
        amount: 2,
        recipient: validRecipient,
        sourceSecret: 'S_TEST_SECRET',
      };

      const result = await service.submitPayment(payload);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('tx_success_after_bad_seq');
      expect(mockSubmitter.submitTransaction).toHaveBeenCalledTimes(2);
      expect(mockSubmitter.loadAccount).toHaveBeenCalledWith('S_TEST_SECRET');
    });

    it('exhausts retries on persistent tx_bad_seq and throws 400 Bad Request', async () => {
      const badSeqError: any = new Error('Bad Sequence');
      badSeqError.response = {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_seq',
            },
          },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(badSeqError),
      };

      const service = new PaymentService(mockSubmitter, 2);
      const payload: PaymentSubmissionDto = { amount: 2, recipient: validRecipient };

      try {
        await service.submitPayment(payload);
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toContain('tx_bad_seq');
        expect(mockSubmitter.submitTransaction).toHaveBeenCalledTimes(3); // attempt 0, 1, 2
      }
    });
  });

  describe('Insufficient Balance Result Codes', () => {
    it('maps op_underfunded operation result code to 400 Bad Request with clear message', async () => {
      const underfundedError: any = new Error('Transaction Failed');
      underfundedError.response = {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['op_underfunded'],
            },
          },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(underfundedError),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1000, recipient: validRecipient });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toContain('insufficient balance to complete payment');
      }
    });

    it('maps tx_insufficient_balance transaction result code', async () => {
      const underfundedError: any = new Error('Transaction Failed');
      underfundedError.response = {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_insufficient_balance',
            },
          },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(underfundedError),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1000, recipient: validRecipient });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toContain('insufficient balance');
      }
    });
  });

  describe('Other Horizon Errors & Fallbacks', () => {
    it('maps generic Horizon 400 Bad Request without result codes', async () => {
      const generic400: any = new Error('Invalid query parameter');
      generic400.response = {
        status: 400,
        data: {
          detail: 'Transaction envelope cannot be decoded',
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(generic400),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1, recipient: validRecipient });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toBe('Transaction envelope cannot be decoded');
      }
    });

    it('maps other transaction result codes like tx_bad_auth to 400 Bad Request', async () => {
      const authError: any = new Error('Transaction Failed');
      authError.response = {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_auth',
            },
          },
        },
      };

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(authError),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1, recipient: validRecipient });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse().message).toContain('tx_bad_auth');
      }
    });

    it('rethrows existing HttpException unchanged', async () => {
      const customHttpException = new HttpException(
        { message: 'Custom forbidden', error: 'Forbidden' },
        HttpStatus.FORBIDDEN
      );

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(customHttpException),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1, recipient: validRecipient });
        fail('Should have thrown 403');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getResponse().message).toBe('Custom forbidden');
      }
    });

    it('maps unexpected non-Horizon exception to 500 Internal Server Error', async () => {
      const unexpectedError = new Error('Unexpected crash in crypto subsystem');

      const mockSubmitter = {
        submitTransaction: jest.fn().mockRejectedValue(unexpectedError),
      };
      const service = new PaymentService(mockSubmitter);

      try {
        await service.submitPayment({ amount: 1, recipient: validRecipient });
        fail('Should have thrown 500');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse().message).toBe('Unexpected crash in crypto subsystem');
      }
    });
  });
});