import { useState } from 'react';
import {
  STELLAR_MEMO_TEXT_MAX_BYTES,
  STELLAR_MEMO_HASH_HEX_LENGTH,
  STELLAR_MEMO_PLACEHOLDERS,
  StellarMemoType,
  memoTextByteLength,
  truncateMemoText,
} from '@/lib/stellar';
import { useTranslation } from '@/contexts/I18nContext';

interface MemoFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  memoType: StellarMemoType;
  onMemoTypeChange: (type: StellarMemoType) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  hideMemoField?: boolean;
  selectedTemplate?: string | null;
  onTemplateSelect?: (template: string) => void;
}

const MEMO_TEMPLATES = ['Rent', 'Salary', 'Invoice', 'Gift', 'Coffee ☕'];

export default function MemoField({
  value,
  onValueChange,
  memoType,
  onMemoTypeChange,
  error,
  onErrorChange,
  hideMemoField = false,
  selectedTemplate,
  onTemplateSelect,
}: MemoFieldProps) {
  const { t } = useTranslation();

  if (hideMemoField) {
    return null;
  }

  const byteLength = memoTextByteLength(value);
  const isValidLength = byteLength <= STELLAR_MEMO_TEXT_MAX_BYTES;

  const handleMemoChange = (newValue: string) => {
    if (memoType === 'text') {
      if (byteLength > STELLAR_MEMO_TEXT_MAX_BYTES) {
        const truncated = truncateMemoText(newValue);
        onValueChange(truncated);
        if (onErrorChange) {
          onErrorChange(null);
        }
        return;
      }
    } else if (memoType === 'hash') {
      if (newValue.length > STELLAR_MEMO_HASH_HEX_LENGTH) {
        return;
      }
    }
    onValueChange(newValue);
    if (onErrorChange) {
      onErrorChange(null);
    }
  };

  const handleTemplateClick = (template: string) => {
    if (selectedTemplate === template) {
      onValueChange('');
      if (onTemplateSelect) {
        onTemplateSelect('');
      }
    } else {
      onValueChange(template);
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Memo Type Selector */}
      <div>
        <label className="label">{t('sendPayment.memoTypeLabel')}</label>
        <div className="flex gap-2">
          {['text', 'hash'].map((type) => (
            <button
              key={type}
              onClick={() => {
                onMemoTypeChange(type as StellarMemoType);
                onValueChange('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition text-sm ${
                memoType === type
                  ? 'bg-stellar-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              type="button"
            >
              {type === 'text' ? t('sendPayment.memoTypeText') : t('sendPayment.memoTypeHash')}
            </button>
          ))}
        </div>
      </div>

      {/* Memo Input */}
      <div>
        <label className="label">{t('sendPayment.memoLabel')}</label>
        <textarea
          value={value}
          onChange={(e) => handleMemoChange(e.target.value)}
          placeholder={
            memoType === 'text'
              ? t('sendPayment.memoPlaceholder')
              : STELLAR_MEMO_PLACEHOLDERS.hash
          }
          maxLength={
            memoType === 'text'
              ? undefined
              : STELLAR_MEMO_HASH_HEX_LENGTH
          }
          className={`input-field h-20 ${
            error ? 'border-red-500' : !isValidLength ? 'border-yellow-500' : ''
          }`}
          disabled={memoType === 'hash' && value.length >= STELLAR_MEMO_HASH_HEX_LENGTH}
        />

        {/* Byte Count (text only) */}
        {memoType === 'text' && (
          <p
            className={`text-xs mt-1 ${
              byteLength > STELLAR_MEMO_TEXT_MAX_BYTES
                ? 'text-red-400'
                : byteLength > STELLAR_MEMO_TEXT_MAX_BYTES * 0.8
                  ? 'text-yellow-400'
                  : 'text-slate-400'
            }`}
          >
            {byteLength} / {STELLAR_MEMO_TEXT_MAX_BYTES} bytes
          </p>
        )}

        {/* Hash Length (hash only) */}
        {memoType === 'hash' && (
          <p className="text-xs text-slate-400 mt-1">
            {value.length} / {STELLAR_MEMO_HASH_HEX_LENGTH} characters
          </p>
        )}

        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>

      {/* Memo Templates (text only) */}
      {memoType === 'text' && (
        <div>
          <label className="label text-xs">{t('sendPayment.memoTemplates')}</label>
          <div className="flex flex-wrap gap-2">
            {MEMO_TEMPLATES.map((template) => (
              <button
                key={template}
                onClick={() => handleTemplateClick(template)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  selectedTemplate === template
                    ? 'bg-stellar-500/20 border border-stellar-500/30 text-stellar-300'
                    : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
                type="button"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
