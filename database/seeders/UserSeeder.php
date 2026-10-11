<?php

// database/seeders/UserSeeder.php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // با updateOrCreate ایمیل، کلید تطبیق است و بقیه‌ی فیلدها به‌روز می‌شوند.
        // سیدر باید idempotent باشد؛ create() ساده با هر اجرای دوم روی
        // users_email_unique خطا می‌دهد و کاربران واقعی ثبت‌نام‌کرده را دست نمی‌زند.
        $users = [
            [
                'name' => 'فرزان اسلامی',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'سارا محمدی',
                'email' => 'sara@example.com',
                'password' => Hash::make('password'),
                'role' => 'support',
                'support_type' => 'web',
            ],
            [
                'name' => 'محمد علیاری',
                'email' => 'mohammad@example.com',
                'password' => Hash::make('password'),
                'role' => 'support',
                'support_type' => 'ai',
            ],
            [
                'name' => 'احمد رضایی',
                'email' => 'ahmad@example.com',
                'password' => Hash::make('password'),
                'role' => 'student',
            ],
            [
                'name' => 'فاطمه حسینی',
                'email' => 'fatemeh@example.com',
                'password' => Hash::make('password'),
                'role' => 'student',
            ],
            [
                'name' => 'ناظر سیستم',
                'email' => 'observer@example.com',
                'password' => Hash::make('password'),
                'role' => 'observer',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user,
            );
        }
    }
}
