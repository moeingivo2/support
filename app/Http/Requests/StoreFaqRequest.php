<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFaqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'question' => 'required|string|max:500',
            'answer' => 'required|string',
            'category' => 'nullable|string|max:100',
            // فقط سوپر ادمین این را تعیین می‌کند؛ برای بقیه از کانال خودِ
            // کاربر پر می‌شود و مقدار ارسالی نادیده گرفته می‌شود.
            'channel' => 'nullable|in:web,ai',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'question.required' => 'سوال الزامی است',
            'answer.required' => 'پاسخ الزامی است',
        ];
    }
}
