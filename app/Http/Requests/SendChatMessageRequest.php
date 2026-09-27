<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SendChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:10000'],
            'language' => ['nullable', 'string', 'max:40'],
            'duration_seconds' => ['nullable', 'integer', 'min:1', 'max:600'],
            'attachment' => [
                'nullable',
                'file',
                'max:'.config('aiosupport.attachments.max_kilobytes'),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->hasFile('attachment')) {
                return;
            }

            if (trim((string) $this->input('body')) === '') {
                $validator->errors()->add('body', 'متن پیام یا فایل پیوست الزامی است.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'body' => 'متن پیام',
            'language' => 'زبان کد',
            'duration_seconds' => 'مدت ضبط',
            'attachment' => 'پیوست',
        ];
    }
}
