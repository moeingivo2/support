<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:session_source,required_file,other',
            'file_url' => 'required_without:file|nullable|url', // یا لینک مستقیم برمی‌داره
            'file' => 'required_without:file_url|nullable|file|max:51200', // یا فایل مستقیم آپلود میشه (تا ۵۰ مگ)
            'category' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'عنوان فایل الزامی است',
            'type.required' => 'نوع فایل الزامی است',
            'file_url.required_without' => 'وارد کردن لینک فایل یا آپلود فایل الزامی است',
            'file_url.url' => 'لینک وارد شده معتبر نیست',
            'file.max' => 'حجم فایل نباید بیشتر از ۵۰ مگابایت باشد',
        ];
    }
}