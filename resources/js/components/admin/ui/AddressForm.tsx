import React from 'react';
import SoftDigitField from './SoftDigitField';
import { FIELD_TIPS } from './fieldTips';
import { usePostalCodeSearch } from '../../../usePostalCodeSearch';

interface AddressFormData {
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string;
  address?: string;
}

interface AddressFormProps {
  data: AddressFormData;
  onChange: (data: Partial<AddressFormData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showCompleteAddress?: boolean;
  className?: string;
}

/**
 * 住所入力フォームコンポーネント（郵便番号自動補完機能付き）
 *
 * 使用例:
 * ```tsx
 * const [addressData, setAddressData] = useState({
 *   postal_code: '',
 *   prefecture: '',
 *   city: '',
 *   address_line1: '',
 *   address_line2: '',
 *   address: '',
 * });
 *
 * <AddressForm
 *   data={addressData}
 *   onChange={(data) => setAddressData(prev => ({ ...prev, ...data }))}
 *   errors={errors}
 * />
 * ```
 */
export const AddressForm: React.FC<AddressFormProps> = ({
  data,
  onChange,
  errors = {},
  disabled = false,
  showCompleteAddress = true,
  className = '',
}) => {
  const {
    isLoading: postalCodeLoading,
    handlePostalCodeChange,
    formatPostalCode,
  } = usePostalCodeSearch();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <SoftDigitField
            name='postal_code'
            variant='postal'
            label={postalCodeLoading ? '郵便番号（検索中...）' : '郵便番号'}
            tip={FIELD_TIPS.customerPostal}
            value={data.postal_code || ''}
            onChange={v => onChange({ postal_code: formatPostalCode(v) })}
            onAfterChange={formatted => {
              handlePostalCodeChange(formatted, address => {
                onChange({
                  prefecture: address.prefecture,
                  city: address.city,
                  address_line1: address.address_line1,
                });
              });
            }}
            error={errors.postal_code}
            disabled={disabled}
            placeholder='タップして入力'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            都道府県
          </label>
          <input
            type='text'
            value={data.prefecture || ''}
            onChange={e => onChange({ prefecture: e.target.value })}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.prefecture ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            placeholder='東京都'
          />
          {errors.prefecture && (
            <p className='mt-1 text-sm text-red-600'>{errors.prefecture}</p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            市区町村
          </label>
          <input
            type='text'
            value={data.city || ''}
            onChange={e => onChange({ city: e.target.value })}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.city ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            placeholder='渋谷区'
          />
          {errors.city && (
            <p className='mt-1 text-sm text-red-600'>{errors.city}</p>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            番地・建物名
          </label>
          <input
            type='text'
            value={data.address_line1 || ''}
            onChange={e => onChange({ address_line1: e.target.value })}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.address_line1 ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            placeholder='神宮前1-2-3 テストビル'
          />
          {errors.address_line1 && (
            <p className='mt-1 text-sm text-red-600'>{errors.address_line1}</p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            部屋番号・その他
          </label>
          <input
            type='text'
            value={data.address_line2 || ''}
            onChange={e => onChange({ address_line2: e.target.value })}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.address_line2 ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            placeholder='5F'
          />
          {errors.address_line2 && (
            <p className='mt-1 text-sm text-red-600'>{errors.address_line2}</p>
          )}
        </div>
      </div>

      {showCompleteAddress && (
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            完全住所（任意）
          </label>
          <textarea
            value={data.address || ''}
            onChange={e => onChange({ address: e.target.value })}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.address ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            rows={2}
            placeholder='上記の構造化住所が適切でない場合、こちらに完全な住所を入力してください'
          />
          {errors.address && (
            <p className='mt-1 text-sm text-red-600'>{errors.address}</p>
          )}
        </div>
      )}
    </div>
  );
};
