<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\ShiftSchedule;
use App\Models\User;
use App\Support\ActorRole;
use Tests\TestCase;

/**
 * ناظر اکانت: تیم پشتیبان خودش را می‌سازد، شیفت تقسیم می‌کند و با
 * impersonation وارد حساب پشتیبان می‌شود. هر سه بر پایهٔ انتساب ادمین و
 * هم‌نوع بودنِ پشتیبان محدود شده‌اند.
 */
class AccountObserverTeamTest extends TestCase
{
    public function test_managed_supports_only_lists_assigned_same_type_supports(): void
    {
        $observer = $this->makeAccountObserver();
        $otherObserver = $this->makeAccountObserver();
        $assigned = $this->makeSupport(['name' => 'پشتیبان تیم', 'observer_id' => $observer->id]);
        $this->makeSupport(['name' => 'پشتیبان تیم دیگر', 'observer_id' => $otherObserver->id]);
        $this->makeSupport(['name' => 'پشتیبان بدون تیم']);
        $this->makeSupport(['name' => 'پشتیبان ai', 'support_type' => 'ai', 'observer_id' => $observer->id]);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/managed-supports');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assigned->id)
            ->assertJsonPath('data.0.name', 'پشتیبان تیم');
    }

    public function test_observer_cannot_impersonate_unassigned_or_other_type_support(): void
    {
        $observer = $this->makeAccountObserver();
        $unassigned = $this->makeSupport();
        $otherType = $this->makeSupport(['support_type' => 'ai', 'observer_id' => $observer->id]);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$unassigned->id}/impersonate")
            ->assertStatus(403);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$otherType->id}/impersonate")
            ->assertStatus(403);
    }

    public function test_observer_can_impersonate_assigned_same_type_support(): void
    {
        $observer = $this->makeAccountObserver();
        $support = $this->makeSupport(['name' => 'پشتیبان تیم', 'observer_id' => $observer->id]);

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$support->id}/impersonate");

        $response->assertOk()
            ->assertJsonPath('user.id', $support->id)
            ->assertJsonPath('user.role', 'support');

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('observer_access_logs', [
            'observer_id' => $observer->id,
            'action' => 'impersonate_support:'.$support->id,
        ]);
    }

    public function test_impersonation_does_not_reassign_the_support(): void
    {
        $observer = $this->makeAccountObserver();
        $support = $this->makeSupport(['observer_id' => null]);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$support->id}/impersonate")
            ->assertStatus(403);

        $this->assertNull($support->fresh()->observer_id);
    }

    public function test_observer_is_denied_managed_supports_endpoints(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/support/conversations/managed-supports')
            ->assertStatus(403);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$support->id}/impersonate")
            ->assertStatus(403);
    }

    public function test_shift_schedule_splits_minutes_between_assigned_supports(): void
    {
        $observer = $this->makeAccountObserver();
        $first = $this->makeSupport(['observer_id' => $observer->id]);
        $second = $this->makeSupport(['observer_id' => $observer->id]);

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت صبح',
                'channel' => 'web',
                'shift_date' => '2026-10-06',
                'starts_at' => '09:00',
                'ends_at' => '10:01',
                'support_ids' => [$first->id, $second->id],
            ]);

        $response->assertStatus(201);

        $schedule = ShiftSchedule::query()->with('assignments')->sole();
        $this->assertSame($observer->id, $schedule->created_by);

        $minutes = $schedule->assignments->sum(function ($assignment): int {
            [$startHour, $startMinute] = array_map('intval', explode(':', $assignment->starts_at));
            [$endHour, $endMinute] = array_map('intval', explode(':', $assignment->ends_at));

            return ($endHour * 60 + $endMinute) - ($startHour * 60 + $startMinute);
        });
        $this->assertSame(61, $minutes);
    }

    public function test_shift_schedule_rejects_unassigned_and_other_type_supports(): void
    {
        $observer = $this->makeAccountObserver();
        $unassigned = $this->makeSupport();
        $otherType = $this->makeSupport(['support_type' => 'ai', 'observer_id' => $observer->id]);

        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت صبح',
                'channel' => 'web',
                'shift_date' => '2026-10-06',
                'starts_at' => '09:00',
                'ends_at' => '17:00',
                'support_ids' => [$unassigned->id, $otherType->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('support_ids');

        $this->assertSame(0, ShiftSchedule::query()->count());
    }

    public function test_shift_schedule_rejects_more_supports_than_shift_minutes(): void
    {
        $observer = $this->makeAccountObserver();
        $first = $this->makeSupport(['observer_id' => $observer->id]);
        $second = $this->makeSupport(['observer_id' => $observer->id]);

        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت کوتاه',
                'channel' => 'web',
                'shift_date' => '2026-10-06',
                'starts_at' => '09:00',
                'ends_at' => '09:01',
                'support_ids' => [$first->id, $second->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('support_ids');
    }

    public function test_shift_schedule_index_is_scoped_to_the_creating_observer(): void
    {
        $observer = $this->makeAccountObserver();
        $otherObserver = $this->makeAccountObserver();

        ShiftSchedule::query()->create([
            'created_by' => $observer->id,
            'name' => 'شیفت من',
            'channel' => 'web',
            'shift_date' => '2026-10-06',
            'starts_at' => '09:00:00',
            'ends_at' => '17:00:00',
        ]);
        ShiftSchedule::query()->create([
            'created_by' => $otherObserver->id,
            'name' => 'شیفت دیگری',
            'channel' => 'web',
            'shift_date' => '2026-10-06',
            'starts_at' => '09:00:00',
            'ends_at' => '17:00:00',
        ]);

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/observer/shift-schedules')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'شیفت من');
    }

    private function openConversation(User $student, ?User $support = null): Conversation
    {
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support?->id,
            'title' => 'گفتگوی تست',
        ]);

        $conversation->messages()->create([
            'sender_id' => $student->id,
            'actor_id' => $student->id,
            'actor_role' => ActorRole::Student->value,
            'type' => 'text',
            'body' => 'سلام',
        ]);

        return $conversation;
    }

    public function test_admin_can_assign_and_unassign_a_support_to_an_observer(): void
    {
        $admin = $this->makeAdmin();
        $observer = $this->makeAccountObserver();
        $support = $this->makeSupport();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/observer-assignment", ['observer_id' => $observer->id])
            ->assertOk();
        $this->assertSame($observer->id, $support->fresh()->observer_id);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/observer-assignment", ['observer_id' => null])
            ->assertOk();
        $this->assertNull($support->fresh()->observer_id);
    }

    public function test_admin_cannot_assign_a_support_to_an_observer_of_another_type(): void
    {
        $admin = $this->makeAdmin();
        $observer = $this->makeAccountObserver(['support_type' => 'ai']);
        $support = $this->makeSupport(['support_type' => 'web']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/observer-assignment", ['observer_id' => $observer->id])
            ->assertStatus(422);

        $this->assertNull($support->fresh()->observer_id);
    }

    public function test_support_cannot_assign_itself_to_an_observer(): void
    {
        $support = $this->makeSupport();
        $observer = $this->makeAccountObserver();

        $this->actingAs($support, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/observer-assignment", ['observer_id' => $observer->id])
            ->assertStatus(403);

        $this->assertNull($support->fresh()->observer_id);
    }

    public function test_impersonation_token_stops_working_after_the_assignment_is_revoked(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $support = $this->makeSupport(['observer_id' => $observer->id]);
        $conversation = $this->openConversation($student, $support);

        // همان نشستی که endpoint impersonation می‌سازد: نام توکن حامل شناسهٔ ناظر است.
        $token = $support->createToken('observer-impersonation:'.$observer->id, ['*'], now()->addHours(2))->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'پاسخ اول'])
            ->assertStatus(201)
            ->assertJsonPath('data.actor_name', $observer->name.' (به‌جای '.$support->name.')');

        $this->assertDatabaseHas('observer_access_logs', [
            'observer_id' => $observer->id,
            'conversation_id' => $conversation->id,
            'action' => 'reply_as_support:'.$support->id,
        ]);

        $support->forceFill(['observer_id' => null])->save();
        $this->assertNull($support->fresh()->observer_id);

        // در درخواست واقعی هر بار کاربر از نو خوانده می‌شود؛ در تست باید
        // guard را دور بیندازیم تا کش کاربر درخواست قبلی مزاحم نشود.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'پاسخ دوم'])
            ->assertStatus(403);
    }

    public function test_observer_cannot_read_another_observers_support_conversations(): void
    {
        $observer = $this->makeAccountObserver();
        $otherObserver = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $theirSupport = $this->makeSupport(['observer_id' => $otherObserver->id]);
        $conversation = $this->openConversation($student, $theirSupport);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(403);

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/students')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_observer_sees_unassigned_and_own_team_conversations(): void
    {
        $observer = $this->makeAccountObserver();
        $otherObserver = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $mine = $this->openConversation($student, $this->makeSupport(['observer_id' => $observer->id]));
        $unassigned = $this->openConversation($student);
        $this->openConversation($student, $this->makeSupport(['observer_id' => $otherObserver->id]));

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations');

        $response->assertOk()->assertJsonCount(2, 'data');
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($mine->id, $ids);
        $this->assertContains($unassigned->id, $ids);
    }

    public function test_observer_cannot_reach_the_admin_support_endpoints(): void
    {
        $observer = $this->makeAccountObserver();
        $support = $this->makeSupport();

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/admin/supports')
            ->assertStatus(403);

        $this->actingAs($observer, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/account-observer")
            ->assertStatus(403);

        $this->actingAs($observer, 'sanctum')
            ->putJson("/api/admin/supports/{$support->id}/observer-assignment", ['observer_id' => $observer->id])
            ->assertStatus(403);

        $this->assertSame('support', $support->fresh()->role);
        $this->assertNull($support->fresh()->observer_id);
    }

    public function test_admin_can_filter_the_support_list_by_observer(): void
    {
        $admin = $this->makeAdmin();
        $observer = $this->makeAccountObserver();
        $otherObserver = $this->makeAccountObserver();
        $mine = $this->makeSupport(['name' => 'پشتیبان من', 'observer_id' => $observer->id]);
        $this->makeSupport(['name' => 'پشتیبان آن‌ها', 'observer_id' => $otherObserver->id]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/supports?role=support&observer_id={$observer->id}");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }
}
