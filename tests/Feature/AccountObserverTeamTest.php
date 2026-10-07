<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\ShiftSchedule;
use App\Models\ShiftScheduleAssignment;
use App\Models\User;
use App\Support\ActorRole;
use Tests\TestCase;

/**
 * ناظر اکانت دو نقش دارد که عمداً از هم جدا شده‌اند:
 *
 *  1. در صفحه‌ی گفتگوی خودش (`/inbox`) کاملاً مثل یک پشتیبان رفتار می‌کند؛
 *  2. در «نظارت بر روی تیم» می‌تواند آمار اعضا را ببیند و به حساب یکی از
 *     آن‌ها وارد شود. داخل حساب، دامنه‌ی دید به `owner_id` محدود می‌شود و
 *     پیام‌ها دقیقاً به نام همان پشتیبان ثبت می‌شوند.
 *
 * اتصال تیم‌ها بر پایه‌ی نوع پاسخگویی است: همه پشتیبان‌های هم‌نوع ناظر،
 * بدون انتساب دستی.
 */
class AccountObserverTeamTest extends TestCase
{
    public function test_managed_supports_lists_the_whole_team_of_the_same_type(): void
    {
        $observer = $this->makeAccountObserver();
        $first = $this->makeSupport(['name' => 'پشتیبان وب ۱']);
        $second = $this->makeSupport(['name' => 'پشتیبان وب ۲']);
        $third = $this->makeSupport(['name' => 'پشتیبان وب ۳']);
        $this->makeSupport(['name' => 'پشتیبان ai', 'support_type' => 'ai']);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/managed-supports');

        // سه پشتیبان وب به‌علاوه‌ی خودِ ناظر؛ پشتیبان هوش مصنوعی عضو این تیم نیست.
        $response->assertOk()
            ->assertJsonCount(4, 'data');
        $names = array_column($response->json('data'), 'name');
        $this->assertContains($first->name, $names);
        $this->assertContains($second->name, $names);
        $this->assertContains($third->name, $names);
        $this->assertContains($observer->name, $names);
        $this->assertNotContains('پشتیبان ai', $names);
    }

