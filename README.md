# پنل پشتیبانی AIO

پنل مدیریت و پشتیبانی دانشجویان AIO — یک برنامه‌ی دو بخشی:

- **Backend / API** — Laravel 11 روی PHP 8.5 (php-fpm) و PostgreSQL 17
- **Frontend** — React 19 + TypeScript + Vite + Tailwind CSS 4 که به‌صورت استاتیک با nginx سرو می‌شود

برنامه به‌صورت کامل از راه Docker اجرا می‌شود (سه سرویس: `api`، `web`، `db`).

---

## پیش‌نیازها

- **Docker** نسخه‌ی ۲۴+
- **Docker Compose** نسخه‌ی 2+ (دستور `docker compose`، نه `docker-compose`)
- PHP 8.5 + Composer و Node.js 22 فقط برای توسعه‌ی محلی بدون داکر (اختیاری)

## روش ساخت و اجرا با Docker (روش اصلی)

### ۱) فایل `.env` را بسازید

```bash
cp .env.docker.example .env
```

مقادیر مهم `.env`:

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `APP_KEY` | (در مثال پر شده) | کلید رمزنگاری لاراول؛ در پروژه‌ی واقعی حتماً تعویض کنید |
| `DB_DATABASE` | `support` | نام دیتابیس |
| `DB_USERNAME` | `support` | نام کاربری دیتابیس |
| `DB_PASSWORD` | — | رمز دیتابیس (در پروژه‌ی واقعی عوض کنید) |
| `WEB_PORT` | `5173` | پورتی که پنل روی هاست روی آن در دسترس است |
| `API_PORT` | `8000` | پورت API (برای توسعه‌ی محلی فرانت) |

### ۲) بیلد و اجرا

```bash
docker compose up -d --build
```

این دستور سه کانتینر می‌سازد و بالا می‌آورد:

| سرویس | کانتینر | نقش |
|---|---|---|
| `api` | `support-api` | Laravel با php-fpm (پورت داخلی ۹۰۰۰)؛ هنگام بالا آمدن خودکار `storage:link` و `migrate` را اجرا می‌کند |
| `web` | `support-web` | فرانت‌بیلد (nginx) — دانلود فایل‌ها و `location /api/` را به php-fpm پروکسی می‌کند |
| `db` | `support-db` | PostgreSQL 17 با volume جداگانه |

دیتا روی دو volume نگه‌داری می‌شود که با بازسازی کانتینر از بین نمی‌رود: `db-data` (دیتابیس) و `storage-data` (پیوست‌ها و فایل‌های آپلودی).

### ۳) دسترسی

پنل روی این آدرس باز می‌شود:

```
http://localhost:5173
```

### اجرا روی پورت دلخواه

برای اجرا روی پورتی جز `۵۱۷۳` کافیست `WEB_PORT` را تنظیم کنید (برنامه وابسته به پورت/دامنه نیست و `API` همان‌اورجینِ خود وب است):

```bash
WEB_PORT=8080 docker compose up -d --build web
```

حالا پنل روی `http://localhost:8080` در دسترس است.

### اکانت‌های دمو (Seed)

مایگریشن‌ها خودکار اجرا می‌شوند ولی **اکانت‌های نمونه خودکار seed نمی‌شوند**. برای ساخت اکانت‌های دمو:

```bash
docker compose exec api php artisan db:seed --force
```

### سایر دستورهای مفید

```bash
docker compose logs -f api        # لاگ‌های API
docker compose exec db psql -U support -d support   # شل دیتابیس
docker compose down               # توقف سرویس‌ها (دیتا حفظ می‌شود)
docker compose down -v            # توقف + پاک کردن کامل volumeها (پاک شدن همه‌ی داده‌ها)
```

> هر بار که سورس را تغییر می‌دهید باید ایج مشابه‌ها را دوباره بسازید، چون در compose هیچ bind-mount نداریم:
> `docker compose up -d --build`

---

## اکانت‌ها و نقش‌ها

ورود هم با **ایمیل** کار می‌کند هم با **شماره تلفن** (`login` – پشتیبانی‌ها در این دیتابیس ایمیل ندارند و با شماره وارد می‌شوند).

### کاربران واقعی موجود در دیتابیس (`SELECT` زنده)

| # | نقش | کانال | نام | ورود با | رمز عبور |
|---|---|---|---|---|---|
| ۴ | **ناظر اکانت** (`account_observer`) | `web` | معین بابانواز | `09300778494` | توسط مدیر تعیین شده |
| ۳۹ | **پشتیبان** (`support`) | `web` | محمد حسین میری پور | `09307605480` | توسط مدیر تعیین شده |
| ۴۱ | **پشتیبان** (`support`) | `web` | امیر محمد عبداله پور | `09385567005` | توسط مدیر تعیین شده |
| ۴۲ | **پشتیبان** (`support`) | `web` | شکیبا رزاقی | `09111456789` | توسط مدیر تعیین شده |
| ۵ | **پشتیبان — آزمایشی/اسموک** (`support`) | `web` | Support Smoke | `smoke-support@example.com` | توسط مدیر تعیین شده |
| ۱ | **سوپر ادمین** (`admin`) | — | فرزان اسلامی | `admin@example.com` | `password` |

