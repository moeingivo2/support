<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => [
                'required',
                'string',
                'min:10',
                'max:20',
                Rule::unique('users', 'phone')->ignore($this->route('support')),
            ],
            'password' => ['nullable', 'string', 'min:8', 'max:255', 'not_regex:/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'نام پشتیبان الزامی است.',
            'phone.required' => 'شماره تلفن الزامی است.',
            'phone.unique' => 'این شماره تلفن قبلاً ثبت شده است.',
            'phone.min' => 'شماره تلفن معتبر نیست.',
            'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
            'password.not_regex' => 'لطفاً کیبوردتان را انگلیسی کنید.',
        ];
    }
}