    public function test_observer_can_impersonate_any_same_type_support_but_not_other_type(): void
    {
        $observer = $this->makeAccountObserver();
        $web = $this->makeSupport(['name' => 'پشتیبان وب']);
        $ai = $this->makeSupport(['support_type' => 'ai']);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$ai->id}/impersonate")
            ->assertStatus(403);

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$web->id}/impersonate");

        $response->assertOk()
            ->assertJsonPath('user.id', $web->id)
            ->assertJsonPath('user.role', 'support');

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('observer_access_logs', [
            'observer_id' => $observer->id,
            'action' => 'impersonate_support:'.$web->id,
        ]);
    }

    public function test_impersonation_leaves_the_support_account_untouched(): void
    {
        $observer = $this->makeAccountObserver();
        $support = $this->makeSupport(['name' => 'پشتیبان وب']);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/managed-supports/{$support->id}/impersonate")
            ->assertOk();

        $this->assertSame('support', $support->fresh()->role);
        $this->assertSame('web', $support->fresh()->support_type);
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

    public function test_team_supervision_lists_same_type_supports_with_their_counts(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $member = $this->makeSupport(['name' => 'پشتیبان تیم']);
        $other = $this->makeSupport(['name' => 'پشتیبان دیگر']);
        $this->makeSupport(['name' => 'پشتیبان ai', 'support_type' => 'ai']);

        $unread = $this->openConversation($student, $member);
        $unread->update(['unread_support_count' => 4]);
        $this->openConversation($student, $member);
        $this->openConversation($student, $other);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/observer/team-supervision');

        $response->assertOk()
            ->assertJsonPath('support_type', 'web')
            ->assertJsonCount(2, 'data')
            // خودِ ناظر جزو اعضای قابل نظارت نیست.
            ->assertJsonMissing(['id' => $observer->id])
            // متن گفتگو هرگز در نمای نظارت برنمی‌گردد.
            ->assertJsonMissingPath('data.0.messages');

        $rows = collect($response->json('data'))->keyBy('id');
        $this->assertSame(2, $rows[$member->id]['conversations_count']);
        $this->assertSame(1, $rows[$member->id]['unread_conversations_count']);
        $this->assertSame(1, $rows[$other->id]['conversations_count']);
        $this->assertSame(0, $rows[$other->id]['unread_conversations_count']);
        $this->assertFalse($rows[$other->id]['on_shift']);
    }

    public function test_team_supervision_is_denied_to_other_roles(): void
    {
        $support = $this->makeSupport();
        $admin = $this->makeAdmin();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/observer/team-supervision')
            ->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/observer/team-supervision')
            ->assertStatus(403);
    }

    public function test_observer_can_take_a_shift_for_himself(): void
    {
        $observer = $this->makeAccountObserver();

        // ناظر خودش هم عضو تیم است، پس باید در فهرست اعضا باشد و بتوان به او
        // هم شیفت داد.
        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/managed-supports')
            ->assertOk()
            ->assertJsonFragment(['id' => $observer->id, 'name' => $observer->name]);

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت ناظر',
                'channel' => 'web',
                'shift_date' => '2026-10-06',
                'starts_at' => '09:00',
                'ends_at' => '17:00',
                'support_ids' => [$observer->id],
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('shift_schedule_assignments', [
            'user_id' => $observer->id,
            'starts_at' => '09:00:00',
        ]);
    }

    public function test_rotation_preview_cycles_every_member_across_different_slots(): void
    {
        $observer = $this->makeAccountObserver();
        $second = $this->makeAccountObserver();
        $first = $this->makeSupport();
        $third = $this->makeSupport();

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation/preview', [
                'name' => 'چرخش ماهانه',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 4,
                'slots' => [
                    ['starts_at' => '09:00', 'ends_at' => '13:00'],
                    ['starts_at' => '13:00', 'ends_at' => '17:00'],
                    ['starts_at' => '17:00', 'ends_at' => '21:00'],
                    ['starts_at' => '21:00', 'ends_at' => '23:00'],
                ],
            ]);

        $response->assertOk()
            ->assertJsonCount(4, 'team')
            ->assertJsonCount(16, 'rows');

        $rows = $response->json('rows');

        // هر عضو در هر هفته دقیقاً یک بازه می‌گیرد...
        $perWeek = collect($rows)->groupBy('week');
        $this->assertCount(4, $perWeek);
        foreach ($perWeek as $weekRows) {
            $ids = $weekRows->pluck('support_id')->sort()->values()->all();
            $this->assertCount(4, $ids);
            $this->assertSame($ids, array_unique($ids), 'یک عضو نباید دو بار در یک هفته بیفتد.');
        }

        // ...و در طول ماه هر عضو تمام بازه‌ها را یک‌بار می‌گیرد.
        $slotsPerMember = collect($rows)
            ->groupBy('support_id')
            ->map(fn ($memberRows) => $memberRows->pluck('starts_at')->unique()->count());
        $this->assertSame([4, 4, 4, 4], $slotsPerMember->values()->all());

        // تیم شامل هر دو ناظر و هر دو پشتیبان است.
        $this->assertEqualsCanonicalizing(
            [$observer->id, $second->id, $first->id, $third->id],
            collect($response->json('team'))->pluck('id')->all(),
        );

        // پیش‌نمایش چیزی در دیتابیس ثبت نمی‌کند.
        $this->assertSame(0, ShiftSchedule::query()->count());
    }

    public function test_rotation_store_creates_a_schedule_per_week_and_slot(): void
    {
        $observer = $this->makeAccountObserver();
        $this->makeSupport();
        $this->makeSupport();

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation', [
                'name' => 'چرخش ماهانه',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 4,
                'slots' => [
                    ['starts_at' => '09:00', 'ends_at' => '13:00'],
                    ['starts_at' => '13:00', 'ends_at' => '17:00'],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('created', 8)
            ->assertJsonPath('skipped', 0);

        $this->assertSame(8, ShiftSchedule::query()->count());
        $this->assertSame(8, ShiftScheduleAssignment::query()->count());
        // چهار هفته، هر کدام یک روز.
        $this->assertSame(4, ShiftSchedule::query()->distinct()->count('shift_date'));
        $this->assertSame(
            $observer->id,
            ShiftSchedule::query()->first()->created_by,
        );
    }

    public function test_rotation_skips_slots_that_conflict_with_an_existing_assignment(): void
    {
        $observer = $this->makeAccountObserver();
        $this->makeSupport();

        // خودِ ناظر در همان روز و بازه‌ی هم‌پوشان یک شیفت دستی دارد.
        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت دستی',
                'channel' => 'web',
                'shift_date' => '2026-10-05',
                'starts_at' => '10:00',
                'ends_at' => '12:00',
                'support_ids' => [$observer->id],
            ])
            ->assertStatus(201);

        $response = $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation', [
                'name' => 'چرخش ماهانه',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 2,
                'slots' => [
                    ['starts_at' => '09:00', 'ends_at' => '12:00'],
                    ['starts_at' => '13:00', 'ends_at' => '17:00'],
                ],
            ]);

        // بازه‌ی ۰۹ تا ۱۲ هفته‌ی اول برای ناظر تداخل دارد و ساخته نمی‌شود.
        $response->assertStatus(201);
        $this->assertSame(1, $response->json('skipped'));
        $this->assertSame(3, $response->json('created'));

        // یک شیفت دستی + سه ردیف بی‌تداخل چرخش.
        $this->assertSame(4, ShiftSchedule::query()->count());
    }

    public function test_rotation_rejects_overlapping_or_invalid_slots(): void
    {
        $observer = $this->makeAccountObserver();
        $this->makeSupport();

        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation/preview', [
                'name' => 'چرخش',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 4,
                'slots' => [
                    ['starts_at' => '09:00', 'ends_at' => '13:00'],
                    ['starts_at' => '12:00', 'ends_at' => '17:00'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slots');

        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation/preview', [
                'name' => 'چرخش',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 4,
                'slots' => [['starts_at' => '13:00', 'ends_at' => '09:00']],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slots');
    }

    public function test_rotation_is_denied_to_a_plain_support(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/observer/shift-schedules/rotation/preview', [
                'name' => 'چرخش',
                'channel' => 'web',
                'starts_on' => '2026-10-05',
                'weeks' => 4,
                'slots' => [['starts_at' => '09:00', 'ends_at' => '13:00']],
            ])
            ->assertStatus(403);
    }

    public function test_shift_schedule_splits_minutes_between_same_type_supports(): void
    {
        $observer = $this->makeAccountObserver();
        $first = $this->makeSupport();
        $second = $this->makeSupport();

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

    public function test_shift_schedule_rejects_other_type_supports(): void
    {
        $observer = $this->makeAccountObserver();
        $sameType = $this->makeSupport();
        $otherType = $this->makeSupport(['support_type' => 'ai']);

        $this->actingAs($observer, 'sanctum')
            ->postJson('/api/observer/shift-schedules', [
                'name' => 'شیفت صبح',
                'channel' => 'web',
                'shift_date' => '2026-10-06',
                'starts_at' => '09:00',
                'ends_at' => '17:00',
                'support_ids' => [$sameType->id, $otherType->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('support_ids');

        $this->assertSame(0, ShiftSchedule::query()->count());
    }

    public function test_shift_schedule_rejects_more_supports_than_shift_minutes(): void
    {
        $observer = $this->makeAccountObserver();
        $first = $this->makeSupport();
        $second = $this->makeSupport();

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

    public function test_observer_inbox_behaves_like_a_support_and_counts_every_unread(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $mine = $this->openConversation($student, $this->makeSupport());
        $unassigned = $this->openConversation($student);
        $otherType = $this->openConversation($student, $this->makeSupport(['support_type' => 'ai']));

        $mine->update(['unread_support_count' => 2]);
        $unassigned->update(['unread_support_count' => 3]);
        $otherType->update(['unread_support_count' => 5]);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/notifications');

        // مثل هر پشتیبان دیگر، شمارنده روی همه‌ی گفتگوها حساب می‌شود.
        $response->assertStatus(200)
            ->assertJsonPath('unread_total', 10)
            ->assertJsonPath('unread_conversations', 3);
    }

    public function test_opening_a_conversation_clears_the_unread_counter_for_an_account_observer(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = $this->openConversation($student, $support);
        $conversation->update(['unread_support_count' => 3]);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200);

        $fresh = $conversation->fresh();
        $this->assertSame(0, $fresh->unread_support_count);
        // باز کردن گفتگو نباید مالکیتش را از پشتیبانِ مسئول بگیرد.
        $this->assertSame($support->id, $fresh->support_id);
    }

    public function test_observer_replies_as_themselves_without_naming_a_support(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);
        $conversation->update(['unread_support_count' => 2]);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'سلام'])
            ->assertStatus(201)
            ->assertJsonPath('data.actor_name', $observer->name);

        // مثل هر پشتیبان، پاسخِ خودِ ناظر مالکیت گفتگوی بدون پشتیبان را
        // تصاحب نمی‌کند؛ شمارنده هم با باز کردن گفتگو صفر می‌شود نه با ارسال.
        $this->assertNull($conversation->fresh()->support_id);
    }

    public function test_impersonation_token_replies_in_the_exact_place_of_the_support(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $support = $this->makeSupport(['name' => 'پشتیبان تیم']);
        $conversation = $this->openConversation($student);

        // همان نشستی که endpoint impersonation می‌سازد: نام توکن حامل شناسهٔ ناظر است.
        $token = $support->createToken('observer-impersonation:'.$observer->id, ['*'], now()->addHours(2))->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'پاسخ اول'])
            ->assertStatus(201)
            ->assertJsonPath('data.actor_name', $observer->name.' (به‌جای '.$support->name.')');

        // گفتگو دقیقاً به نام همان پشتیبان ثبت و مالکیتش به او منتقل می‌شود.
        $this->assertSame($support->id, $conversation->fresh()->support_id);

        $this->assertDatabaseHas('observer_access_logs', [
            'observer_id' => $observer->id,
            'conversation_id' => $conversation->id,
            'action' => 'reply_as_support:'.$support->id,
        ]);
    }

    public function test_owner_scope_hides_other_supports_conversations_from_the_observer(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $member = $this->makeSupport();
        $theirs = $this->openConversation($student, $this->makeSupport());
        $mine = $this->openConversation($student, $member);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations?owner_id={$member->id}");

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($mine->id, $response->json('data.0.id'));
        $this->assertNotSame($theirs->id, $response->json('data.0.id'));

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$mine->id}?owner_id={$member->id}")
            ->assertOk();

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$theirs->id}?owner_id={$member->id}")
            ->assertStatus(403);
    }

    public function test_observer_cannot_use_owner_scope_of_another_type_support(): void
    {
        $observer = $this->makeAccountObserver();
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations?owner_id={$aiSupport->id}")
            ->assertStatus(403);

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/notifications?owner_id='.$aiSupport->id)
            ->assertStatus(403);
    }

    public function test_impersonation_token_stops_working_when_the_support_type_no_longer_matches(): void
    {
        $observer = $this->makeAccountObserver();
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = $this->openConversation($student, $support);

        $token = $support->createToken('observer-impersonation:'.$observer->id, ['*'], now()->addHours(2))->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'پاسخ اول'])
            ->assertStatus(201);

        // با تغییر نوع پشتیبان، دیگر در تیمِ همین ناظر نیست و توکن باید در
        // هر درخواست از نو رد شود.
        $support->forceFill(['support_type' => 'ai'])->save();
        $this->assertSame('ai', $support->fresh()->support_type);

        // در درخواست واقعی هر بار کاربر از نو خوانده می‌شود؛ در تست باید
        // guard را دور بیندازیم تا کش کاربر درخواست قبلی مزاحم نشود.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'پاسخ دوم'])
            ->assertStatus(403);
    }

    public function test_opening_a_conversation_does_not_clear_the_unread_counter_for_a_read_only_observer(): void
    {
        $observer = $this->makeObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);
        $conversation->update(['unread_support_count' => 3]);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200);

        $this->assertSame(3, $conversation->fresh()->unread_support_count);
        $this->assertNull($conversation->fresh()->support_id);
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

        $this->assertSame('support', $support->fresh()->role);
    }

    public function test_admin_can_filter_the_support_list_by_type(): void
    {
        $admin = $this->makeAdmin();
        $this->makeSupport(['name' => 'پشتیبان وب ۱']);
        $this->makeSupport(['name' => 'پشتیبان وب ۲']);
        $this->makeSupport(['name' => 'پشتیبان ai', 'support_type' => 'ai']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/supports?role=support&support_type=web');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
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
}
