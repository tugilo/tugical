<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 通知テーブルに通知テンプレートへの外部キー制約を追加
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign('notification_template_id')
                ->references('id')
                ->on('notification_templates')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['notification_template_id']);
        });
    }
};
