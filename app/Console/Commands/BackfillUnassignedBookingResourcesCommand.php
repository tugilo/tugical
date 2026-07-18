<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Console\Command;

/**
 * 未割当（resource_id null）予約へ担当者を一括割当するコマンド
 *
 * PHASE_017 の自動割当ルール（sort_order 優先）で既存データを修復する。
 */
class BackfillUnassignedBookingResourcesCommand extends Command
{
    protected $signature = 'bookings:backfill-unassigned-resources
                            {--store= : 対象店舗 ID（省略時は全店舗）}
                            {--dry-run : 更新せず件数のみ表示}';

    protected $description = '既存のスタッフ未割当予約へ優先順で担当者を一括割当する';

    /**
     * コマンド実行
     */
    public function handle(BookingService $bookingService): int
    {
        $storeOpt = $this->option('store');
        $storeId = $storeOpt !== null && $storeOpt !== '' ? (int) $storeOpt : null;
        $dryRun = (bool) $this->option('dry-run');

        $query = Booking::query()
            ->whereNull('resource_id')
            ->whereIn('status', ['confirmed', 'pending', 'completed']);

        if ($storeId !== null) {
            $query->where('store_id', $storeId);
        }

        $count = $query->count();
        $this->info("未割当予約: {$count} 件" . ($storeId ? "（store_id={$storeId}）" : '（全店舗）'));

        if ($count === 0) {
            $this->info('対象なし。終了します。');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $query->orderBy('booking_date')->orderBy('start_time')->orderBy('id')
                ->get(['id', 'store_id', 'booking_date', 'start_time', 'end_time', 'status'])
                ->each(function (Booking $b) {
                    $date = $b->booking_date instanceof \DateTimeInterface
                        ? $b->booking_date->format('Y-m-d')
                        : substr((string) $b->booking_date, 0, 10);
                    $this->line(sprintf(
                        '  #%d store=%d %s %s-%s %s',
                        $b->id,
                        $b->store_id,
                        $date,
                        substr((string) $b->start_time, 0, 5),
                        substr((string) $b->end_time, 0, 5),
                        $b->status
                    ));
                });
            $this->warn('dry-run のため更新していません。');

            return self::SUCCESS;
        }

        $result = $bookingService->backfillUnassignedResources($storeId);

        $this->info(sprintf(
            '完了: 割当=%d / 強制割当=%d / スキップ=%d',
            $result['assigned'],
            $result['forced'],
            $result['skipped']
        ));

        foreach ($result['details'] as $row) {
            if (isset($row['error'])) {
                $this->error("  #{$row['booking_id']} ERROR: {$row['error']}");
                continue;
            }
            $flag = !empty($row['forced']) ? 'forced' : 'ok';
            $this->line(sprintf(
                '  #%d → resource_id=%d (%s) %s %s',
                $row['booking_id'],
                $row['resource_id'],
                $flag,
                $row['date'] ?? '',
                $row['start_time'] ?? ''
            ));
        }

        $remaining = Booking::query()
            ->whereNull('resource_id')
            ->whereIn('status', ['confirmed', 'pending', 'completed'])
            ->when($storeId !== null, fn ($q) => $q->where('store_id', $storeId))
            ->count();

        if ($remaining > 0) {
            $this->warn("残りの未割当: {$remaining} 件");

            return self::FAILURE;
        }

        $this->info('未割当は 0 件になりました。');

        return self::SUCCESS;
    }
}
