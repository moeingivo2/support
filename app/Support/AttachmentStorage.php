<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * ذخیره امن پیوست‌ها.
 *
 * به‌جای «لیست ممنوع»، یک «لیست مجاز» استفاده می‌شود. لیست ممنوع همیشه
 * ناقص است: html و svg در آن جا نبودند و فایل‌هایی مثل
 * «payload.php␠» روی ویندوز به‌خاطر حذف فاصله‌ی انتهایی، با پسوند php
 * روی دیسک ذخیره می‌شدند و توسط Apache اجرا می‌شدند.
 */
class AttachmentStorage
{
    /**
     * پسوندهای مجاز برای پیوست گفتگو.
     *
     * @var array<int, string>
     */
    public const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt',
        'webm', 'ogg', 'oga', 'mp3', 'm4a', 'wav', 'aac',
    ];

    /**
     * پسوندهای مجاز برای فایل‌های بارگذاری‌شده پنل (منابع و ویدیوها).
     *
     * @var array<int, string>
     */
    public const ALLOWED_DOCUMENT_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'csv', 'xls', 'xlsx',
    ];

    /**
     * نوع‌های واقعی مجاز (بررسی سمت سرور با finfo، نه هدر مرورگر).
     *
     * @var array<int, string>
     */
    public const ALLOWED_MIMES = [
        'image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/gif',
        'image/webp', 'application/pdf', 'text/plain', 'text/csv',
        'application/vnd.ms-excel', 'application/octet-stream',
        'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
        'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'video/mp4',
    ];

    /**
     * فایل خالی هیچ محتوایی ندارد، پس نمی‌تواند اجرا شود؛ فقط برای
     * سازگاری با آپلودهای واقعیِ ناقص پذیرفته می‌شود.
     */
    private const EMPTY_MIME = 'application/x-empty';

    /**
     * نوع‌های مجاز برای پسوندهای صوتی.
     *
     * `video/webm` و `video/mp4` عمداً هستند: libmagic نوع ظرف را برمی‌گرداند،
     * نه نوع ترک. یک ضبط صرفاً صوتیِ مرورگر هم همان ظرف WebM را دارد و به
     * صورت `video/webm` تشخیص داده می‌شود، پس بدون این‌ها هر پیام صوتی رد
     * می‌شد. ظرف مدیا اجرا نمی‌شود و پسوند از قبل در فهرست مجاز است.
     *
     * @var array<int, string>
     */
    private const AUDIO_MIMES = [
        'audio/webm', 'video/webm',
        'audio/ogg', 'application/ogg', 'audio/oga',
        'audio/mpeg', 'audio/mp3',
        'audio/mp4', 'video/mp4', 'audio/x-m4a',
        'audio/wav', 'audio/x-wav', 'audio/vnd.wave',
        'audio/aac', 'audio/aacp',
    ];

    /**
     * نوع‌های مجاز برای پسوندهای تصویری.
     *
     * @var array<int, string>
     */
    private const IMAGE_MIMES = [
        'image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png',
        'image/gif', 'image/webp', 'image/bmp', 'image/x-ms-bmp',
    ];

    /**
     * پسوندهایی که هر گروه نوع برایشان پذیرفته می‌شود.
     *
     * @var array<string, array<int, string>>
     */
    private const EXTENSION_GROUPS = [
        'audio' => ['webm', 'ogg', 'oga', 'mp3', 'm4a', 'wav', 'aac'],
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    ];

    /**
     * @param  array<int, string>|null  $allowedExtensions
     *
     * @throws UnsupportedAttachmentException
     */
    public function store(
        UploadedFile $file,
        ?string $directory = null,
        ?array $allowedExtensions = null,
    ): string {
        $allowedExtensions ??= self::ALLOWED_EXTENSIONS;

        // پسوند از نام فایل می‌آید و قابل جعل است؛ نباید به آن اعتماد کرد.
        // همچنین فاصله/نقطه‌ی انتهایی باید حذف شود چون روی ویندوز NTFS
        // به‌طور خودکار حذف می‌شود و پسوند خطرناک را پنهان می‌کند.
        $extension = $this->normaliseExtension($file->getClientOriginalExtension());

        if ($extension === '' || ! in_array($extension, $allowedExtensions, true)) {
            throw new UnsupportedAttachmentException(
                'این نوع فایل مجاز نیست. فرمت‌های مجاز: '.implode('، ', $allowedExtensions).'.',
            );
        }

        // نوع واقعی فایل روی دیسک — قابل اعتماد است، برخلاف Content-Type مرورگر
        $detected = $this->detectMime($file);

        if ($detected === null || ! $this->isAllowedMime($detected, $extension)) {
            throw new UnsupportedAttachmentException(
                'محتوای فایل با پسوند آن هم‌خوانی ندارد.',
            );
        }

        $path = $file->storeAs(
            $directory ?? config('aiosupport.attachments.directory'),
            now()->timestamp.'-'.bin2hex(random_bytes(8)).'.'.$extension,
            config('aiosupport.attachments.disk'),
        );

        if ($path === false) {
            throw new UnsupportedAttachmentException('ذخیره فایل روی سرور ناموفق بود.');
        }

        return $path;
    }

    /**
     * حذف فاصله و نقطه‌های انتهایی و کوچک‌کردن حروف
     */
    private function normaliseExtension(string $extension): string
    {
        $extension = strtolower(trim($extension));
        $extension = rtrim($extension, " \t\n\r\0\x0B.");

        // فقط حروف و عدد؛ هر چیز دیگری (مثل %00) رد می‌شود
        return preg_replace('/[^a-z0-9]/', '', $extension) ?? '';
    }

    private function detectMime(UploadedFile $file): ?string
    {
        $path = $file->getRealPath();

        if ($path === false || ! is_file($path)) {
            return null;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);

        return is_string($mime) ? strtolower($mime) : null;
    }

    /**
     * نوع واقعی باید در فهرست مجاز باشد.
     *
     * برای اسناد (pdf و…) نوع‌های عمومیِ octet-stream پذیرفته می‌شود چون
     * finfo برای بسیاری از فایل‌های اداری نوع دقیق برنمی‌گرداند؛ خطر اجرای
     * کد از این مسیر وجود ندارد چون پسوند از قبل در لیست مجاز بوده است.
     */
    private function isAllowedMime(string $mime, string $extension): bool
    {
        if ($mime === self::EMPTY_MIME) {
            return true;
        }

        if (in_array($mime, self::ALLOWED_MIMES, true)) {
            return true;
        }

        // نوع واقعی باید با گروه پسوند بخواند؛ مثال: ‎video/webm‎ برای ‎.webm‎
        $groupMimes = match ($this->extensionGroup($extension)) {
            'audio' => self::AUDIO_MIMES,
            'image' => self::IMAGE_MIMES,
            default => null,
        };

        if ($groupMimes !== null && in_array($mime, $groupMimes, true)) {
            return true;
        }

        $isDocument = in_array($extension, self::ALLOWED_DOCUMENT_EXTENSIONS, true);

        return $isDocument && $mime === 'application/octet-stream';
    }

    private function extensionGroup(string $extension): ?string
    {
        foreach (self::EXTENSION_GROUPS as $group => $extensions) {
            if (in_array($extension, $extensions, true)) {
                return $group;
            }
        }

        return null;
    }

    public function delete(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        Storage::disk(config('aiosupport.attachments.disk'))->delete($path);
    }
}
