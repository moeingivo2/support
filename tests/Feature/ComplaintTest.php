<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Mentor;
use App\Models\Student;
use App\Models\User;
use Tests\TestCase;

class ComplaintTest extends TestCase
{
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'student_name' => 'علی احمدی',
            'mentor_name' => 'رضا محمدی',
            'description' => 'دانشجو از پاسخ منتور ناراضی بود و مشکل حل نشد.',
            'priority' => 'high',
        ], $overrides);
    }

    public function test_support_can_create_complaint(): void
    {
        $support = $this->makeSupport();

        $response = $this->actingAs($support, 'sanctum')
            ->postJson('/api/complaints', $this->validPayload());

        $response->assertStatus(201);
        $this->assertDatabaseHas('complaints', [
            'support_id' => $support->id,
            'priority' => 'high',
            'status' => 'open',
        ]);
    }

    public function test_student_is_reused_not_duplicated_by_code(): void
    {
        $support = $this->makeSupport();
        $student = Student::create([
            'name' => 'دانشجوی موجود',
            'student_code' => 'SC-100',
        ]);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/complaints', $this->validPayload([
                'student_name' => 'دانشجوی موجود',
                'student_code' => 'SC-100',
            ]))->assertStatus(201);

        $this->assertSame(1, Student::where('student_code', 'SC-100')->count());
    }

    public function test_mentor_is_reused_not_duplicated_by_name(): void
    {
        $support = $this->makeSupport();
        Mentor::create(['name' => 'منتور تکراری']);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/complaints', $this->validPayload([
                'mentor_name' => 'منتور تکراری',
            ]))->assertStatus(201);

        $this->assertSame(1, Mentor::where('name', 'منتور تکراری')->count());
    }

    public function test_short_description_is_rejected(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/complaints', $this->validPayload([
                'description' => 'کوتاه',
            ]))->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    public function test_support_index_shows_only_own_complaints(): void
    {
        $owner = $this->makeSupport();
        $other = $this->makeSupport();
        $student = Student::create(['name' => 'دانشجو']);
        $mentor = Mentor::create(['name' => 'منتور']);

        Complaint::create([
            'student_id' => $student->id, 'mentor_id' => $mentor->id,
            'support_id' => $owner->id, 'description' => 'مورد اول پشتیبان',
            'priority' => 'low',
        ]);
        Complaint::create([
            'student_id' => $student->id, 'mentor_id' => $mentor->id,
            'support_id' => $other->id, 'description' => 'مورد پشتیبان دیگر',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($owner, 'sanctum')->getJson('/api/complaints');

        $response->assertStatus(200);
        $this->assertSame(1, $response->json('total'));
    }

    public function test_admin_index_shows_all_and_filters_by_support(): void
    {
        $admin = $this->makeAdmin();
        $first = $this->makeSupport();
        $second = $this->makeSupport();
        $student = Student::create(['name' => 'دانشجو']);
        $mentor = Mentor::create(['name' => 'منتور']);

        foreach ([$first, $second] as $support) {
            Complaint::create([
                'student_id' => $student->id, 'mentor_id' => $mentor->id,
                'support_id' => $support->id, 'description' => 'شرح تست نارضایتی',
                'priority' => 'normal',
            ]);
        }

        $all = $this->actingAs($admin, 'sanctum')->getJson('/api/complaints');
        $all->assertStatus(200)->assertSame(2, $all->json('total'));

        $filtered = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/complaints?support_id={$second->id}");
        $filtered->assertStatus(200)->assertSame(1, $filtered->json('total'));
    }

    public function test_status_can_be_updated(): void
    {
        $support = $this->makeSupport();
        $student = Student::create(['name' => 'دانشجو']);
        $mentor = Mentor::create(['name' => 'منتور']);
        $complaint = Complaint::create([
            'student_id' => $student->id, 'mentor_id' => $mentor->id,
            'support_id' => $support->id, 'description' => 'شرح تست نارضایتی',
            'priority' => 'normal',
        ]);

        $this->actingAs($support, 'sanctum')
            ->putJson("/api/complaints/{$complaint->id}", ['status' => 'resolved'])
            ->assertStatus(200)
            ->assertJsonPath('complaint.status', 'resolved');
    }

    public function test_invalid_status_is_rejected(): void
    {
        $support = $this->makeSupport();
        $student = Student::create(['name' => 'دانشجو']);
        $mentor = Mentor::create(['name' => 'منتور']);
        $complaint = Complaint::create([
            'student_id' => $student->id, 'mentor_id' => $mentor->id,
            'support_id' => $support->id, 'description' => 'شرح تست نارضایتی',
            'priority' => 'normal',
        ]);

        $this->actingAs($support, 'sanctum')
            ->putJson("/api/complaints/{$complaint->id}", ['status' => 'invalid'])
            ->assertStatus(422);
    }
}
