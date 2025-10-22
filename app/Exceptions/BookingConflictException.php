<?php

namespace App\Exceptions;

use Exception;

/**
 * BookingConflictException
 * 
 * 予約競合エラー例外クラス
 * 
 * 指定時間での予約競合が発生した場合にスローされる
 * - HTTP 409 Conflict レスポンス対応
 * - 詳細なエラー情報提供
 * 
 * @package App\Exceptions
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class BookingConflictException extends Exception
{
    /**
     * 競合詳細情報
     */
    protected array $conflictDetails;

    /**
     * コンストラクタ
     * 
     * @param string $message エラーメッセージ
     * @param array $conflictDetails 競合詳細情報
     * @param int $code エラーコード
     * @param Exception|null $previous 前の例外
     */
    public function __construct(
        string $message = '指定時間は既に予約されています',
        array $conflictDetails = [],
        int $code = 409,
        Exception $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->conflictDetails = $conflictDetails;
    }

    /**
     * 競合詳細情報を取得
     * 
     * @return array
     */
    public function getConflictDetails(): array
    {
        return $this->conflictDetails;
    }

    /**
     * APIレスポンス用のエラー情報を取得
     * 
     * @return array
     */
    public function getApiErrorData(): array
    {
        return [
            'code' => 'BOOKING_CONFLICT',
            'message' => $this->getMessage(),
            'details' => $this->conflictDetails
        ];
    }
}
