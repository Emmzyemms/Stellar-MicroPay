import { useState } from 'react';
import { Asset } from '@stellar/stellar-sdk';
import {
  STELLAR_MINIMUM_ACCOUNT_BALANCE_XLM,
  USDC,
  USDC_ISSUER,
} from '@/lib/stellar';
import { useTranslation } from '@/contexts/I18nContext';
import { formatXLM, formatNumber } from '@/utils/intlFormatters';

type AssetType = 'XLM' | 'USDC' | 'CUSTOM';

interface CustomAsset {
  code: string;
  issuer: string;
}

interface AmountFieldProps {
  selectedAsset: AssetType;
  onAssetChange: (asset: AssetType) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  xlmBalance: string;
  usdcBalance?: string | null;
  accountBalances?: Array<{ code: string; issuer: string; balance: string }>;
  assetOptions?: AssetType[];
  hideAssetSelector?: boolean;
  hideAmountField?: boolean;
  customAsset?: CustomAsset;
  onCustomAssetChange?: (asset: CustomAsset) => void;
  showCustomAssetForm?: boolean;
  onShowCustomAssetForm?: (show: boolean) => void;
  networkFeeXlm?: number;
}

export default function AmountField({
  selectedAsset,
  onAssetChange,
  amount,
  onAmountChange,
  xlmBalance,
  usdcBalance,
  accountBalances = [],
  assetOptions = ['XLM', 'USDC'],
  hideAssetSelector = false,
  hideAmountField = false,
  customAsset,
  onCustomAssetChange,
  showCustomAssetForm = false,
  onShowCustomAssetForm,
  networkFeeXlm = 0.00001,
}: AmountFieldProps) {
  const { t } = useTranslation();
  const [customAssetCode, setCustomAssetCode] = useState(customAsset?.code ?? '');
  const [customAssetIssuer, setCustomAssetIssuer] = useState(customAsset?.issuer ?? '');

  const getBalance = () => {
    if (selectedAsset === 'XLM') return xlmBalance;
    if (selectedAsset === 'USDC') return usdcBalance || '0';
    if (selectedAsset === 'CUSTOM' && customAsset) {
      const balance = accountBalances.find(
        (b) => b.code === customAsset.code && b.issuer === customAsset.issuer
      );
      return balance?.balance ?? '0';
    }
    return '0';
  };

  const balance = parseFloat(getBalance());
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= balance;

  const handleSendMax = () => {
    const max = selectedAsset === 'XLM'
      ? Math.max(0, balance - STELLAR_MINIMUM_ACCOUNT_BALANCE_XLM - networkFeeXlm)
      : balance;
    onAmountChange(Math.max(0, max).toFixed(7));
  };

  const handleCustomAssetSubmit = () => {
    if (customAssetCode && customAssetIssuer && onCustomAssetChange) {
      onCustomAssetChange({ code: customAssetCode, issuer: customAssetIssuer });
      if (onShowCustomAssetForm) {
        onShowCustomAssetForm(false);
      }
    }
  };

  if (hideAmountField) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Asset Selector */}
      {!hideAssetSelector && (
        <div>
          <label className="label">{t('sendPayment.assetLabel')}</label>
          <div className="flex gap-2">
            {assetOptions.map((asset) => (
              <button
                key={asset}
                onClick={() => onAssetChange(asset)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  selectedAsset === asset
                    ? 'bg-stellar-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                {asset}
              </button>
            ))}
            {assetOptions.includes('CUSTOM') && (
              <button
                onClick={() => onShowCustomAssetForm?.(!showCustomAssetForm)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  showCustomAssetForm
                    ? 'bg-stellar-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                {t('sendPayment.customAsset')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom Asset Form */}
      {showCustomAssetForm && assetOptions.includes('CUSTOM') && (
        <div className="bg-slate-700/30 p-3 rounded-lg space-y-2">
          <input
            type="text"
            placeholder={t('sendPayment.assetCode')}
            value={customAssetCode}
            onChange={(e) => setCustomAssetCode(e.target.value.toUpperCase())}
            maxLength={12}
            className="input-field text-sm"
          />
          <input
            type="text"
            placeholder={t('sendPayment.assetIssuer')}
            value={customAssetIssuer}
            onChange={(e) => setCustomAssetIssuer(e.target.value)}
            className="input-field text-sm"
          />
          <button
            onClick={handleCustomAssetSubmit}
            disabled={!customAssetCode || !customAssetIssuer}
            className="btn-secondary w-full text-sm py-1.5"
            type="button"
          >
            {t('sendPayment.selectAsset')}
          </button>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label">{t('sendPayment.amountLabel')}</label>
          <span className="text-xs text-slate-400">
            {t('sendPayment.balance')}: {formatXLM(getBalance())}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.0"
            min="0"
            step="0.0000001"
            className={`input-field ${!isValidAmount && amount ? 'border-red-500' : ''}`}
          />
          <button
            onClick={handleSendMax}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stellar-400 hover:text-stellar-300 text-sm font-medium"
            type="button"
            title={t('sendPayment.sendMaxTooltip')}
          >
            {t('sendPayment.sendMax')}
          </button>
        </div>
        {!isValidAmount && amount && (
          <p className="text-red-400 text-sm mt-1">
            {t('sendPayment.insufficientBalance')}
          </p>
        )}
      </div>
    </div>
  );
}
