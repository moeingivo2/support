<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreResourceRequest;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResourceController extends Controller
{
    // دریافت لیست فایل‌ها و سورس‌ها
    public function index(Request $request)
    {
        $query = Resource::with('creator');

        // فیلتر بر اساس نوع (سورس جلسه / فایل مورد نیاز)
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // فیلتر بر اساس دسته‌بندی
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // جستجو بر اساس عنوان
        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $resources = $query->orderBy('created_at', 'desc')->paginate(min($request->input('per_page', 20), 100));

        return response()->json($resources);
    }

    // پسوندهای خطرناک که نباید روی سرور ذخیره شوند (RCE/WebShell)
    private const BLOCKED_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar',
        'pht', 'phps', 'cgi', 'pl', 'py', 'sh', 'bat', 'exe',
        'jsp', 'asp', 'aspx', 'htaccess',
    ];

    // ثبت فایل یا سورس جدید
    public function store(StoreResourceRequest $request)
    {
        $fileUrl = $request->file_url;

        // اگر فایل آپلود شده بود، روی سرور ذخیره کن
        if ($request->hasFile('file')) {
            $file = $request->file('file');

            $extension = strtolower($file->getClientOriginalExtension());
            if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
                return response()->json([
                    'message' => 'این نوع فایل مجاز به آپلود نیست',
                    'errors' => ['file' => ['این نوع فایل مجاز به آپلود نیست']],
                ], 422);
            }

            // هش تصادفی در نام فایل تا مسیر قابل حدس نباشد
            $path = $file->storeAs(
                'resources',
                now()->timestamp.'-'.bin2hex(random_bytes(8)).'.'.$extension,
                'public'
            );
            $fileUrl = url(Storage::url($path));
        }

        $resource = Resource::create([
            'title' => $request->title,
            'description' => $request->description,
            'type' => $request->type,
            'file_url' => $fileUrl,
            'category' => $request->category,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'فایل/سورس با موفقیت ثبت شد',
            'resource' => $resource->load('creator'),
        ], 201);
    }

    // نمایش جزئیات یک فایل
    public function show($id)
    {
        $resource = Resource::with('creator')->findOrFail($id);
        return response()->json($resource);
    }

    // ویرایش فایل/سورس
    public function update(Request $request, $id)
    {
        $resource = Resource::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:session_source,required_file,other',
            'file_url' => 'nullable|url',
            'category' => 'nullable|string|max:100',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
                return response()->json([
                    'message' => 'این نوع فایل مجاز به آپلود نیست',
                    'errors' => ['file' => ['این نوع فایل مجاز به آپلود نیست']],
                ], 422);
            }
            $path = $file->storeAs(
                'resources',
                now()->timestamp.'-'.bin2hex(random_bytes(8)).'.'.$extension,
                'public'
            );
            $request->merge(['file_url' => url(Storage::url($path))]);
        }

        $resource->update($request->only([
            'title', 'description', 'type', 'file_url', 'category'
        ]));

        return response()->json([
            'message' => 'فایل با موفقیت ویرایش شد',
            'resource' => $resource,
        ]);
    }

    // حذف فایل
    public function destroy($id)
    {
        $resource = Resource::findOrFail($id);
        $resource->delete();

        return response()->json(['message' => 'فایل با موفقیت حذف شد']);
    }
}