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
        // ورود فقط با شماره موبایل است؛ شماره کلید تطبیق سیدر (idempotent) است.
        $users = [
            [
                'name' => 'فرزان اسلامی',
                'phone' => '09120000001',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'سارا محمدی',
                'phone' => '09120000002',
                'password' => Hash::make('password'),
                'role' => 'support',
                'support_type' => 'web',
            ],
            [
                'name' => 'محمد علیاری',
                'phone' => '09120000003',
                'password' => Hash::make('password'),
                'role' => 'support',
                'support_type' => 'ai',
            ],
            [
                'name' => 'احمد رضایی',
                'phone' => '09120000004',
                'password' => Hash::make('password'),
                'role' => 'student',
            ],
            [
                'name' => 'فاطمه حسینی',
                'phone' => '09120000005',
                'password' => Hash::make('password'),
                'role' => 'student',
            ],
            [
                'name' => 'ناظر سیستم',
                'phone' => '09120000006',
                'password' => Hash::make('password'),
                'role' => 'observer',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['phone' => $user['phone']],
                $user,
            );
        }
    }
}
