<?php

namespace Tests\Feature;

use App\Models\MentorFeedback;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    public function test_mentor_issues_count_open_mentor_feedbacks(): void
    {
        $support = $this->makeSupport();

        foreach ([['منتور اول', 'پاسخ نمی‌دهد'], ['منتور دوم', 'کیفیت پایین']] as [$mentor, $description]) {
            MentorFeedback::create([
                'student_user_id' => $this->makeStudent()->id,
                'mentor_name' => $mentor,
                'description' => $description,
                'status' => 'open',
            ]);
        }

        MentorFeedback::create([
            'student_user_id' => $this->makeStudent()->id,
            'mentor_name' => 'منتور سوم',
            'description' => 'حل شده بود',
            'status' => 'resolved',
        ]);

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertStatus(200)
            ->assertJsonPath('data.mentorIssues', 2);
    }
}
