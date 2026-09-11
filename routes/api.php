<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
// routes/api.php
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\ShiftReportController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AdminController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // پنل ادمین — ثبت و مدیریت پشتیبان‌ها
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::post('/supports', [AdminController::class, 'storeSupport']);
        Route::get('/supports', [AdminController::class, 'supports']);
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

    Route::prefix('complaints')->group(function () {
        Route::middleware('role:support')->group(function () {
            Route::post('/', [ComplaintController::class, 'store']);
            Route::get('/my', [ComplaintController::class, 'myComplaints']);
        });
        Route::get('/', [ComplaintController::class, 'index']);
        Route::get('/latest', [ComplaintController::class, 'latest']);
        Route::get('/students', [ComplaintController::class, 'studentsWithComplaints']);
        Route::get('/{id}', [ComplaintController::class, 'show']);
        Route::put('/{id}', [ComplaintController::class, 'update']);
    });

    Route::prefix('resources')->group(function () {
        Route::get('/', [ResourceController::class, 'index']);
        Route::post('/', [ResourceController::class, 'store']);
        Route::get('/{id}', [ResourceController::class, 'show']);
        Route::put('/{id}', [ResourceController::class, 'update']);
        Route::delete('/{id}', [ResourceController::class, 'destroy']);
    });

    Route::prefix('faqs')->group(function () {
        Route::get('/', [FaqController::class, 'index']);
        Route::get('/categories', [FaqController::class, 'categories']);
        Route::post('/', [FaqController::class, 'store']);
        Route::get('/{id}', [FaqController::class, 'show']);
        Route::put('/{id}', [FaqController::class, 'update']);
        Route::delete('/{id}', [FaqController::class, 'destroy']);
    });

    Route::prefix('videos')->group(function () {
        Route::get('/', [VideoController::class, 'index']);
        Route::post('/', [VideoController::class, 'store']);
        Route::get('/{id}', [VideoController::class, 'show']);
        Route::put('/{id}', [VideoController::class, 'update']);
        Route::delete('/{id}', [VideoController::class, 'destroy']);
    });

    Route::prefix('shift-reports')->group(function () {
        Route::post('/', [ShiftReportController::class, 'store']);
        Route::get('/', [ShiftReportController::class, 'index']);
        Route::get('/my', [ShiftReportController::class, 'myReports']);
        Route::get('/pending', [ShiftReportController::class, 'pending']);
        Route::get('/{id}', [ShiftReportController::class, 'show']);
        Route::put('/{id}', [ShiftReportController::class, 'update']);
    });
});
