<?php

namespace Tests\Unit;

use App\Models\Shift;
use App\Models\User;
use Tests\TestCase;

class ShiftModelTest extends TestCase
{
    public function test_duration_in_minutes_for_open_shift(): void
    {
        $shift = new Shift([
            'start_time' => now()->subHour(),
            'end_time' => null,
        ]);

        $this->assertEqualsWithDelta(60, $shift->duration_in_minutes, 1);
    }

    public function test_duration_in_minutes_for_closed_shift(): void
    {
        $start = now()->subHours(3);
        $end = now()->subHour();

        $shift = new Shift(['start_time' => $start, 'end_time' => $end]);

        $this->assertEqualsWithDelta(120, $shift->duration_in_minutes, 1);
    }

    public function test_status_defaults_to_active_on_create(): void
    {
        $user = User::factory()->create();
        $shift = $user->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
        ]);

        $this->assertSame('active', $shift->status);
    }
}
