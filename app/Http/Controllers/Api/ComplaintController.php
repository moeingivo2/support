<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreComplaintRequest;
use App\Models\Complaint;
use App\Models\Mentor;
use App\Models\Student;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    // ثبت نارضایتی جدید
    public function store(StoreComplaintRequest $request)
    {
        // پیدا کردن یا ساختن دانشجو — با student_code اگر داشت، وگرنه با نام
        if ($request->student_code) {
            $student = Student::firstOrCreate(
                ['student_code' => $request->student_code],
                [
                    'name' => $request->student_name,
                    'phone' => $request->student_phone,
                ]
            );
        } else {
            $student = Student::firstOrCreate(
                ['name' => $request->student_name],
                ['phone' => $request->student_phone]
            );
        }

        // پیدا کردن یا ساختن منتور
        $mentor = Mentor::firstOrCreate(
            ['name' => $request->mentor_name],
            ['phone' => $request->mentor_phone]
        );

        $complaint = Complaint::create([
            'student_id' => $student->id,
            'mentor_id' => $mentor->id,
            'support_id' => $request->user()->id,
            'shift_id' => $request->shift_id,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => 'open',
        ]);

        $complaint->load(['student', 'mentor', 'support']);

        return response()->json([
            'message' => 'نارضایتی با موفقیت ثبت شد',
            'complaint' => $complaint,
        ], 201);
    }

    // لیست نارضایتی‌ها — ادمین همه را می‌بیند، ساپورت فقط موارد ثبت‌شده خودش را
    public function index(Request $request)
    {
        $query = Complaint::with(['student', 'mentor', 'support']);

        // ساپورت فقط نارضایتی‌هایی که خودش ثبت کرده
        if (!$request->user()->isAdmin()) {
            $query->where('support_id', $request->user()->id);
        }

        // فیلتر بر اساس وضعیت
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // فیلتر بر اساس اولویت
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        // فیلترهای ادمین: منتور یا پشتیبان ثبت‌کننده
        if ($request->user()->isAdmin() && $request->filled('mentor_id')) {
            $query->where('mentor_id', $request->input('mentor_id'));
        }

        if ($request->user()->isAdmin() && $request->filled('support_id')) {
            $query->where('support_id', $request->input('support_id'));
        }

        $complaints = $query->orderBy('created_at', 'desc')->paginate(min($request->input('per_page', 20), 100));

        return response()->json($complaints);
    }

    // نارضایتی‌های ثبت‌شده توسط خود پشتیبان
    public function myComplaints(Request $request)
    {
        $complaints = Complaint::with(['student', 'mentor'])
            ->where('support_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(min($request->input('per_page', 20), 100));

        return response()->json($complaints);
    }

    // آخرین نارضایتی‌ها (برای کارت داشبورد)
    public function latest(Request $request)
    {
        $limit = $request->get('limit', 5);

        $complaints = Complaint::with(['student', 'mentor', 'support'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json($complaints);
    }

    // آپدیت وضعیت نارضایتی
    public function update(Request $request, $id)
    {
        $complaint = Complaint::findOrFail($id);

        $request->validate([
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $complaint->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'message' => 'وضعیت با موفقیت به‌روزرسانی شد',
            'complaint' => $complaint,
        ]);
    }

    // نمایش جزئیات یک نارضایتی
    public function show($id)
    {
        $complaint = Complaint::with(['student', 'mentor', 'support', 'shift'])
            ->findOrFail($id);

        return response()->json($complaint);
    }

    // لیست دانشجویان دارای نارضایتی (برای Sidebar)
    public function studentsWithComplaints()
    {
        $students = Student::whereHas('complaints')
            ->withCount('complaints')
            ->with(['complaints' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->get();

        return response()->json($students);
    }
}