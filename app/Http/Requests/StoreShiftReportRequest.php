<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreShiftReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => 'required|exists:shifts,id',
            'responded_students_count' => 'required|integer|min:0',
            'unsatisfied_students_count' => 'required|integer|min:0',
            'desk_requests_count' => 'required|integer|min:0',
            'calls_count' => 'required|integer|min:0',
            'extra_notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'shift_id.required' => 'شناسه شیفت الزامی است',
            'shift_id.exists' => 'شیفت مورد نظر یافت نشد',
            'responded_students_count.required' => 'تعداد دانشجویان پاسخ‌داده‌شده الزامی است',
            'unsatisfied_students_count.required' => 'تعداد دانشجویان ناراضی الزامی است',
            'desk_requests_count.required' => 'تعداد درخواست‌های Desk الزامی است',
            'calls_count.required' => 'تعداد تماس‌ها الزامی است',
        ];
    }
}