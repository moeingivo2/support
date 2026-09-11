<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;

abstract class TestCase extends BaseTestCase
{
    protected function makeAdmin(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'مدیر تست',
            'email' => uniqid('admin_').'@example.com',
            'password' => Hash::make('secret1234'),
            'role' => 'admin',
        ], $attributes));
    }

    protected function makeSupport(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'پشتیبان تست',
            'phone' => '09'.random_int(100000000, 999999999),
            'password' => Hash::make('secret1234'),
            'role' => 'support',
            'support_type' => 'web',
        ], $attributes));
    }
}
