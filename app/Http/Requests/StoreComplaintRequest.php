<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'student_name' => 'required|string|max:255',
            'student_code' => 'nullable|string|max:50',
            'student_phone' => 'nullable|string|max:20',

            'mentor_name' => 'required|string|max:255',
            'mentor_phone' => 'nullable|string|max:20',

            'description' => 'required|string|min:10',
            'priority' => 'required|in:high,normal,low',
            'shift_id' => 'nullable|exists:shifts,id',
        ];
    }

    public function messages(): array
    {
        return [
            'student_name.required' => 'نام دانشجو الزامی است',
            'mentor_name.required' => 'نام منتور الزامی است',
            'description.required' => 'توضیحات الزامی است',
            'description.min' => 'توضیحات باید حداقل ۱۰ کاراکتر باشد',
            'priority.required' => 'اولویت الزامی است',
        ];
    }
}