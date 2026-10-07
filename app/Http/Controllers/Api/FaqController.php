<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFaqRequest;
use App\Models\Faq;
use App\Support\Concerns\ScopesBySupportChannel;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    use ScopesBySupportChannel;

    /** FAQ فعال و فقط‌خواندنی برای صفحه‌ی حساب دانشجو — فقط بخش هم‌نوع مسیر او. */
    public function studentIndex(Request $request)
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $query = Faq::query()
            ->where('is_active', true)
            ->whereIn('channel', $this->studentChannels($request->user()))
            ->select(['id', 'question', 'answer', 'category', 'channel', 'order']);

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($builder) use ($search): void {
                $builder->where('question', 'like', '%'.$search.'%')
                    ->orWhere('answer', 'like', '%'.$search.'%');
            });
        }

        return response()->json($query->orderBy('order')->orderByDesc('id')->get());
    }

    /**
     * لیست FAQها. پشتیبان و ناظر اکانت فقط بخش هم‌نوع خودشان را می‌بینند؛
     * سوپر ادمین هر دو بخش را و با `?channel=web|ai` فقط یکی را.
     */
    public function index(Request $request)
    {
        $query = Faq::query();

        // فقط فعال‌ها (مگر اینکه ادمین بخواد همه رو ببینه)
        if (! $request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($channels = $this->requestedChannels($request)) {
            $query->whereIn('channel', $channels);
        } else {
            $this->applyVisibleChannel($query, $request->user());
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('question', 'like', "%{$search}%")
                    ->orWhere('answer', 'like', "%{$search}%");
            });
        }

        $faqs = $query->orderBy('order')->orderBy('created_at', 'desc')->get();

        return response()->json($faqs);
    }

    // ثبت FAQ جدید — بخش از خودِ کاربر گرفته می‌شود، مگر ادمین خودش انتخاب کند
    public function store(StoreFaqRequest $request)
    {
        $faq = Faq::create([
            ...$request->safe()->except('channel'),
            'channel' => $this->channelForNewContent($request),
        ]);

        return response()->json([
            'message' => 'سوال متداول با موفقیت ثبت شد',
            'faq' => $faq,
        ], 201);
    }

    // جزئیات یک FAQ
    public function show(Request $request, $id)
    {
        return response()->json($this->findVisibleFaq($request, (int) $id));
    }

    // ویرایش FAQ — جابه‌جایی بین دو بخش فقط کار سوپر ادمین است
    public function update(StoreFaqRequest $request, $id)
    {
        $faq = $this->findVisibleFaq($request, (int) $id);
        $changes = $request->safe()->except('channel');

        if ($request->user()->isAdmin() && $request->filled('channel')) {
            $changes['channel'] = $request->string('channel')->toString();
        }

        $faq->update($changes);

        return response()->json([
            'message' => 'سوال متداول با موفقیت ویرایش شد',
            'faq' => $faq->fresh(),
        ]);
    }

    // حذف FAQ
    public function destroy(Request $request, $id)
    {
        $this->findVisibleFaq($request, (int) $id)->delete();

        return response()->json(['message' => 'سوال متداول با موفقیت حذف شد']);
    }

    // لیست دسته‌بندی‌های موجود — فقط از بخش‌های قابل مشاهده
    public function categories(Request $request)
    {
        $query = Faq::query();

        if ($channels = $this->requestedChannels($request)) {
            $query->whereIn('channel', $channels);
        } else {
            $this->applyVisibleChannel($query, $request->user());
        }

        return response()->json($query->whereNotNull('category')->distinct()->pluck('category'));
    }

    /** رکوردی که کاربر اجازه دیدنش را دارد، وگرنه ۴۰۴ (نه ۴۰۳، تا وجودش لو نرود). */
    private function findVisibleFaq(Request $request, int $id): Faq
    {
        $query = Faq::query()->whereKey($id);

        if (! $request->user()->isAdmin()) {
            $this->applyVisibleChannel($query, $request->user());
        }

        abort_if($query->doesntExist(), 404, 'این سوال متداول در دسترس شما نیست.');

        return Faq::findOrFail($id);
    }
}
