import { useState, useCallback } from 'react';
import { apiClient } from '../services/api';

interface PostalCodeSearchResult {
  prefecture: string;
  city: string;
  town: string;
}

interface UsePostalCodeSearchReturn {
  isLoading: boolean;
  searchByPostalCode: (
    postalCode: string
  ) => Promise<PostalCodeSearchResult | null>;
  handlePostalCodeChange: (
    postalCode: string,
    onAddressUpdate: (address: {
      prefecture: string;
      city: string;
      address_line1: string;
    }) => void
  ) => Promise<void>;
  formatPostalCode: (value: string) => string;
}

/**
 * 郵便番号自動補完カスタムフック
 *
 * 使用例:
 * ```tsx
 * const { isLoading, handlePostalCodeChange, formatPostalCode } = usePostalCodeSearch();
 *
 * const onPostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const formatted = formatPostalCode(e.target.value);
 *   setFormData(prev => ({ ...prev, postal_code: formatted }));
 *
 *   handlePostalCodeChange(formatted, (address) => {
 *     setFormData(prev => ({
 *       ...prev,
 *       prefecture: address.prefecture,
 *       city: address.city,
 *       address_line1: address.address_line1,
 *     }));
 *   });
 * };
 * ```
 */
export const usePostalCodeSearch = (): UsePostalCodeSearchReturn => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 郵便番号フォーマット（自動ハイフン挿入）
   * 例: "1234567" -> "123-4567", "123-4567" -> "123-4567"
   */
  const formatPostalCode = useCallback((value: string): string => {
    // 数字のみ抽出
    const numbers = value.replace(/[^0-9]/g, '');

    // 7桁を超える場合は7桁まで
    const truncated = numbers.slice(0, 7);

    // 3桁以上の場合はハイフンを挿入
    if (truncated.length >= 4) {
      return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
    }

    return truncated;
  }, []);

  /**
   * 郵便番号から住所を検索
   */
  const searchByPostalCode = useCallback(
    async (postalCode: string): Promise<PostalCodeSearchResult | null> => {
      try {
        setIsLoading(true);
        const result = await apiClient.searchByPostalCode(postalCode);
        return result;
      } catch (error) {
        console.error('郵便番号検索エラー:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 郵便番号変更時の自動補完処理
   */
  const handlePostalCodeChange = useCallback(
    async (
      postalCode: string,
      onAddressUpdate: (address: {
        prefecture: string;
        city: string;
        address_line1: string;
      }) => void
    ): Promise<void> => {
      // 7桁の数字が入力されたら自動検索
      const cleanedCode = postalCode.replace(/-/g, '');
      if (cleanedCode.length === 7 && /^\d{7}$/.test(cleanedCode)) {
        try {
          setIsLoading(true);
          const addressData = await apiClient.searchByPostalCode(postalCode);
          if (addressData) {
            onAddressUpdate({
              prefecture: addressData.prefecture,
              city: addressData.city,
              address_line1: addressData.town, // 町域を番地欄に設定
            });
          }
        } catch (error) {
          console.error('郵便番号検索エラー:', error);
          // エラーは無視して続行（手動入力を妨げない）
        } finally {
          setIsLoading(false);
        }
      }
    },
    []
  );

  return {
    isLoading,
    searchByPostalCode,
    handlePostalCodeChange,
    formatPostalCode,
  };
};
