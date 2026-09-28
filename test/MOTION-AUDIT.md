# گزارش ممیزی و بازطراحی حرکت (Motion Audit)

این سند نتیجه‌ی ممیزی کامل تمام افکت‌ها، انیمیشن‌ها و عناصر بصری تعاملی پروژه‌ی
**aiosupport** و بازطراحی آن‌ها با اصول حرکت مبتنی بر فنر (spring) است.

> **قید پروژه:** هیچ کتابخانه‌ی motion در پروژه نصب نشده و طبق قید «بدون وابستگی
> جدید»، فنرها با تقریب `cubic-bezier` پیاده شده‌اند تا فقط `transform` و `opacity`
> انیمیت شود و نرخ ۶۰ فریم حفظ شود.

---

## فاز ۱ — موجودی (Inventory)

### SVG توکار

| مسیر فایل | نام المان | نوع انیمیشن | محرک | حس فعلی (پیش از تغییر) |
|---|---|---|---|---|
| `test/src/shared/ui/route-transition-splash.tsx` | `route-orbit-loader` (تنها SVG توکار کل پروژه) | CSS keyframes روی `transform` | هنگام تغییر مسیر | `linear` — بدون شتاب/کاهش، چرخش یکنواخت |
| `test/src/shared/ui/route-transition-splash.tsx` | `__halo` | `@keyframes route-orbit-halo` | هم‌زمان لودر | `linear` |
| `test/src/shared/ui/route-transition-splash.tsx` | `__plane--one/two` | `@keyframes route-orbit-plane-*` | هم‌زمان لودر | `linear` / `linear reverse` |
| `test/src/shared/ui/route-transition-splash.tsx` | `__bead` | `@keyframes route-orbit-bead` | هم‌زمان لودر | `ease-in-out` |
| `test/src/shared/ui/route-transition-splash.tsx` | `__core` | بدون انیمیشن (ثابت) | — | — |

**نکته‌ی مهم:** برخلاف تصور رایج، این پروژه اپلیکیشن گرافیکی نیست. فقط **یک SVG توکار**
دارد. بقیه‌ی آیکن‌ها از `lucide-react` می‌آیند (SVG خارجی) و مسیرهایشان قابل بازطراحی
نیست — اما **نحوه‌ی حرکت آن‌ها** قابل بازطراحی است و همان کار انجام شد.

### آیکن‌های متحرک (lucide-react)

| المان | محل | نوع | محرک | حس فعلی |
|---|---|---|---|---|
| `Loader2` با `animate-spin` | ۱۵ نقطه (همه فرم‌ها و دکمه‌ها) | keyframe چرخش | هنگام بارگذاری | `linear` — درست (چرخش باید یکنواخت باشد) |
| `Sun` / `Moon` | `theme-toggle.tsx` | بدون انیمیشن | تغییر تم | ناگهانی — آیکن بدون settle |
| `Bell` در `StatusPill` | `support-chat` | بدون انیمیشن | — | ایستا |

### انیمیشن‌های CSS

| نام | فایل | محرک | حس فعلی | وضعیت |
|---|---|---|---|---|
| `shimmer` | `index.css` | اسکلت لودینگ | `linear` | ✅ مناسب |
| `toast-in` | `index.css` | ورود توست | `cubic-bezier(.16,1,.3,1)` | اصلاح شد → فنر gentle |
| `water-wave` | `index.css` | بی‌نهایت | `linear` | ✅ مناسب |
| `splash-rise` (۶ عنصر) | `index.css` | ورود اسپلش | ⚠️ **بدون تابع easing** | **باگ** — اصلاح شد |
| `splash-glass` | `index.css` | ورود کارت | hardcoded bezier | → توکن |
| `splash-mark` | `index.css` | ورود لوگو | hardcoded bezier | → توکن |
| `splash-spin` | `index.css` | بی‌نهایت | `linear` | ✅ مناسب |
| `splash-drift` (۲) | `index.css` | بی‌نهایت | `ease-in-out` | ✅ مناسب |
| `splash-grid` | `index.css` | بی‌نهایت | `linear` | ✅ مناسب |
| `splash-sheen` | `index.css` | بی‌نهایت | `ease-in-out` | ✅ مناسب |
| `route-orbit-*` (۴) | `index.css` | لودر مسیر | `linear` | ✅ مناسب |
| `route-transition-line` | `index.css` | بی‌نهایت | `linear` | ✅ مناسب |

