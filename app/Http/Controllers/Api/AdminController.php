<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminRegisterSupportRequest;
use App\Http\Requests\AdminRegisterTraineeRequest;
use App\Http\Requests\StoreAdminRequest;
use App\Http\Requests\UpdateAdminRequest;
use App\Http\Requests\UpdateSupportRequest;
use App\Models\User;
use App\Support\SupportRanking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function storeSupport(AdminRegisterSupportRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name')->toString(),
            'phone' => $request->string('phone')->toString(),
            'password' => Hash::make($request->string('password')->toString()),
            'role' => 'support',
            'support_type' => $request->string('support_type')->toString(),
        ]);

        return response()->json([
            'message' => 'پشتیبان با موفقیت ثبت شد',
            'user' => $user,
        ], 201);
    }

    public function supports(Request $request): JsonResponse
    {
        $role = $request->input('role');

        $supports = User::query()
            // بدون ‎role‎ یعنی «هر کسی که کار پشتیبانی می‌کند»: هم
            // پشتیبان و هم ناظر. قبلاً فقط ‎support‎ برمی‌گشت، برای همین
            // ناظرها در فهرست انتخابِ گزارش اکسل غایب بودند.
            ->when(
                in_array($role, ['account_observer', 'support'], true),
                fn ($query) => $query->where('role', $role),
                fn ($query) => $query->whereIn('role', SupportRanking::RANKED_ROLES),
            )
            ->when($request->filled('support_type'), function ($query) use ($request): void {
                $query->where('support_type', $request->input('support_type'));
            })
            ->select(['id', 'name', 'phone', 'role', 'support_type', 'created_at'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $supports]);
    }

    public function updateSupport(UpdateSupportRequest $request, User $support): JsonResponse
    {
        abort_unless($support->isSupport() || $support->role === 'account_observer', 404);

        $data = $request->safe()->only(['name', 'phone']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->string('password')->toString());
        }

        $support->update($data);

        if ($request->filled('password')) {
            $support->tokens()->delete();
        }

        return response()->json([
            'message' => 'مشخصات پشتیبان با موفقیت ویرایش شد.',
            'user' => $support->fresh(),
        ]);
    }

    public function destroySupport(User $support): JsonResponse
    {
        abort_unless($support->isSupport() || $support->role === 'account_observer', 404);

        if ($support->shifts()->where('status', 'active')->exists()) {
            return response()->json([
                'message' => 'پشتیبان شیفت فعال دارد؛ ابتدا شیفت او را ببندید.',
            ], 422);
        }

        $support->tokens()->delete();
        $support->delete();

        return response()->json([
            'message' => 'پشتیبان با موفقیت حذف شد.',
        ]);
    }

    /**
     * ثبت کارآموز — پشتیبانِ فقط‌مشاهده که فقط متن گفتگوها را می‌بیند.
     * کارآموز نوع پشتیبانی ندارد و وارد هیچ کانال پاسخ‌گویی نمی‌شود.
     */
    public function storeTrainee(AdminRegisterTraineeRequest $request): JsonResponse
    {
        $trainee = User::create([
            'name' => $request->string('name')->toString(),
            'phone' => $request->string('phone')->toString(),
            'password' => Hash::make($request->string('password')->toString()),
            'role' => 'trainee',
            'support_type' => null,
        ]);

        return response()->json([
            'message' => 'کارآموز با موفقیت ثبت شد.',
            'user' => $trainee,
        ], 201);
    }

    public function trainees(Request $request): JsonResponse
    {
        $trainees = User::query()
            ->where('role', 'trainee')
            ->select(['id', 'name', 'phone', 'role', 'created_at'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $trainees]);
    }

    public function destroyTrainee(User $trainee): JsonResponse
    {
        abort_unless($trainee->isTrainee(), 404);

        $trainee->tokens()->delete();
        $trainee->delete();

        return response()->json([
            'message' => 'کارآموز با موفقیت حذف شد.',
        ]);
    }

    public function grantAccountObserver(Request $request, User $support): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_unless($support->isSupport(), 404);

        if ($support->shifts()->where('status', 'active')->exists()) {
            return response()->json(['message' => 'پشتیبان شیفت فعال دارد؛ ابتدا شیفت او را ببندید.'], 422);
        }

        $support->tokens()->delete();
        $support->forceFill(['role' => 'account_observer'])->save();

        return response()->json(['message' => 'نقش ناظر اکانت برای این پشتیبان فعال شد.', 'user' => $support->fresh()]);
    }

    public function revokeAccountObserver(Request $request, User $support): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_unless($support->role === 'account_observer', 404);

        if ($support->shifts()->where('status', 'active')->exists()) {
            return response()->json(['message' => 'پشتیبان شیفت فعال دارد؛ ابتدا شیفت او را ببندید.'], 422);
        }

        $support->tokens()->delete();
        $support->forceFill(['role' => 'support', 'observer_id' => null])->save();

        return response()->json(['message' => 'نقش ناظر اکانت حذف شد.', 'user' => $support->fresh()]);
    }

    public function admins(): JsonResponse
    {
        $admins = User::query()
            ->where('role', 'admin')
            ->select(['id', 'name', 'phone', 'role', 'created_at', 'updated_at'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $admins]);
    }

    public function storeAdmin(StoreAdminRequest $request): JsonResponse
    {
        $admin = User::create([
            ...$request->safe()->only(['name', 'phone']),
            'password' => Hash::make($request->string('password')->toString()),
            'role' => 'admin',
            'support_type' => null,
        ]);

        return response()->json([
            'message' => 'سوپر ادمین با موفقیت ایجاد شد.',
            'user' => $admin,
        ], 201);
    }

    public function updateAdmin(UpdateAdminRequest $request, User $admin): JsonResponse
    {
        abort_unless($admin->isAdmin(), 404);

        $data = $request->safe()->only(['name', 'phone']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->string('password')->toString());
        }

        $admin->update($data);

        if ($request->filled('password')) {
            $admin->tokens()->delete();
        }

        return response()->json([
            'message' => 'مشخصات سوپر ادمین با موفقیت ویرایش شد.',
            'user' => $admin->fresh(),
        ]);
    }

    public function destroyAdmin(Request $request, User $admin): JsonResponse
    {
        abort_unless($admin->isAdmin(), 404);

        if ($admin->id === $request->user()->id) {
            return response()->json([
                'message' => 'امکان حذف حساب سوپر ادمین فعلی وجود ندارد.',
            ], 422);
        }

        if (User::query()->where('role', 'admin')->count() <= 1) {
            return response()->json([
                'message' => 'حداقل یک سوپر ادمین باید در سیستم باقی بماند.',
            ], 422);
        }

        $admin->tokens()->delete();
        $admin->delete();

        return response()->json([
            'message' => 'سوپر ادمین با موفقیت حذف شد.',
        ]);
    }
}
