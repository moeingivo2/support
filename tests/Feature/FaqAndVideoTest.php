<?php

namespace Tests\Feature;

use App\Models\EducationalVideo;
use App\Models\Faq;
use Tests\TestCase;

class FaqAndVideoTest extends TestCase
{
    public function test_faq_index_returns_active_only_by_default(): void
    {
        $support = $this->makeSupport();
        Faq::create(['question' => 'فعال', 'answer' => 'پاسخ', 'is_active' => true]);
        Faq::create(['question' => 'غیرفعال', 'answer' => 'پاسخ', 'is_active' => false]);

        $response = $this->actingAs($support, 'sanctum')->getJson('/api/faqs');

        $response->assertStatus(200)->assertJsonCount(1);
        $this->assertSame('فعال', $response->json('0.question'));
    }

    public function test_faq_search(): void
    {
        $support = $this->makeSupport();
        Faq::create(['question' => 'خطای XAMPP', 'answer' => 'پورت را عوض کنید', 'is_active' => true]);
        Faq::create(['question' => 'نصب Laragon', 'answer' => 'نصب آسان است', 'is_active' => true]);

        $response = $this->actingAs($support, 'sanctum')
            ->getJson('/api/faqs?search=XAMPP');

        $response->assertStatus(200)->assertJsonCount(1);
    }

    public function test_support_can_create_faq(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/faqs', [
                'question' => 'چطور ionCube نصب کنم؟',
                'answer' => 'از لودر مناسب نسخه PHP استفاده کنید.',
                'category' => 'ioncube',
            ])->assertStatus(201);

        $this->assertDatabaseHas('faqs', ['category' => 'ioncube']);
    }

    public function test_faq_requires_question_and_answer(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/faqs', ['question' => 'فقط سوال'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['answer']);
    }

    public function test_faq_categories_endpoint(): void
    {
        $support = $this->makeSupport();
        Faq::create(['question' => 'س', 'answer' => 'پ', 'category' => 'laragon']);
        Faq::create(['question' => 'س۲', 'answer' => 'پ۲', 'category' => 'xampp']);
        Faq::create(['question' => 'س۳', 'answer' => 'پ۳', 'category' => 'laragon']);

        $response = $this->actingAs($support, 'sanctum')->getJson('/api/faqs/categories');

        $response->assertStatus(200);
        $categories = $response->json();
        $this->assertCount(2, array_unique($categories));
    }

    public function test_video_index_orders_and_creates(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/videos', [
                'title' => 'آموزش نصب Laragon',
                'video_url' => 'https://aparat.com/v/test',
                'category' => 'laragon',
                'order' => 1,
            ])->assertStatus(201);

        $this->assertDatabaseHas('educational_videos', ['title' => 'آموزش نصب Laragon']);
    }

    public function test_video_requires_valid_url(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/videos', [
                'title' => 'ویدیو',
                'video_url' => 'not-a-url',
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['video_url']);
    }

    public function test_inactive_video_hidden_by_default(): void
    {
        $support = $this->makeSupport();
        EducationalVideo::create([
            'title' => 'پنهان',
            'video_url' => 'https://aparat.com/v/x',
            'is_active' => false,
        ]);

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/videos')
            ->assertStatus(200)
            ->assertJsonCount(0);
    }
}
