<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFaqRequest;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /** FAQ فعال و فقط‌خواندنی برای صفحه‌ی حساب دانشجو. */
    public function studentIndex(Request $request)
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'max:100'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $query = Faq::query()
            ->where('is_active', true)
            ->select(['id', 'question', 'answer', 'category', 'order']);

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

    // لیست FAQها (با فیلتر دسته)
    public function index(Request $request)
    {
        $query = Faq::query();

        // فقط فعال‌ها (مگر اینکه ادمین بخواد همه رو ببینه)
        if (! $request->boolean('all')) {
            $query->where('is_active', true);
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

    // ثبت FAQ جدید
    public function store(StoreFaqRequest $request)
    {
        $faq = Faq::create($request->validated());

        return response()->json([
            'message' => 'سوال متداول با موفقیت ثبت شد',
            'faq' => $faq,
        ], 201);
    }

    // جزئیات یک FAQ
    public function show($id)
    {
        $faq = Faq::findOrFail($id);

        return response()->json($faq);
    }

    // ویرایش FAQ
    public function update(StoreFaqRequest $request, $id)
    {
        $faq = Faq::findOrFail($id);
        $faq->update($request->validated());

        return response()->json([
            'message' => 'سوال متداول با موفقیت ویرایش شد',
            'faq' => $faq,
        ]);
    }

    // حذف FAQ
    public function destroy($id)
    {
        $faq = Faq::findOrFail($id);
        $faq->delete();

        return response()->json(['message' => 'سوال متداول با موفقیت حذف شد']);
    }

    // لیست دسته‌بندی‌های موجود
    public function categories()
    {
        $categories = Faq::whereNotNull('category')
            ->distinct()
            ->pluck('category');

        return response()->json($categories);
    }
}
