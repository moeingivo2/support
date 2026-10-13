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
use App\Http\Controllers\Api\MentorFeedbackController;
use App\Http\Controllers\Api\PasswordResetRequestController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\ShiftReportController;
use App\Http\Controllers\Api\ShiftScheduleController;
use App\Http\Controllers\Api\StudentAuthController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\StudentUpgradeRequestController;
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
    // داشبورد آمار فقط برای نقش‌هایی است که در منو آن را می‌بینند؛ کارآموز و
    // ناظر فقط‌خواندنی داشبوردی ندارند.
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('role:admin,support,account_observer');

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
        Route::put('/supports/{support}/account-observer', [AdminController::class, 'grantAccountObserver']);
        Route::delete('/supports/{support}/account-observer', [AdminController::class, 'revokeAccountObserver']);

        // کارآموز — پشتیبانِ فقط‌مشاهده؛ سوپر ادمین حسابش را می‌سازد
        Route::get('/trainees', [AdminController::class, 'trainees']);
        Route::post('/trainees', [AdminController::class, 'storeTrainee']);
        Route::delete('/trainees/{trainee}', [AdminController::class, 'destroyTrainee']);
        Route::get('/activity-report/export', [ActivityReportController::class, 'export'])->middleware('throttle:exports');
        Route::get('/admins', [AdminController::class, 'admins']);
        Route::post('/admins', [AdminController::class, 'storeAdmin']);
        Route::put('/admins/{admin}', [AdminController::class, 'updateAdmin']);
        Route::delete('/admins/{admin}', [AdminController::class, 'destroyAdmin']);
    });

    Route::middleware('role:account_observer')->prefix('observer')->group(function (): void {
        Route::post('/shift-schedules', [ShiftScheduleController::class, 'store']);
        Route::post('/shift-schedules/rotation/preview', [ShiftScheduleController::class, 'rotationPreview']);
        Route::post('/shift-schedules/rotation', [ShiftScheduleController::class, 'rotationStore']);
        Route::get('/shift-schedules', [ShiftScheduleController::class, 'index']);
        Route::get('/team-supervision', [SupportChatController::class, 'teamSupervision']);
    });

    Route::get('/shift-schedule/current', [ShiftScheduleController::class, 'current'])->middleware('role:support,account_observer');
    Route::get('/shift-schedule/notifications', [ShiftScheduleController::class, 'notification'])->middleware('role:support,account_observer');
    Route::get('/mentor-feedback', [MentorFeedbackController::class, 'index'])->middleware('role:support,observer,account_observer,admin');
    Route::post('/mentor-feedback', [MentorFeedbackController::class, 'store'])->middleware('role:student');
    Route::put('/mentor-feedback/{feedback}', [MentorFeedbackController::class, 'update'])->middleware('role:support,observer,account_observer,admin');

    // رتبه‌بندی پشتیبان‌ها — فقط سوپر ادمین
    Route::middleware('role:admin')->prefix('admin/support-ranking')->group(function () {
        Route::get('/', [SupportRankingController::class, 'index']);
        Route::get('/export', [SupportRankingController::class, 'export'])->middleware('throttle:exports');
        Route::get('/{agent}', [SupportRankingController::class, 'show']);
    });

    // شیفت — مخصوص پشتیبان‌ها (ادمین شیفت ندارد)
    Route::middleware('role:support,account_observer')->prefix('shifts')->group(function () {
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
        Route::middleware('role:support,account_observer')->group(function () {
            Route::post('/', [ComplaintController::class, 'store']);
            Route::get('/my', [ComplaintController::class, 'myComplaints']);
        });

        Route::middleware('role:admin,support,account_observer')->group(function () {
            Route::get('/', [ComplaintController::class, 'index']);
            Route::get('/latest', [ComplaintController::class, 'latest']);
            Route::get('/students', [ComplaintController::class, 'studentsWithComplaints']);
            Route::get('/{id}', [ComplaintController::class, 'show']);
            Route::put('/{id}', [ComplaintController::class, 'update']);
        });
    });

    // منابع پنل — محتوای داخلی است و نباید در دسترس دانشجو یا ناظر باشد.
    Route::middleware('role:admin,support,account_observer')->prefix('resources')->group(function () {
        Route::get('/', [ResourceController::class, 'index']);
        Route::post('/', [ResourceController::class, 'store']);
        Route::get('/{id}', [ResourceController::class, 'show']);
        Route::put('/{id}', [ResourceController::class, 'update']);
        Route::delete('/{id}', [ResourceController::class, 'destroy']);
    });

    Route::middleware('role:admin,support,account_observer')->prefix('faqs')->group(function () {
        Route::get('/', [FaqController::class, 'index']);
        Route::post('/', [FaqController::class, 'store']);
        Route::get('/{id}', [FaqController::class, 'show']);
        Route::put('/{id}', [FaqController::class, 'update']);
        Route::delete('/{id}', [FaqController::class, 'destroy']);
    });

    Route::middleware('role:admin,support,account_observer')->prefix('videos')->group(function () {
        Route::get('/', [VideoController::class, 'index']);
        Route::post('/', [VideoController::class, 'store']);
        Route::get('/{id}', [VideoController::class, 'show']);
        Route::put('/{id}', [VideoController::class, 'update']);
        Route::delete('/{id}', [VideoController::class, 'destroy']);
    });

    // درخواست‌های ارتقا — دانشجو چند دوره را درخواست می‌دهد و پشتیبان
    // صحت‌سنجی و تأیید/رد می‌کند. تأیید فقط سهمیه چت را افزایش می‌دهد.
    Route::prefix('upgrade-requests')->group(function () {
        Route::middleware('role:support,account_observer,admin')->group(function () {
            Route::get('/', [StudentUpgradeRequestController::class, 'index']);
            Route::get('/{upgrade}', [StudentUpgradeRequestController::class, 'show']);
        });

        Route::middleware('role:support,account_observer')->group(function () {
            Route::post('/{upgrade}/approve', [StudentUpgradeRequestController::class, 'approve']);
            Route::post('/{upgrade}/reject', [StudentUpgradeRequestController::class, 'reject']);
        });
    });

    // گزارش‌های خودکار پایان شیفت — فقط سوپر ادمین و ناظرها؛ پشتیبان‌ها
    // دیگر گزارشی پر نمی‌کنند و به این صفحه دسترسی ندارند.
    Route::middleware('role:admin,observer,account_observer')->prefix('shift-reports')->group(function () {
        Route::get('/', [ShiftReportController::class, 'index']);
        Route::get('/{id}', [ShiftReportController::class, 'show']);
    });

    // حساب دانشجو — دوره، جلسات، منتور و سهمیه چت
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/profile', [StudentProfileController::class, 'show']);
        Route::post('/upgrade', [StudentProfileController::class, 'upgrade']);
        Route::get('/session-sources', [ResourceController::class, 'studentSessionSources']);
        Route::get('/faqs', [FaqController::class, 'studentIndex']);
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
    // ناظر و کارآموز فقط‌خواندنی هستند و سوپر ادمین طبق سیاست به متن گفتگو دسترسی ندارد.
    Route::middleware('role:support,observer,account_observer,trainee')->prefix('support/conversations')->group(function () {
        Route::get('/managed-supports', [SupportChatController::class, 'assignedSupports'])->middleware('role:account_observer');
        Route::post('/managed-supports/{support}/impersonate', [SupportChatController::class, 'impersonate'])->middleware('role:account_observer');
        Route::get('/', [SupportChatController::class, 'index']);
        Route::get('/notifications', [SupportChatController::class, 'notifications']);

        // فهرست دانشجویان با تعداد گفتگو؛ پشتیبان اول نفر را انتخاب
        // می‌کند و بعد فقط گفتگوهای همان دانشجو را می‌بیند.
        Route::get('/students', [SupportChatController::class, 'students']);

        Route::get('/{conversation}', [SupportChatController::class, 'show']);

        // پاسخ دادن و بستن گفتگو مختص پشتیبان است؛ ناظر اجازه تغییر ندارد
        Route::middleware('role:support,account_observer')->group(function () {
            Route::post('/{conversation}/messages', [SupportChatController::class, 'storeMessage']);
            Route::post('/{conversation}/close', [SupportChatController::class, 'close']);
        });
    });
});
