<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use App\Support\CourseType;
use App\Support\IranianPhone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * کاربران پایه برای محیط تازه‌ساخت‌شده.
 *
 * شماره‌ها از `IranianPhone::normalize()` عبور می‌کنند چون قالبِ ذخیره‌شده در
 * سامانه `98xxxxxxxxx` است و ثبت‌نام هم همین قالب را ذخیره می‌کند. اگر سیدر
 * عدد را به شکل `09xxxxxxxxx` بنویسد، ورود دانشجو (که ورودی را نرمال
 * می‌کند) هیچ‌وقت آن کاربر را پیدا نمی‌کند.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // سوپر ادمین
            [
                'name' => 'فرزان اسلامی',
                'phone' => '09120000001',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            // ناظر پشتیبان (observer)
            [
                'name' => 'ناظر پشتیبان',
                'phone' => '09300778494',
                'password' => Hash::make('12345678'),
                'role' => 'observer',
            ],
            // ناظر اکانت — تنها نقشی که هم شیفت می‌دهد هم ناظرِ تیم است
            [
                'name' => 'ناظر اکانت',
                'phone' => '09300778495',
                'password' => Hash::make('12345678'),
                'role' => 'account_observer',
                'support_type' => 'web',
            ],
            // پشتیبان عادی (support)
            [
                'name' => 'پشتیبان عادی',
                'phone' => '09307605480',
                'password' => Hash::make('12345678'),
                'role' => 'support',
                'support_type' => 'web',
            ],
            // کاربر عادی (student)
            [
                'name' => 'کاربر عادی',
                'phone' => '09123456789',
                'password' => Hash::make('12345678'),
                'role' => 'student',
            ],
        ];

        foreach ($users as $user) {
            // ایمیل از جدول حذف شده، پس تطبیق همیشه با شماره است.
            $user['phone'] = IranianPhone::normalize($user['phone']) ?? $user['phone'];

            $created = User::updateOrCreate(['phone' => $user['phone']], $user);

            // دانشجو بدون پروفایل سهمیه‌ی چت ندارد و نمی‌تواند گفتگو بسازد.
            if ($created->role === 'student') {
                StudentProfile::updateOrCreate(
                    ['user_id' => $created->id],
                    [
                        'course' => CourseType::InPerson->value,
                        'track' => 'web',
                        'total_chats' => 30,
                        'used_chats' => 0,
                        'membership_date' => now()->subMonth(),
                    ],
                );
            }
        }
    }
}
