<?php

namespace App\Exceptions;

use Exception;

/**
 * OutsideBusinessHoursException
 * 
 * 営業時間外予約例外クラス
 * 
 * 営業時間外または休業日の予約を試行した場合にスローされる
 * - HTTP 422 Unprocessable Entity レスポンス対応
 * - 営業時間情報の提供
 * 
 * @package App\Exceptions
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class OutsideBusinessHoursException extends Exception
{
    /**
     * 営業時間情報
     */
    protected array $businessHoursInfo;

    /**
     * コンストラクタ
     * 
     * @param string $message エラーメッセージ
     * @param array $businessHoursInfo 営業時間情報
     * @param int $code エラーコード
     * @param Exception|null $previous 前の例外
     */
    public function __construct(
        string $message = '営業時間外の予約は受け付けできません',
        array $businessHoursInfo = [],
        int $code = 422,
        Exception $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->businessHoursInfo = $businessHoursInfo;
    }

    /**
     * 営業時間情報を取得
     * 
     * @return array
     */
    public function getBusinessHoursInfo(): array
    {
        return $this->businessHoursInfo;
    }

    /**
     * APIレスポンス用のエラー情報を取得
     * 
     * @return array
     */
    public function getApiErrorData(): array
    {
        return [
            'code' => 'OUTSIDE_BUSINESS_HOURS',
            'message' => $this->getMessage(),
            'details' => [
                'business_hours' => $this->businessHoursInfo,
                'suggested_action' => '営業時間内の日時をお選びください'
            ]
        ];
    }
}
