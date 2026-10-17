<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Shift;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\ActorRole;
use App\Support\ConversationStatus;
use App\Support\CourseType;
use App\Support\MessageType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * داده‌ی نمایشی برای تست دستیِ قابلیت‌های تازه.
 *
 * با `db:seed --class=DemoSeeder` اجرا می‌شود و روی هر کاربری که از قبل
 * هست اضافه می‌کند، پس اجرای دوباره‌اش امن است.
 *
 * مهم‌ترین چیزی که می‌سازد، گفتگوهایی است که عمداً در وضعیت‌های مختلفِ
 * «بی‌جوابی» هستند تا رفتارِ بستنِ خودکارِ ۱۲ ساعته بدون دستکاریِ زمان
 * قابل بررسی باشد.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $support = $this->support();
        $this->accountObserver();

        $student = $this->student(
            phone: '09121110001',
            name: 'شکیبا رزاقی',
            track: 'web',
        );
        $second = $this->student(
            phone: '09121110002',
            name: 'امیر حسین',
            track: 'ai',
        );

        // ۱) دقیقاً همان چیزی که باید خودکار بسته شود.
        $this->conversationWith(
            $student,
            $support,
            'جوابم رو ندادید و چت رو بستید',
            lastActor: 'support',
            lastAtHoursAgo: 13,
        );

        // ۲) یک ساعت کمتر — نباید بسته شود.
        $this->conversationWith(
            $student,
            $support,
            'ممنون از راهنماییتون',
            lastActor: 'support',
            lastAtHoursAgo: 11,
        );

        // ۳) دانشجو آخرین حرف را زده — نوبتِ پشتیبان است، نباید بسته شود.
        $this->conversationWith(
            $student,
            $support,
            'هنوز منتظر جواب شما هستم',
            lastActor: 'student',
            lastAtHoursAgo: 20,
        );

        // یک شیفتِ تمام‌شده تا گزارش‌ها خالی نباشند.
        Shift::query()->updateOrCreate(
            [
                'user_id' => $support->id,
                'start_time' => now()->subDays(2)->startOfDay(),
            ],
            [
                'status' => 'ended',
                'channel' => $support->support_type ?? 'web',
                'end_time' => now()->subDays(2)->endOfDay(),
            ],
        );
    }

    private function support(): User
    {
        return User::updateOrCreate(
            ['phone' => '09121110009'],
            [
                'name' => 'پشتیبان دمو',
                'password' => Hash::make('12345678'),
                'role' => 'support',
                'support_type' => 'web',
            ],
        );
    }

    private function accountObserver(): ?User
    {
        return User::updateOrCreate(
            ['phone' => '09121110010'],
            [
                'name' => 'ناظر اکانت دمو',
                'password' => Hash::make('12345678'),
                'role' => 'account_observer',
                'support_type' => 'web',
            ],
        );
    }

    private function student(string $phone, string $name, string $track): User
    {
        $student = User::updateOrCreate(
            ['phone' => $phone],
            [
                'name' => $name,
                'password' => Hash::make('12345678'),
                'role' => 'student',
            ],
        );

        StudentProfile::updateOrCreate(
            ['user_id' => $student->id],
            [
                'course' => CourseType::InPerson->value,
                'track' => $track,
                'total_chats' => 30,
                'used_chats' => 2,
                'membership_date' => now()->subMonth(),
            ],
        );

        return $student;
    }

    /**
     * گفتگویی می‌سازد که آخرین پیامش از نقشِ خواسته‌شده و به اندازه‌ی دلخواه
     * در گذشته است.
     */
    private function conversationWith(
        User $student,
        User $support,
        string $lastBody,
        string $lastActor,
        int $lastAtHoursAgo,
    ): Conversation {
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
            'title' => 'گفتگوی دمو',
            'status' => ConversationStatus::Open->value,
        ]);

        $openingAt = now()->subHours($lastAtHoursAgo + 2);

        $this->message(
            $conversation,
            ActorRole::Student,
            $student->id,
            'سلام، یک سوال دارم.',
            $openingAt,
        );

        $this->message(
            $conversation,
            ActorRole::Support,
            $support->id,
            'سلام، بفرمایید.',
            $openingAt->copy()->addHour(),
        );

        $lastAt = now()->subHours($lastAtHoursAgo);
        $this->message(
            $conversation,
            $lastActor === 'student' ? ActorRole::Student : ActorRole::Support,
            $lastActor === 'student' ? $student->id : $support->id,
            $lastBody,
            $lastAt,
        );

        // `last_message_at` همان چیزی است که بستن خودکار بر اساسش تصمیم
        // می‌گیرد، پس باید دستی هم‌تراز شود.
        $conversation->newQuery()->whereKey($conversation->id)->update([
            'last_message_at' => $lastAt,
            'last_message_preview' => $lastBody,
        ]);

        return $conversation;
    }

    private function message(
        Conversation $conversation,
        ActorRole $role,
        int $actorId,
        string $body,
        Carbon $at,
    ): Message {
        return Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $actorId,
            'actor_id' => $actorId,
            'actor_role' => $role->value,
            'type' => MessageType::Text->value,
            'body' => $body,
            'created_at' => $at,
        ]);
    }
}
