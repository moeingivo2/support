<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| کارهای زمان‌بندی‌شده
|--------------------------------------------------------------------------
|
| بستنِ خودکارِ گفتگوهایی که دانشجو جوابشان را نداده است. هر ۱۵ دقیقه یک‌بار
| کافی است: چون آستانه ۱۲ ساعت است، دقتِ چند دقیقه‌ای هیچ تفاوتی در نتیجه
| نمی‌دهد و بارِ دیتابیس را کم نگه می‌دارد. `withoutOverlapping` هم لازم است
| تا اگر اجرای قبلی هنوز تمام نشده، اجرای بعدی روی همان داده‌ها نیفتد.
|
| در داکر این زمان‌بند با سرویس `scheduler` (`php artisan schedule:work`)
| اجرا می‌شود؛ بدون آن، هیچ‌کدام از این‌ها خودکار اجرا نمی‌شود.
|
*/

Schedule::command('chats:auto-close-idle')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground();
