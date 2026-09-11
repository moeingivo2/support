<?php

namespace Tests\Feature;

use App\Models\Resource;
use Tests\TestCase;

class ResourceTest extends TestCase
{
    public function test_support_can_list_resources(): void
    {
        $support = $this->makeSupport();
        Resource::create([
            'title' => 'سورس جلسه ۱',
            'type' => 'session_source',
            'file_url' => 'https://example.com/src1.zip',
            'category' => 'لاراول',
            'created_by' => $support->id,
        ]);

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/resources')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_filter_by_type(): void
    {
        $support = $this->makeSupport();
        Resource::create([
            'title' => 'سورس', 'type' => 'session_source',
            'file_url' => 'https://example.com/a.zip', 'created_by' => $support->id,
        ]);
        Resource::create([
            'title' => 'فایل', 'type' => 'required_file',
            'file_url' => 'https://example.com/b.zip', 'created_by' => $support->id,
        ]);

        $sources = $this->actingAs($support, 'sanctum')
            ->getJson('/api/resources?type=session_source');
        $sources->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('سورس', $sources->json('data.0.title'));
    }

    public function test_search_by_title(): void
    {
        $support = $this->makeSupport();
        Resource::create([
            'title' => 'آموزش Laravel', 'type' => 'session_source',
            'file_url' => 'https://example.com/l.zip', 'created_by' => $support->id,
        ]);
        Resource::create([
            'title' => 'نصب Python', 'type' => 'session_source',
            'file_url' => 'https://example.com/p.zip', 'created_by' => $support->id,
        ]);

        $response = $this->actingAs($support, 'sanctum')
            ->getJson('/api/resources?search=Laravel');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_dangerous_file_upload_is_blocked(): void
    {
        $support = $this->makeSupport();

        $response = $this->actingAs($support, 'sanctum')
            ->post('/api/resources', [
                'title' => 'وب‌شل',
                'type' => 'required_file',
                'file' => \Illuminate\Http\Testing\File::fake()->create('shell.php', 10),
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('resources', ['title' => 'وب‌شل']);
    }

    public function test_safe_file_upload_succeeds(): void
    {
        $support = $this->makeSupport();

        $response = $this->actingAs($support, 'sanctum')
            ->post('/api/resources', [
                'title' => 'فایل آموزشی',
                'type' => 'required_file',
                'file' => \Illuminate\Http\Testing\File::fake()->create('guide.pdf', 100),
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('resources', ['title' => 'فایل آموزشی']);

        // نام فایل باید هش/تصادفی باشد نه اسم اصلی
        $this->assertStringNotContainsString('guide', $response->json('resource.file_url'));
    }

    public function test_large_per_page_is_capped(): void
    {
        $support = $this->makeSupport();

        $response = $this->actingAs($support, 'sanctum')
            ->getJson('/api/resources?per_page=100000');

        $response->assertStatus(200);
        $this->assertLessThanOrEqual(100, $response->json('per_page'));
    }

    public function test_creator_relationship_is_loaded(): void
    {
        $support = $this->makeSupport();
        Resource::create([
            'title' => 'سورس', 'type' => 'session_source',
            'file_url' => 'https://example.com/x.zip', 'created_by' => $support->id,
        ]);

        $response = $this->actingAs($support, 'sanctum')->getJson('/api/resources');

        $response->assertStatus(200);
        $this->assertSame($support->name, $response->json('data.0.creator.name'));
    }
}
