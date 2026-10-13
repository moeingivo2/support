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
            // اگر ایمیل داریم با ایمیل جستجو می‌کنیم، وگرنه با تلفن
            $matchKey = $user['email'] ?? $user['phone'];
            $matchField = isset($user['email']) ? 'email' : 'phone';

            User::updateOrCreate(
                [$matchField => $matchKey],
                $user,
            );
        }
    }
}