<?php

use App\Http\Controllers\Api\ActivityReportController;
// routes/api.php
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\PasswordResetRequestController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\ShiftReportController;
use App\Http\Controllers\Api\StudentAuthController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\SupportChatController;
use App\Http\Controllers\Api\SupportRankingController;
use App\Http\Controllers\Api\VideoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// ورود دانشجو با شماره موبایل — عمومی
Route::post('/login/student', [StudentAuthController::class, 'login'])->middleware('throttle:auth');

// ثبت‌نام دانشجو — عمومی، همراه با انتخاب دوره، رشته و جلسات
Route::post('/register/student', [StudentAuthController::class, 'register'])->middleware('throttle:auth');

// درخواست بازیابی رمز عبور — عمومی
Route::post('/password/forgot', [PasswordResetRequestController::class, 'store'])
    ->middleware('throttle:auth');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // پیوست‌ها با نوع امن و به‌صورت دانلود سرو می‌شوند تا کد اجرا نشود
    Route::get('/attachments/{path}', [AttachmentController::class, 'show'])
        ->where('path', '.*')
        ->name('attachments.show');

    // پنل ادمین — ثبت و مدیریت پشتیبان‌ها
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::post('/supports', [AdminController::class, 'storeSupport']);
        Route::get('/supports', [AdminController::class, 'supports']);
        Route::put('/supports/{support}', [AdminController::class, 'updateSupport']);
        Route::delete('/supports/{support}', [AdminController::class, 'destroySupport']);
        Route::get('/activity-report/export', [ActivityReportController::class, 'export'])->middleware('throttle:exports');
        Route::get('/admins', [AdminController::class, 'admins']);
        Route::post('/admins', [AdminController::class, 'storeAdmin']);
        Route::put('/admins/{admin}', [AdminController::class, 'updateAdmin']);
        Route::delete('/admins/{admin}', [AdminController::class, 'destroyAdmin']);
    });

    // رتبه‌بندی پشتیبان‌ها — فقط سوپر ادمین
    Route::middleware('role:admin')->prefix('admin/support-ranking')->group(function () {
        Route::get('/', [SupportRankingController::class, 'index']);
        Route::get('/export', [SupportRankingController::class, 'export'])->middleware('throttle:exports');
        Route::get('/{agent}', [SupportRankingController::class, 'show']);
    });

    // شیفت — مخصوص پشتیبان‌ها (ادمین شیفت ندارد)
    Route::middleware('role:support')->prefix('shifts')->group(function () {
        Route::post('/start', [ShiftController::class, 'start']);
        Route::post('/{id}/end', [ShiftController::class, 'end']);
        Route::get('/current', [ShiftController::class, 'current']);
        Route::get('/my', [ShiftController::class, 'myShifts']);
    });

    // پشتیبان‌های فعال — فقط برای ادمین (نظارت)
    Route::get('/shifts/active', [ShiftController::class, 'active'])->middleware('role:admin');

    // شکایات — فقط پشتیبان و ادمین. دسترسی دانشجو یا ناظر به شکایات
    // دیگران افشای اطلاعات شخصی بود.
    Route::prefix('complaints')->group(function () {
        Route::middleware('role:support')->group(function () {
            Route::post('/', [ComplaintController::class, 'store']);
            Route::get('/my', [ComplaintController::class, 'myComplaints']);
        });

        Route::middleware('role:admin,support')->group(function () {
            Route::get('/', [ComplaintController::class, 'index']);
            Route::get('/latest', [ComplaintController::class, 'latest']);
            Route::get('/students', [ComplaintController::class, 'studentsWithComplaints']);
            Route::get('/{id}', [ComplaintController::class, 'show']);
            Route::put('/{id}', [ComplaintController::class, 'update']);
        });
    });

    // منابع پنل — محتوای داخلی است و نباید در دسترس دانشجو یا ناظر باشد.
    Route::middleware('role:admin,support')->prefix('resources')->group(function () {
        Route::get('/', [ResourceController::class, 'index']);
        Route::post('/', [ResourceController::class, 'store']);
        Route::get('/{id}', [ResourceController::class, 'show']);
        Route::put('/{id}', [ResourceController::class, 'update']);
        Route::delete('/{id}', [ResourceController::class, 'destroy']);
    });

    Route::middleware('role:admin,support')->prefix('faqs')->group(function () {
        Route::get('/', [FaqController::class, 'index']);
        Route::get('/categories', [FaqController::class, 'categories']);
        Route::post('/', [FaqController::class, 'store']);
        Route::get('/{id}', [FaqController::class, 'show']);
        Route::put('/{id}', [FaqController::class, 'update']);
        Route::delete('/{id}', [FaqController::class, 'destroy']);
    });

    Route::middleware('role:admin,support')->prefix('videos')->group(function () {
        Route::get('/', [VideoController::class, 'index']);
        Route::post('/', [VideoController::class, 'store']);
        Route::get('/{id}', [VideoController::class, 'show']);
        Route::put('/{id}', [VideoController::class, 'update']);
        Route::delete('/{id}', [VideoController::class, 'destroy']);
    });

    // گزارش شیفت — ثبت و «گزارش‌های من» مختص پشتیبان است و فهرست
    // کامل در اختیار ادمین قرار می‌گیرد.
    Route::prefix('shift-reports')->group(function () {
        Route::middleware('role:support')->group(function () {
            Route::post('/', [ShiftReportController::class, 'store']);
            Route::get('/my', [ShiftReportController::class, 'myReports']);
        });

        Route::middleware('role:admin,support')->group(function () {
            Route::get('/', [ShiftReportController::class, 'index']);
            Route::get('/pending', [ShiftReportController::class, 'pending']);
            Route::get('/{id}', [ShiftReportController::class, 'show']);
            Route::put('/{id}', [ShiftReportController::class, 'update']);
        });
    });

    // حساب دانشجو — دوره، جلسات، منتور و سهمیه چت
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/profile', [StudentProfileController::class, 'show']);
        Route::post('/upgrade', [StudentProfileController::class, 'upgrade']);
    });

    // گفتگوی دانشجو با پشتیبان
    Route::middleware('role:student')->prefix('conversations')->group(function () {
        Route::get('/', [ConversationController::class, 'index']);
        Route::post('/', [ConversationController::class, 'store']);
        Route::get('/{conversation}', [ConversationController::class, 'show']);
        Route::post('/{conversation}/messages', [ConversationController::class, 'storeMessage']);
        // بستن توسط دانشجو با دروازه‌ی امتیاز الزامی
        Route::post('/{conversation}/close', [ConversationController::class, 'close']);
        // امتیازدهی پس از بستن توسط پشتیبان
        Route::post('/{conversation}/rate', [ConversationController::class, 'rate']);
    });

    // صندوق ورودی مشترک — پشتیبان و ناظر.
    // ناظر فقط‌خواندنی است و سوپر ادمین طبق سیاست به متن گفتگو دسترسی ندارد.
    Route::middleware('role:support,observer')->prefix('support/conversations')->group(function () {
        Route::get('/', [SupportChatController::class, 'index']);
        Route::get('/notifications', [SupportChatController::class, 'notifications']);

        Route::get('/{conversation}', [SupportChatController::class, 'show']);

        // پاسخ دادن و بستن گفتگو مختص پشتیبان است؛ ناظر اجازه تغییر ندارد
        Route::middleware('role:support')->group(function () {
            Route::post('/{conversation}/messages', [SupportChatController::class, 'storeMessage']);
            Route::post('/{conversation}/close', [SupportChatController::class, 'close']);
        });
    });
});
