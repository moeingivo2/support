<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // چون تو کنترلر با میدلور چک می‌کنیم
    }

    public function rules(): array
    {
        // کانال شیفت از نوع پشتیبانی کاربر (support_type) تعیین می‌شود؛ ورودی لازم نیست
        return [];
    }
}