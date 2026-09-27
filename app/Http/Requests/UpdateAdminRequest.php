<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminRequest extends FormRequest
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
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->route('admin')),
            ],
            'phone' => [
                'required',
                'string',
                'min:10',
                'max:20',
                Rule::unique('users', 'phone')->ignore($this->route('admin')),
            ],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'نام سوپر ادمین الزامی است.',
            'email.required' => 'ایمیل الزامی است.',
            'email.email' => 'ایمیل معتبر وارد کنید.',
            'email.unique' => 'این ایمیل قبلاً ثبت شده است.',
            'phone.required' => 'شماره تلفن الزامی است.',
            'phone.unique' => 'این شماره تلفن قبلاً ثبت شده است.',
            'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
        ];
    }
}
