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
        // Admin
        User::create([
            'name' => 'فرزان اسلامی',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Support users (with different support_type)
        User::create([
            'name' => 'سارا محمدی',
            'email' => 'sara@example.com',
            'password' => Hash::make('password'),
            'role' => 'support',
            'support_type' => 'web',
        ]);

        User::create([
            'name' => 'محمد علیاری',
            'email' => 'mohammad@example.com',
            'password' => Hash::make('password'),
            'role' => 'support',
            'support_type' => 'ai',
        ]);

        // Student users
        User::create([
            'name' => 'احمد رضایی',
            'email' => 'ahmad@example.com',
            'password' => Hash::make('password'),
            'role' => 'student',
        ]);

        User::create([
            'name' => 'فاطمه حسینی',
            'email' => 'fatemeh@example.com',
            'password' => Hash::make('password'),
            'role' => 'student',
        ]);

        // Observer user
        User::create([
            'name' => 'ناظر سیستم',
            'email' => 'observer@example.com',
            'password' => Hash::make('password'),
            'role' => 'observer',
        ]);
    }
}