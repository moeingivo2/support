<?php

namespace Tests\Feature;

use App\Models\Shift;
use App\Models\ShiftReport;
use App\Models\User;
use Tests\TestCase;

class ShiftReportTest extends TestCase
{
    private function endShiftFor(User $support): Shift
    {
        return $support->shifts()->create([
            'channel' => $support->support_type ?? 'web',
            'start_time' => now()->subHours(4),
            'end_time' => now(),
            'status' => 'ended',
        ]);
    }

    public function test_support_can_create_report_for_own_ended_shift(): void
    {
        $support = $this->makeSupport();
        $shift = $this->endShiftFor($support);

        $response = $this->actingAs($support, 'sanctum')
            ->postJson('/api/shift-reports', [
                'shift_id' => $shift->id,
                'responded_students_count' => 10,
                'unsatisfied_students_count' => 2,
                'desk_requests_count' => 3,
                'calls_count' => 4,
                'extra_notes' => 'تست',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('shift_reports', [
            'shift_id' => $shift->id,
            'responded_students_count' => 10,
        ]);
    }

    public function test_report_for_active_shift_is_rejected(): void
    {
        $support = $this->makeSupport();
        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/shift-reports', [
                'shift_id' => $shift->id,
                'responded_students_count' => 10,
                'unsatisfied_students_count' => 0,
                'desk_requests_count' => 0,
                'calls_count' => 0,
            ])->assertStatus(422);
    }

    public function test_report_for_other_users_shift_is_forbidden(): void
    {
        $owner = $this->makeSupport();
        $attacker = $this->makeSupport();
        $shift = $this->endShiftFor($owner);

        $this->actingAs($attacker, 'sanctum')
            ->postJson('/api/shift-reports', [
                'shift_id' => $shift->id,
                'responded_students_count' => 1,
                'unsatisfied_students_count' => 0,
                'desk_requests_count' => 0,
                'calls_count' => 0,
            ])->assertStatus(403);
    }

    public function test_duplicate_report_for_same_shift_is_rejected(): void
    {
        $support = $this->makeSupport();
        $shift = $this->endShiftFor($support);
        ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $support->id,
            'responded_students_count' => 1,
            'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0,
            'calls_count' => 0,
        ]);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/shift-reports', [
                'shift_id' => $shift->id,
                'responded_students_count' => 5,
                'unsatisfied_students_count' => 0,
                'desk_requests_count' => 0,
                'calls_count' => 0,
            ])->assertStatus(422);
    }

    public function test_negative_counts_are_rejected(): void
    {
        $support = $this->makeSupport();
        $shift = $this->endShiftFor($support);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/shift-reports', [
                'shift_id' => $shift->id,
                'responded_students_count' => -1,
                'unsatisfied_students_count' => 0,
                'desk_requests_count' => 0,
                'calls_count' => 0,
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['responded_students_count']);
    }

    public function test_support_sees_only_own_reports_in_index(): void
    {
        $owner = $this->makeSupport();
        $other = $this->makeSupport();
        $ownerShift = $this->endShiftFor($owner);
        $otherShift = $this->endShiftFor($other);

        ShiftReport::create([
            'shift_id' => $ownerShift->id, 'user_id' => $owner->id,
            'responded_students_count' => 1, 'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0, 'calls_count' => 0,
        ]);
        ShiftReport::create([
            'shift_id' => $otherShift->id, 'user_id' => $other->id,
            'responded_students_count' => 2, 'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0, 'calls_count' => 0,
        ]);

        $response = $this->actingAs($owner, 'sanctum')->getJson('/api/shift-reports');

        $response->assertStatus(200);
        $this->assertSame(1, $response->json('total'));
        $this->assertSame($owner->id, $response->json('data.0.user_id'));
    }

    public function test_admin_sees_all_reports_with_filters(): void
    {
        $admin = $this->makeAdmin();
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);

        $webShift = $this->endShiftFor($webSupport);
        $aiShift = $this->endShiftFor($aiSupport);

        ShiftReport::create([
            'shift_id' => $webShift->id, 'user_id' => $webSupport->id,
            'responded_students_count' => 5, 'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0, 'calls_count' => 0,
        ]);
        ShiftReport::create([
            'shift_id' => $aiShift->id, 'user_id' => $aiSupport->id,
            'responded_students_count' => 7, 'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0, 'calls_count' => 0,
        ]);

        // فیلتر پشتیبان
        $byUser = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/shift-reports?user_id={$aiSupport->id}");
        $byUser->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame($aiSupport->id, $byUser->json('data.0.user_id'));

        // فیلتر نوع پشتیبانی (کانال شیفت)
        $byChannel = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/shift-reports?channel=web');
        $byChannel->assertStatus(200)->assertJsonCount(1, 'data');

        // فیلتر روز
        $byDate = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/shift-reports?date='.now()->toDateString());
        $byDate->assertStatus(200)->assertSame(2, $byDate->json('total'));
    }

    public function test_pending_endpoint_shifts_without_report(): void
    {
        $support = $this->makeSupport();
        $this->endShiftFor($support);

        $response = $this->actingAs($support, 'sanctum')->getJson('/api/shift-reports/pending');

        $response->assertStatus(200)->assertJsonCount(1, 'shifts');
    }
}
