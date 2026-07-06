<?php

namespace App\Exceptions;

use Exception;

/**
 * HoldTokenExpiredException
 * 
 * Hold Token期限切れ例外クラス
 * 
 * 仮押さえトークンの期限が切れている場合にスローされる
 * - HTTP 410 Gone レスポンス対応
 * - 再選択を促すメッセージ
 * 
 * @package App\Exceptions
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class HoldTokenExpiredException extends Exception
{
    /**
     * Hold Token情報
     */
    protected array $tokenInfo;

    /**
     * コンストラクタ
     * 
     * @param string $message エラーメッセージ
     * @param array $tokenInfo トークン情報
     * @param int $code エラーコード
     * @param Exception|null $previous 前の例外
     */
    public function __construct(
        string $message = '仮押さえ期限が切れています。再度時間をお選びください',
        array $tokenInfo = [],
        int $code = 410,
        Exception $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->tokenInfo = $tokenInfo;
    }

    /**
     * トークン情報を取得
     * 
     * @return array
     */
    public function getTokenInfo(): array
    {
        return $this->tokenInfo;
    }

    /**
     * APIレスポンス用のエラー情報を取得
     * 
     * @return array
     */
    public function getApiErrorData(): array
    {
        return [
            'code' => 'HOLD_TOKEN_EXPIRED',
            'message' => $this->getMessage(),
            'details' => [
                'token_info' => $this->tokenInfo,
                'suggested_action' => '時間選択からやり直してください'
            ]
        ];
    }
}
