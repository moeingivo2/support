<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $faqs = [
            [
                'question' => 'چطور Laragon را نصب کنم؟',
                'answer' => "۱. فایل نصب را از بخش فایل‌های موردنیاز دانلود کنید.\n۲. روی فایل exe کلیک راست کرده و Run as administrator بزنید.\n۳. مسیر نصب را انتخاب کنید و Next بزنید.\n۴. بعد از نصب، Laragon را اجرا کنید و Start All بزنید.",
                'category' => 'laragon',
                'order' => 1,
            ],
            [
                'question' => 'خطای port 80 already in use در XAMPP',
                'answer' => "این خطا یعنی پورت ۸۰ توسط برنامه دیگری (معمولاً Skype یا IIS) اشغال شده.\nراه‌حل: در XAMPP روی Config کنار Apache کلیک کنید → httpd.conf را باز کنید و Listen 80 را به Listen 8080 تغییر دهید. بعد آدرس localhost:8080 را استفاده کنید.",
                'category' => 'xampp',
                'order' => 1,
            ],
            [
                'question' => 'نحوه نصب و راه‌اندازی ionCube Loader',
                'answer' => "۱. نسخه ionCube متناسب با PHP خود را دانلود کنید.\n۲. فایل loader-wizard.php را در پوشه htdocs قرار دهید.\n۳. از طریق مرورگر اجرا کنید و دستورالعمل‌ها را دنبال کنید.\n۴. فایل ioncube_loader را در پوشه ext مربوط به PHP کپی کنید و در php.ini فعال کنید.",
                'category' => 'ioncube',
                'order' => 1,
            ],
            [
                'question' => 'خطای Composer: memory exhausted',
                'answer' => "این خطا به‌خاطر کمبود حافظه PHP است.\nراه‌حل موقت: \nphp -d memory_limit=-1 composer install\n\nراه‌حل دائمی: در php.ini مقدار memory_limit را به 512M یا -1 تغییر دهید.",
                'category' => 'other',
                'order' => 1,
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::create($faq);
        }
    }
}