> رمز پشتیبان‌ها هش‌شده ذخیره شده و زمان ثبت‌نام از پنل («ثبت پشتیبان جدید») توسط مدیر ست می‌شود؛ فقط اکانت دموی ادمین رمز یکسان `password` دارد.

### اکانت‌های دموی Seeder (فقط بعد از `db:seed` روی یک دیتابیس تازه)

همه با رمز یکسان `password` ساخته می‌شوند:

| نقش | کانال | ایمیل |
|---|---|---|
| **سوپر ادمین** (`admin`) | — | `admin@example.com` |
| **پشتیبان** (`support`) | `web` | `sara@example.com` |
| **پشتیبان** (`support`) | `ai` | `mohammad@example.com` |
| **دانشجو** (`student`) | — | `ahmad@example.com` |
| **دانشجو** (`student`) | — | `fatemeh@example.com` |
| **ناظر (فقط‌خواندنی)** (`observer`) | — | `observer@example.com` |

### دانشجویان واقعی فعلی دیتابیس

| نقش | نام | ورود با |
|---|---|---|
| **دانشجو** (`student`) | امیر حسین عبدالله پور | `amir.devlop007@gmail.com` |
| **دانشجو** (`student`) | محمد حسین میری پور | `mhmiripoor@gmail.com` |
| **دانشجو** (`student`) | شکیبا رزاقی | `989123456789` |

(علاوه بر این‌ها تعدادی اکانت آزمایشی با ایمیل‌های `smoke-*`, `reg-*`, `theme-*` و … در دیتابیس هست که توسط تست‌ها/اتوماسیون ساخته شده‌اند.)

### نقش‌ها و دسترسی‌ها

| نقش | دسترسی‌ها |
|---|---|
| **سوپر ادمین** (`admin`) | همه‌ی بخش‌های پنل، گزارش‌ها، رتبه‌بندی‌ها، مدیریت سوپر ادمین‌ها و ثبت پشتیبان. طبق سیاست به متن گفتگوها دسترسی ندارد. |
| **پشتیبان** (`support`) | گفتگوها، فایل‌ها و سوالات متداولِ **فقط کانال خودش** (`web` یا `ai`) + میز شیفت و نظرخواهی دانشجو. |
| **ناظر اکانت** (`account_observer`) | همه‌چیزِ پشتیبان + مدیریت تیم پشتیبان (شیفت‌بندی خودکار ماهانه، نظارت بر روی تیم، جابه‌جایی و شخصیت‌پذیری با هویت پشتیبان‌ها). |
| **ناظر** (`observer`) | فقط‌خواندنی برای حسابرسی عملیاتی؛ متن گفتگوها را می‌بیند ولی در آنها دخالت نمی‌کند. |
| **دانشجو** (`student`) | پنل خودش: چت با پشتیبان/هوش مصنوعی، رودمپ، فایل‌های دوره و سوالات متداولِ کانال خودش. |

> `support_type` (وب / هوش مصنوعی) محتوای پنل و گفتگوها را بین دو کانال جدا می‌کند؛ ناظر اکانت روی `account_observer` دسترسی به هر دو بخش را دارد. برای ساخت ناظر اکانت می‌توانید با دستور زیر یک کاربر با نقش `account_observer` بسازید:
>
> `docker compose exec api php artisan tinker --execute 'App\Models\User::create(["name"=>"ناظر اکانت","email"=>"…","password"=>Illuminate\Support\Facades\Hash::make("password"),"role"=>"account_observer"]);'`

---

## توسعه‌ی محلی (بدون Docker)

### Backend (API)

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

پیش‌فرض `.env.example` دیتابیس `sqlite` است (فایل `database/database.sqlite`).

### Frontend (React/Vite)

```bash
cd front-end
npm install
npm run dev
```

Vite روی پورت **`5174`** بالا می‌آید و `API` را به `http://127.0.0.1:5173` پروکسی می‌کند (یعنی باید بخش وبِ داکر روی ۵۱۷۳ در حال اجرا باشد). می‌توانید مقصد پروکسی را با `VITE_API_TARGET` عوض کنید:

```bash
VITE_API_TARGET=http://127.0.0.1:8000 npm run dev   # اگر API را php artisan serve زده‌اید
```

> نمی‌توانید مستقیماً به پورت ۹۰۰۰ (php-fpm) وصل شوید؛ این پورت FastCGI است، نه HTTP.

---

## بیلد و بررسی کیفیت (CI محلی)

```bash
# Backend: فرمت‌دهی کد (pint) و تست‌ها
vendor/bin/pint --dirty
vendor/bin/phpunit --no-coverage

# Frontend: تایپ، لینت و بیلد
cd front-end
npx tsc -b --noEmit
npm run lint
npm run build
```

---

## ساختار پروژه

```
├── api/                ← را در ریشه دارد: Laravel app
│   ├── Dockerfile      ← php:8.5-fpm + composer
│   ├── docker-compose.yml
│   ├── app/
│   ├── database/       ← migrations + seeders (UserSeeder, FaqSeeder)
│   └── front-end/
│       ├── Dockerfile  ← node:22-alpine (build) → nginx (serve)
│       ├── nginx.conf  ← /api → php-fpm + تبلیغات دروازه
│       └── src/        ← پنل ادمین/پشتیبان/ناظر + پنل دانشجو
```