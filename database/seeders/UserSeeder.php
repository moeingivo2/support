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
        User::create([
            'name' => 'محمدحسین میری‌پور',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'سارا محمدی',
            'email' => 'sara@example.com',
            'password' => Hash::make('password'),
            'role' => 'support',
        ]);

        User::create([
            'name' => 'محمد علیاری',
            'email' => 'mohammad@example.com',
            'password' => Hash::make('password'),
            'role' => 'support',
        ]);
    }
}
