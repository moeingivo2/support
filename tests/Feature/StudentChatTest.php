<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentChatTest extends TestCase
{
    public function test_users_table_accepts_every_application_role(): void
    {
        // روی Postgres و MySQL ستون role قید دارد؛ این تست تضمین می‌کند هر سه
        // نقش برنامه روی هر درایور پذیرفته می‌شوند.
        foreach (['admin', 'support', 'student'] as $role) {
            $user = User::create([
                'name' => 'کاربر '.$role,
                'email' => $role.'-role@example.com',
                'password' => 'secret1234',
                'role' => $role,
            ]);

            $this->assertSame($role, $user->fresh()->role);
        }
    }

    public function test_student_registers_with_offline_course_track_and_sessions(): void
    {
        $response = $this->postJson('/api/register/student', [
            'first_name' => 'زهرا',
            'last_name' => 'کریمی',
            'email' => 'zahra@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'course' => 'offline',
            'track' => 'ai',
            'sessions' => [3, 1, 2],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('profile.course', 'offline')
            ->assertJsonPath('profile.track', 'ai')
            ->assertJsonPath('profile.purchased_sessions', [1, 2, 3])
            ->assertJsonPath('profile.remaining_chats', 50)
            ->assertJsonPath('profile.remaining_percentage', 100);

        $this->assertDatabaseHas('users', ['email' => 'zahra@example.com', 'role' => 'student']);
    }

    public function test_offline_registration_requires_track_and_at_least_one_session(): void
    {
        $this->postJson('/api/register/student', [
            'first_name' => 'زهرا',
            'last_name' => 'کریمی',
            'email' => 'zahra2@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'course' => 'offline',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['track', 'sessions']);

        $this->postJson('/api/register/student', [
            'first_name' => 'زهرا',
            'last_name' => 'کریمی',
            'email' => 'zahra3@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'course' => 'offline',
            'track' => 'web',
            'sessions' => [],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['sessions']);
    }

    public function test_in_person_registration_rejects_track_and_sessions(): void
    {
        $this->postJson('/api/register/student', [
            'first_name' => 'سارا',
            'last_name' => 'احمدی',
            'email' => 'sara@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'course' => 'in_person',
            'track' => 'web',
            'sessions' => [1],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['track', 'sessions']);
    }

    /**
     * کلاینت برای دوره‌های غیرآفلاین آرایه خالی می‌فرستد؛ filled() برای آرایه
     * خالی هم true است، پس نباید به‌عنوان انتخاب جلسات خطا بدهد.
     */
    public function test_school_and_in_person_registration_accepts_empty_sessions_array(): void
    {
        foreach (['school', 'in_person'] as $course) {
            $response = $this->postJson('/api/register/student', [
                'first_name' => 'سارا',
                'last_name' => 'احمدی',
                'email' => $course.'-empty@example.com',
                'password' => 'secret1234',
                'password_confirmation' => 'secret1234',
                'course' => $course,
                'track' => null,
                'sessions' => [],
            ]);

            $response->assertStatus(201)
                ->assertJsonPath('user.role', 'student')
                ->assertJsonPath('profile.course', $course)
                ->assertJsonPath('profile.track', null)
                ->assertJsonPath('profile.purchased_sessions', []);
        }
    }

    public function test_non_offline_registration_also_works_without_track_or_sessions_keys(): void
    {
        $this->postJson('/api/register/student', [
            'first_name' => 'سارا',
            'last_name' => 'احمدی',
            'email' => 'school-bare@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'course' => 'school',
        ])->assertStatus(201)
            ->assertJsonPath('profile.course', 'school');
    }

    public function test_student_can_start_conversation_and_send_text_message(): void
    {
        $student = $this->makeStudent();

        $conversation = $this->actingAs($student, 'sanctum')
            ->postJson('/api/conversations')
            ->assertStatus(201)
            ->json('data.id');

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation}/messages", ['body' => 'سلام، سوال دارم'])
            ->assertStatus(201)
            ->assertJsonPath('data.type', 'text')
            ->assertJsonPath('data.body', 'سلام، سوال دارم')
            ->assertJsonPath('profile.used_chats', 1)
            ->assertJsonPath('profile.remaining_chats', 29);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation,
            'type' => 'text',
            'body' => 'سلام، سوال دارم',
        ]);
        $this->assertSame(1, Conversation::find($conversation)->unread_support_count);
    }

    public function test_code_mode_wraps_the_student_message_as_a_code_block(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'print("hello")',
                'code_mode' => true,
                'language' => 'python',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.type', 'code')
            ->assertJsonPath('data.language', 'python');
    }

    public function test_student_can_send_an_image_attachment(): void
    {
        Storage::fake('public');
        $student = $this->makeStudent();
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($student, 'sanctum')
            ->post("/api/conversations/{$conversation->id}/messages", [
                'attachment' => UploadedFile::fake()->create('screen.png', 24, 'image/png'),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.type', 'image');

        $message = Message::where('conversation_id', $conversation->id)->firstOrFail();
        Storage::disk('public')->assertExists($message->attachment_path);
    }

    public function test_dangerous_attachment_is_rejected(): void
    {
        Storage::fake('public');
        $student = $this->makeStudent();
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($student, 'sanctum')
            ->post("/api/conversations/{$conversation->id}/messages", [
                'attachment' => UploadedFile::fake()->createWithContent('shell.php', '<?php echo 1;'),
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_student_cannot_send_when_the_chat_quota_is_exhausted(): void
    {
        $student = $this->makeStudent([], ['total_chats' => 2, 'used_chats' => 2]);
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'یک پیام دیگر'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'سهمیه چت شما تمام شده است. برای ادامه گفتگو درخواست ارتقا ثبت کنید.');

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_student_cannot_read_another_students_conversation(): void
    {
        $owner = $this->makeStudent();
        $intruder = $this->makeStudent();
        $conversation = Conversation::create(['student_id' => $owner->id]);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/conversations/{$conversation->id}")
            ->assertStatus(404);
    }

    public function test_profile_reports_remaining_percentage_and_low_chat_flag(): void
    {
        $student = $this->makeStudent([], ['total_chats' => 20, 'used_chats' => 15]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/profile')
            ->assertStatus(200)
            ->assertJsonPath('data.remaining_chats', 5)
            ->assertJsonPath('data.remaining_percentage', 25)
            ->assertJsonPath('data.is_low_on_chats', true)
            ->assertJsonPath('data.low_remaining_threshold', 10);
    }

    public function test_student_can_submit_a_single_pending_upgrade_request(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/upgrade', [
                'course' => 'offline',
                'track' => 'web',
                'sessions' => [1, 2],
                'extra_chats' => 20,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('student_upgrade_requests', [
            'student_id' => $student->id,
            'course' => 'offline',
            'track' => 'web',
            'extra_chats' => 20,
            'status' => 'pending',
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/upgrade', ['course' => 'school', 'extra_chats' => 10])
            ->assertStatus(422);
    }

    public function test_upgrade_request_for_offline_requires_track_and_sessions(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/student/upgrade', [
                'course' => 'offline',
                'extra_chats' => 10,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['track', 'sessions']);

        $this->assertDatabaseCount('student_upgrade_requests', 0);
    }

    public function test_support_endpoints_are_forbidden_for_students(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/support/conversations')
            ->assertStatus(403);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(403);
    }

    public function test_support_inbox_is_shared_between_agents_and_marks_messages_read(): void
    {
        $student = $this->makeStudent();
        $firstAgent = $this->makeSupport(['name' => 'پشتیبان اول']);
        $secondAgent = $this->makeSupport(['name' => 'پشتیبان دوم']);

        $conversation = Conversation::create(['student_id' => $student->id, 'title' => 'مشکل نصب']);
        $conversation->messages()->create([
            'sender_id' => $student->id,
            'type' => 'text',
            'body' => 'سلام',
        ]);
        $conversation->update(['unread_support_count' => 1]);

        $inbox = $this->actingAs($firstAgent, 'sanctum')
            ->getJson('/api/support/conversations')
            ->assertStatus(200)
            ->assertJsonPath('unread_total', 1)
            ->assertJsonPath('data.0.student.name', 'دانشجو تست');

        $this->actingAs($secondAgent, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.conversation.unread_count', 0)
            ->assertJsonPath('data.profile.remaining_chats', 30)
            ->assertJsonPath('data.messages.0.body', 'سلام');

        $this->assertSame(0, $conversation->fresh()->unread_support_count);
        $this->assertSame($secondAgent->id, $conversation->fresh()->support_id);
    }

    public function test_support_reply_increments_student_unread_counter(): void
    {
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = Conversation::create(['student_id' => $student->id, 'support_id' => $support->id]);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", [
                'body' => 'سلام، چطور می‌تونم کمکتون کنم؟',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.sender.name', 'پشتیبان تست');

        $this->assertSame(1, $conversation->fresh()->unread_student_count);
    }

    public function test_replying_assigns_an_unassigned_conversation_to_the_responding_agent(): void
    {
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = Conversation::create(['student_id' => $student->id]);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'در خدمتم'])
            ->assertStatus(201);

        $this->assertSame($support->id, $conversation->fresh()->support_id);
    }

    public function test_notifications_endpoint_reports_unread_counts(): void
    {
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = Conversation::create(['student_id' => $student->id]);
        $conversation->messages()->create(['sender_id' => $student->id, 'type' => 'text', 'body' => 'سلام']);
        $conversation->update(['unread_support_count' => 2, 'last_message_preview' => 'سلام', 'last_message_at' => now()]);

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/support/conversations/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_total', 2)
            ->assertJsonPath('unread_conversations', 1)
            ->assertJsonPath('latest.conversation_id', $conversation->id)
            ->assertJsonPath('latest.student_name', 'دانشجو تست');
    }

    public function test_remaining_percentage_is_zero_when_quota_is_empty(): void
    {
        $profile = StudentProfile::create([
            'user_id' => User::factory()->create(['role' => 'student'])->id,
            'course' => 'school',
            'total_chats' => 0,
            'used_chats' => 0,
        ]);

        $this->assertSame(0, $profile->remainingPercentage());
        $this->assertSame(0, $profile->remainingChats());
    }
}