> **تفکیک مهم:** فنر فیزیکی برای **تغییر حالت** است، نه برای حلقه‌های بی‌نهایت محیطی.
> تبدیل `splash-drift` یا `water-wave` به فنر، حرکت را مصنوعی و آزاردهنده می‌کرد؛
> این‌ها عمداً `linear`/`ease-in-out` باقی ماندند.

### ترنزیشن‌ها

| الگو | تعداد | حس فعلی | وضعیت |
|---|---|---|---|
| `duration-300` بدون easing | ۱۸ | پیش‌فرض مرورگر | → `ease-spring-smooth` |
| `transition: width` (نوار پیشرفت اسپلش) | ۱ | ⚠️ انیمیت `width` | **باگ کارایی** → `scaleX` |
| `transition: height` (آب‌نما) | ۱ | ⚠️ انیمیت `height` | **باگ کارایی** → `scaleY` |
| `transition: clip-path` (متن آب‌نما) | ۱ | bezier | → توکن (هماهنگ با آب) |
| `background 0.25s ease` (تعویض تم) | ۲ | `ease` | عمداً ساده بماند |

---

## فاز ۲ و ۳ — اصلاحات

### باگ‌های واقعی که پیدا و رفع شدند

**۱. ورودی‌های بدون easing (۶ عنصر)**
`splash-rise 0.7s 0.1s both` هیچ تابع easing نداشت و به `ease` پیش‌فرض مرورگر می‌افتاد.

**۲. انیمیت `width` در نوار پیشرفت اسپلش** — باعث reflow در هر فریم.
→ `transform: scaleX()` با `transform-origin: right center` (RTL-safe).

**۳. انیمیت `height` در آب‌نما** — layout thrash.
→ `transform: scaleY()`؛ موج به عنصر جدا (`water-tank__wave`) منتقل شد تا با `scaleY`
کشیده یا لهو نشود. ظاهر بصری **دقیقاً حفظ شد**.

**۴. `prefers-reduced-motion` ناقص** — فقط ۳ انیمیشن از ~۲۰ پوشش داده شده بود؛
۱۵ لودر `animate-spin` و درخشش دکمه بدون پوشش بودند.
→ یک بلوک سراسری واحد جایگزین سه بلوک پراکنده شد.

**۵. `will-change` مدیریت‌نشده** — اضافه شد فقط روی عناصری که واقعاً انیمیت می‌شوند
(نوار پیشرفت و سطح آب).

### جدول قبل/بعد

| المان | قبل | بعد | میکروتعامل اضافه‌شده |
|---|---|---|---|
| `splash-rise` (۶ عنصر) | `both` بدون easing | `var(--spring-gentle)` = `cubic-bezier(0.34,1.56,0.64,1)` | — |
| `splash-mark` | hardcoded bezier | `var(--spring-playful)` | — |
| `splash-glass` | hardcoded bezier | `var(--spring-smooth)` | — |
| `login-splash__fill` | `transition: width .16s` | `transform: scaleX()` + `var(--spring-instant)` | — |
| `water-tank__water` | `transition: height 1.1s` | `transform: scaleY()` + `var(--spring-gentle)` | موج به عنصر جدا |
| `tank-percent__clip` | `clip-path` 1.1s bezier | `var(--spring-gentle)` (هم‌زمان با آب) | — |
| `toast-in` | `.35s cubic-bezier(.16,1,.3,1)` | `460ms var(--spring-gentle)` — ورود از ۱۶px با overshoot | — |
| `Button` primary | `duration-300 ease-out` | `duration-[460ms] ease-spring-gentle` | **`.btn-magnetic`** (بالا آمدن فنری) + **`.btn-ripple`** (موج کلیک از مرکز) |
| `Card` | `duration-300` | `duration-[460ms] ease-spring-gentle` | — |
| `StatusPill` | `duration-200` | `duration-[320ms] ease-spring-playful` | — |
| `MessageBubble` | `duration-300` | `duration-[460ms] ease-spring-gentle` | — |
| `Input` / `Textarea` | `duration-300` | `duration-[320ms] ease-spring-smooth` | — |
| بج خوانده‌نشده (۲ فایل) | بدون انیمیشن ورود | `.pop-in` — `var(--spring-playful)` | ورود فنری با overshoot |
| آیکن `Sun`/`Moon` | تعویض ناگهانی | `.icon-settle` — `var(--spring-gentle)` | چرخش −۳۵° و مقیاس ۰.۷ با settle |
| `route-orbit-bead` | `ease-in-out` | `var(--spring-smooth)` | — |
| پوشش کاهش حرکت | ۳ بلوک پراکنده | ۱ بلوک سراسری | — |

