<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreResourceRequest;
use App\Models\Resource;
use App\Support\AttachmentStorage;
use App\Support\Concerns\ScopesBySupportChannel;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Http\Request;

class ResourceController extends Controller
{
    use ScopesBySupportChannel;

    public function __construct(private readonly AttachmentStorage $attachments) {}

    /**
     * لیست سورس‌ها و فایل‌ها. پشتیبان و ناظر اکانت فقط بخش هم‌نوع خودشان را
     * می‌بینند؛ سوپر ادمین هر دو بخش را و با `?channel=web|ai` فقط یکی را.
     */
    public function index(Request $request)
    {
        $query = Resource::with('creator');

        // فیلتر بر اساس نوع (سورس جلسه / فایل مورد نیاز)
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($channels = $this->requestedChannels($request)) {
            $query->whereIn('channel', $channels);
        } else {
            $this->applyVisibleChannel($query, $request->user());
        }

        // فیلتر بر اساس دسته‌بندی
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // جستجو بر اساس عنوان
        if ($request->has('search')) {
            $query->where('title', 'like', '%'.$request->search.'%');
        }

        $resources = $query->orderBy('created_at', 'desc')->paginate(min($request->input('per_page', 20), 100));

        return response()->json($resources);
    }

    /** دانشجو فقط سورس‌های آموزشیِ هم‌نوع مسیر خودش را می‌خواند؛ هیچ عملیات نوشتنی ندارد. */
    public function studentSessionSources(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Resource::query()
            ->where('type', 'session_source')
            ->whereIn('channel', $this->studentChannels($request->user()))
            ->select(['id', 'title', 'description', 'file_url', 'category', 'channel', 'created_at']);

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        return response()->json($query
            ->orderByDesc('created_at')
            ->paginate(min((int) ($validated['per_page'] ?? 30), 100)));
    }

    // پسوندهای خطرناک و آپلود فایل در App\Support\AttachmentStorage مدیریت می‌شود

    // ثبت فایل یا سورس جدید
    public function store(StoreResourceRequest $request)
    {
        $fileUrl = $request->file_url;

        // اگر فایل آپلود شده بود، روی سرور ذخیره کن
        if ($request->hasFile('file')) {
            try {
                $path = $this->attachments->store($request->file('file'), 'resources', AttachmentStorage::ALLOWED_DOCUMENT_EXTENSIONS);
            } catch (UnsupportedAttachmentException $exception) {
                return response()->json([
                    'message' => $exception->getMessage(),
                    'errors' => ['file' => [$exception->getMessage()]],
                ], 422);
            }
            $fileUrl = $this->attachmentUrl($path);
        }

        $resource = Resource::create([
            'title' => $request->title,
            'description' => $request->description,
            'type' => $request->type,
            // بخش از خودِ کاربر می‌آید، مگر سوپر ادمین خودش انتخاب کند.
            'channel' => $this->channelForNewContent($request),
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
    public function show(Request $request, $id)
    {
        return response()->json($this->findVisibleResource($request, (int) $id));
    }

    // ویرایش فایل/سورس — جابه‌جایی بین دو بخش فقط کار سوپر ادمین است
    public function update(Request $request, $id)
    {
        $resource = $this->findVisibleResource($request, (int) $id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:session_source,required_file,other',
            'channel' => 'sometimes|in:web,ai',
            'file_url' => 'nullable|url',
            'category' => 'nullable|string|max:100',
        ]);

        if ($request->hasFile('file')) {
            try {
                $path = $this->attachments->store($request->file('file'), 'resources', AttachmentStorage::ALLOWED_DOCUMENT_EXTENSIONS);
            } catch (UnsupportedAttachmentException $exception) {
                return response()->json([
                    'message' => $exception->getMessage(),
                    'errors' => ['file' => [$exception->getMessage()]],
                ], 422);
            }
            $request->merge(['file_url' => $this->attachmentUrl($path)]);
        }

        $changes = $request->only(['title', 'description', 'type', 'file_url', 'category']);

        if ($request->user()->isAdmin() && $request->has('channel')) {
            $changes['channel'] = $request->string('channel')->toString();
        }

        $resource->update($changes);

        return response()->json([
            'message' => 'فایل با موفقیت ویرایش شد',
            'resource' => $resource->fresh('creator'),
        ]);
    }

    // حذف فایل
    public function destroy(Request $request, $id)
    {
        $this->findVisibleResource($request, (int) $id)->delete();

        return response()->json(['message' => 'فایل با موفقیت حذف شد']);
    }

    /**
     * مسیر نسبی دانلود فایل روی سرور.
     *
     * پیش از این `url(Storage::url(...))` استفاده می‌شد که دو راه می‌شکست:
     * host را از APP_URL می‌ساخت (پس با اجرای برنامه روی پورت یا دامنه‌ی
     * دیگر نادرست بود)، و به `/storage/...` اشاره می‌کرد که کانتینر وب اصلاً
     * فایل‌های دیسک API را ندارد و nginx هم آن را سرو نمی‌کند. مسیر
     * `attachments.show` همان‌جاست که پیوست‌های گفتگو و رودمپ از آن سرو
     * می‌شوند: نسبی، امن و بدون گره‌خوردن به APP_URL.
     */
    private function attachmentUrl(string $path): string
    {
        return route('attachments.show', ['path' => $path], absolute: false);
    }

    /**
     * رکوردی که کاربر اجازه دیدنش را دارد. برای پشتیبان و ناظر اکانت یعنی
     * فقط بخش هم‌نوع خودشان؛ سوپر ادمین به هر دو بخش دسترسی دارد.
     * پاسخ ۴۰۴ است تا وجود رکوردِ بخشِ دیگر هم لو نرود.
     */
    private function findVisibleResource(Request $request, int $id): Resource
    {
        $query = Resource::query()->whereKey($id);

        if (! $request->user()->isAdmin()) {
            $this->applyVisibleChannel($query, $request->user());
        }

        abort_if($query->doesntExist(), 404, 'این فایل در دسترس شما نیست.');

        return Resource::with('creator')->findOrFail($id);
    }
}
