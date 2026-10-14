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
        // تصویر
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
        // سند و متن
        'pdf', 'txt', 'csv', 'md', 'json', 'xml',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'odt', 'ods', 'odp', 'rtf',
        // کد و استایل (فقط به‌صورت دانلودی سرو می‌شوند، هرگز اجرا/رندر نمی‌شوند)
        'py', 'css', 'scss', 'sass', 'less',
        'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
        'sql', 'yaml', 'yml', 'toml', 'ini', 'env',
        'sh', 'bash', 'zsh', 'ps1',
        'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'java',
        'go', 'rs', 'rb', 'kt', 'swift', 'dart', 'lua', 'pl', 'r',
        // مارک‌آپ. این‌ها فقط دانلودِ بی‌اثرند: AttachmentController همیشه
        // ‎application/octet-stream‎ + ‎Content-Disposition: attachment‎ +
        // ‎nosniff‎ می‌فرستد، پس مرورگر آن‌ها را رندر یا اجرا نمی‌کند.
        'html', 'htm', 'xhtml', 'svg', 'svgz',
        // صدا
        'webm', 'ogg', 'oga', 'mp3', 'm4a', 'wav', 'aac',
        // ویدیو
        'mp4', 'm4v', 'mov', 'avi', 'mkv', 'mpg', 'mpeg',
        '3gp', '3g2', 'wmv', 'flv', 'ogv',
        // فشرده
        'zip', 'rar', '7z', 'tar', 'gz',
    ];

    /**
     * پسوندهای مجاز برای فایل‌های بارگذاری‌شده پنل (منابع و ویدیوها).
     *
     * @var array<int, string>
     */
    public const ALLOWED_DOCUMENT_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'csv', 'xls', 'xlsx',
    ];

    /** @var array<int, string> */
    public const ALLOWED_ROADMAP_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

    /**
     * نوع‌های واقعی مجاز (بررسی سمت سرور با finfo، نه هدر مرورگر).
     *
     * این فهرست «کف» است و به‌تنهایی کافی نیست: هر نوع فقط وقتی پذیرفته
     * می‌شود که با خانواده‌ی پسوندش هم بخواند (نگاه کن به
     * {@see self::isAllowedMime()} و {@see self::EXTENSION_GROUPS}).
     * بدون این شرط، یک فایل متنیِ HTML با نام ‎.png‎ هم پذیرفته می‌شد.
     *
     * @var array<int, string>
     */
    public const ALLOWED_MIMES = [
        'image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/gif',
        'image/webp', 'image/bmp', 'image/x-ms-bmp',
        'application/pdf',
        'text/plain', 'text/csv', 'text/markdown', 'text/rtf',
        'text/css', 'text/javascript', 'application/javascript', 'application/typescript',
        'application/x-shellscript', 'text/x-shellscript',
        'application/json', 'application/xml', 'text/xml',
        'text/yaml', 'application/yaml', 'text/x-yaml',
        'text/x-c', 'text/x-c++', 'text/x-java', 'text/x-go', 'text/x-rust',
        'text/x-ruby', 'text/x-swift', 'text/x-lua', 'text/x-perl', 'text/x-r',
        'text/x-sql', 'text/x-toml', 'text/x-ini', 'text/x-python',
        'text/html', 'application/xhtml+xml', 'image/svg+xml',
        'application/vnd.ms-excel', 'application/msword', 'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/vnd.rar',
        'application/x-7z-compressed', 'application/x-tar',
        'application/gzip', 'application/x-gzip',
        'audio/webm', 'video/webm',
        'audio/ogg', 'application/ogg', 'audio/oga',
        'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/aacp',
        'audio/mp4', 'audio/x-m4a',
        'audio/wav', 'audio/x-wav', 'audio/vnd.wave',
        'video/mp4', 'video/x-m4v', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
        'video/3gpp', 'video/3gpp2', 'video/x-ms-wmv',
        'video/x-flv', 'video/ogg',
        // finfo برای بسیاری از فایل‌های اداری/آرشیوی/مدیای ناشناخته نوع
        // دقیق برنمی‌گرداند. پذیرشِ عمومی فقط برای خانواده‌هایی است که
        // در مرورگر اجرا نمی‌شوند؛ برای عکس و پسوندهای اجراشدنی ممنوع است.
        'application/octet-stream',
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
        'application/octet-stream',
    ];

    /**
     * نوع‌های مجاز برای پسوندهای تصویری.
     *
     * عمداً ‎application/octet-stream‎ اینجا نیست: یک متن یا باینریِ دلخواه
     * که با پسوند ‎.png‎ نام‌گذاری شده نباید پذیرفته شود.
     *
     * @var array<int, string>
     */
    private const IMAGE_MIMES = [
        'image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png',
        'image/gif', 'image/webp', 'image/bmp', 'image/x-ms-bmp',
    ];

    /**
     * نوع‌های مجاز برای پسوندهای ویدیویی.
     *
     * finfo نوع ظرف ویدیو را برمی‌گرداند (مثل `video/quicktime` برای mov)،
     * پس این‌ها از فهرست عمومی جدا هستند تا با پسوند عکس/سند قاطی نشوند.
     *
     * @var array<int, string>
     */
    private const VIDEO_MIMES = [
        'video/mp4', 'video/x-m4v', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
        'video/3gpp', 'video/3gpp2', 'video/x-ms-wmv',
        'video/x-flv', 'video/ogg', 'video/webm',
        'application/octet-stream',
    ];

    /**
     * نوع‌های مجاز برای پسوندهای فشرده.
     *
     * @var array<int, string>
     */
    private const ARCHIVE_MIMES = [
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/vnd.rar',
        'application/x-7z-compressed', 'application/x-tar',
        'application/gzip', 'application/x-gzip',
        'application/octet-stream',
    ];

    /**
     * نوع‌های مجاز برای پسوندهای متنی، کد و اسناد اداری.
     *
     * ‎text/html‎ و انواع php اینجا نیستند: پسوند php روی دیسک قابل
     * اجراست و هرگز پذیرفته نمی‌شود. مارک‌آپ (html/svg) اما بی‌خطر است چون
     * فقط به‌صورت دانلود سرو می‌شود، پس در فهرستِ گروهِ متن هست.
     *
     * @var array<int, string>
     */
    private const TEXT_MIMES = [
        'text/plain', 'text/csv', 'text/markdown', 'text/rtf',
        'text/css', 'text/javascript', 'application/javascript',
        'application/typescript', 'application/x-shellscript', 'text/x-shellscript',
        'application/json', 'application/xml', 'text/xml',
        'text/yaml', 'application/yaml', 'text/x-yaml',
        'text/x-c', 'text/x-c++', 'text/x-java', 'text/x-go', 'text/x-rust',
        'text/x-ruby', 'text/x-swift', 'text/x-lua', 'text/x-perl', 'text/x-r',
        'text/x-sql', 'text/x-toml', 'text/x-ini', 'text/x-python',
        // مارک‌آپ: فقط اینجاست، نه در گروه تصویر — وگرنه یک اسکریپتِ
        // متنی که با نام ‎.png‎ آمده از راه ‎text/html‎ رد می‌شد.
        'text/html', 'application/xhtml+xml', 'image/svg+xml',
        'application/vnd.ms-excel', 'application/msword', 'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/octet-stream',
    ];

    /**
     * پسوندهایی که هر گروه نوع برایشان پذیرفته می‌شود.
     *
     * @var array<string, array<int, string>>
     */
    private const EXTENSION_GROUPS = [
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
        'video' => ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'mpg', 'mpeg', '3gp', '3g2', 'wmv', 'flv', 'ogv'],
        'audio' => ['webm', 'ogg', 'oga', 'mp3', 'm4a', 'wav', 'aac'],
        'archive' => ['zip', 'rar', '7z', 'tar', 'gz'],
        'pdf' => ['pdf'],
        'text' => [
            'txt', 'csv', 'md', 'json', 'xml', 'rtf',
            'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'odt', 'ods', 'odp',
            'py', 'css', 'scss', 'sass', 'less',
            'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
            'sql', 'yaml', 'yml', 'toml', 'ini', 'env',
            'sh', 'bash', 'zsh', 'ps1',
            'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'java',
            'go', 'rs', 'rb', 'kt', 'swift', 'dart', 'lua', 'pl', 'r',
            'html', 'htm', 'xhtml', 'svg', 'svgz',
        ],
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
     * نوع واقعی باید هم در فهرست مجاز باشد و هم با خانواده‌ی پسوندش بخواند.
     *
     * دو شرط لازم است: اگر فقط فهرست سراسریِ {@see self::ALLOWED_MIMES}
     * بررسی شود، یک متنِ HTML با نام ‎.png‎ یا ‎.py‎ پذیرفته می‌شد. اگر فقط
     * خانواده‌ی پسوند بررسی شود، پسوندهایی مثل ‎.docx‎ که finfo برایشان
     * نوع دقیق نمی‌دهد رد می‌شدند.
     *
     * ‎application/octet-stream‎ فقط در گروه‌هایی پذیرفته می‌شود که در مرورگر
     * اجرا نمی‌شوند؛ IMAGE_MIMES عمداً آن را ندارد.
     */
    private function isAllowedMime(string $mime, string $extension): bool
    {
        if ($mime === self::EMPTY_MIME) {
            return true;
        }

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            return false;
        }

        $groupMimes = match ($this->extensionGroup($extension)) {
            'image' => self::IMAGE_MIMES,
            'video' => self::VIDEO_MIMES,
            'audio' => self::AUDIO_MIMES,
            'archive' => self::ARCHIVE_MIMES,
            'pdf' => ['application/pdf', 'application/octet-stream'],
            'text' => self::TEXT_MIMES,
            default => null,
        };

        return $groupMimes !== null && in_array($mime, $groupMimes, true);
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

    /**
     * آیا این پسوند یک تصویرِ برشی (raster) است؟
     *
     * ‎.svg‎ عمداً «تصویر» حساب نمی‌شود: مرورگر می‌تواند SVG را در ‎<img>‎
     * رندر کند، پس بهتر است مثل بقیه‌ی فایل‌ها دانلود شود نه پیش‌نمایش.
     *
     * مبنا پسوند است، نه Content-Type مرورگر: هدرِ کلاینت قابل‌جعل است
     * و با دادن ‎image/svg+xml‎ می‌شد یک SVG را جای تصویر جا زد.
     */
    public function isRasterImageExtension(string $extension): bool
    {
        return $this->extensionGroup(strtolower(trim($extension))) === 'image';
    }

    public function delete(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        Storage::disk(config('aiosupport.attachments.disk'))->delete($path);
    }
}
