<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * سرو امن پیوست‌ها.
 *
 * فایل‌ها روی دیسک public ذخیره می‌شدند و مستقیم توسط وب‌سرور سرو می‌شدند؛
 * یعنی PHP امنیت هدرها روی آن‌ها اجرا نمی‌کرد. اینجا هر پیوست با
 * application/octet-stream و به‌صورت دانلود سرو می‌شود تا مرورگر آن را
 * اجرا نکند.
 */
class AttachmentController extends Controller
{
    public function show(Request $request, string $path)
    {
        $disk = Storage::disk(config('aiosupport.attachments.disk'));

        if (! $disk->exists($path)) {
            abort(404);
        }

        $name = basename($path);

        return response($disk->get($path), 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.addslashes($name).'"',
            'Content-Length' => (string) $disk->size($path),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
