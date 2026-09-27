<?php

namespace Tests;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

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

    protected function makeStudent(array $attributes = [], array $profileAttributes = []): User
    {
        $student = User::create(array_merge([
            'name' => 'دانشجو تست',
            'email' => uniqid('student_').'@example.com',
            'password' => Hash::make('secret1234'),
            'role' => 'student',
        ], $attributes));

        StudentProfile::create(array_merge([
            'user_id' => $student->id,
            'course' => 'in_person',
            'total_chats' => 30,
            'used_chats' => 0,
            'membership_date' => now(),
        ], $profileAttributes));

        return $student;
    }
}
