<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * LINE チャンネル ID のユニーク制約（Webhook routing 用）
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->unique('line_channel_id', 'stores_line_channel_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropUnique('stores_line_channel_id_unique');
        });
    }
};