**نتیجه:** ۰ `transition: width` · ۰ `transition: height` · ۱۸ کلاس با فنر · ۰ easing
hardcoded خارج از توکن‌ها.

---

## فاز ۴ — سیستم طراحی حرکت

همه توکن‌ها در `test/src/index.css` (بخش `MOTION TOKENS` در `:root`) و معادل‌های
`--ease-*` در `@theme inline` تعریف شده‌اند تا Tailwind به‌صورت خودکار
`ease-spring-*` بسازد.

| توکن | معادل تقریبی فنر | cubic-bezier | مدت | کاربرد |
|---|---|---|---|---|
| `--spring-instant` | `spring(520, 32)` | `cubic-bezier(0.16, 1, 0.3, 1)` | 180ms | حالت‌های سریع، فشردن دکمه |
| `--spring-smooth` | `spring(320, 24)` | `cubic-bezier(0.22, 1, 0.36, 1)` | 320ms | ورود فیلد، لیست، hover ساده |
| `--spring-gentle` | `spring(300, 18)` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 460ms | دکمه، کارت، آب‌نما، توست |
| `--spring-playful` | `spring(420, 14)` | `cubic-bezier(0.18, 1.25, 0.4, 1)` | 620ms | بج، آیکن تعویض تم |

### نحوه استفاده

```css
/* در CSS */
.my-element {
    transition: transform var(--spring-gentle-ms) var(--spring-gentle);
}
```

```tsx
// در Tailwind
<div className="transition-transform duration-[460ms] ease-spring-gentle" />
```

### تأخیرهای پلکانی

`--stagger-1` … `--stagger-5` (۴۰ms تا ۲۰۰ms) برای ورود پلکانی عناصر تعریف شده‌اند و
در اسپلش ورود (که از قبل پلکانی بود) به کار می‌روند.

---

## محدودیت‌ها و صادقانه‌ها

**۱. اسکرین‌شات و ویدیو موجود نیست.** هیچ ابزار مرورگر یا اسکرین‌شاتی در این محیط در
دسترس نبود، بنابراین ستون‌های «قبل/بعد» به‌جای تصویر، توصیف متنی و فرمول حرکت دارند.
تأیید بصری باید در مرورگر انجام شود.

**۲. دو انیمیشن عمداً فنر نشدند:**
- `login-splash` خروج: `clip-path 0.9s cubic-bezier(0.76, 0, 0.24, 1)` — این یک
  «پرده‌ای که بسته می‌شود» است و با ease تند بهتر خوانده می‌شود تا با فنر.
- حلقه‌های بی‌نهایت (`splash-drift`، `water-wave`، `splash-grid`، `splash-sheen`)
  — فنر برای حلقه‌ی بی‌پایان معنا ندارد.

**۳. ۱ SVG توکار در کل پروژه وجود دارد.** بقیه آیکن‌ها `lucide-react` هستند؛ مسیر
SVG آن‌ها قابل بازطراحی نبود و فقط نحوه‌ی حرکتشان تغییر کرد.

**۴. «مغناطیسی» واقعی پیاده نشد.** جذب دکمه به سمت مکان‌نما به JS نیاز دارد و طبق قید
«ترجیح CSS خالص»، به‌جای آن درخشش لبه + بالا آمدن فنری (`.btn-ripple` + `.btn-magnetic`)
پیاده شد.

**۵. تست فریم‌ریت انجام نشد.** دستگاه/مرورگر در دسترس نبود؛ بهینه‌سازی بر اساس
انیمیت‌نکردن `width`/`height`/`top`/`left` اعمال شده، ولی اندازه‌گیری واقعی
60fps انجام نشده است.

**۶. هیچ رفتار عملکردی تغییر نکرد.** انیمیشن‌هایی که معنی loading/success/error
می‌رسانند دست‌نخورده باقی ماندند.
