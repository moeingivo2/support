<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MentorFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MentorFeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mentor_name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $feedback = MentorFeedback::create([
            ...$data,
            'student_user_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'نارضایتی از منتور ثبت شد.', 'data' => $feedback->load('student:id,name,phone')], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $feedback = MentorFeedback::query()
            ->with('student:id,name,phone')
            ->orderByDesc('created_at')
            ->paginate(min($request->integer('per_page', 25), 100));

        return response()->json($feedback);
    }

    public function update(Request $request, MentorFeedback $feedback): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:open,in_progress,resolved']]);
        $feedback->update($data);

        return response()->json(['message' => 'وضعیت نارضایتی به‌روز شد.', 'data' => $feedback->fresh('student:id,name,phone')]);
    }
}
