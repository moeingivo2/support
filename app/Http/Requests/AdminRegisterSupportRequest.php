<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminRegisterSupportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|min:10|unique:users,phone',
            'password' => 'required|string|min:8',
            'support_type' => ['required', Rule::in(['web', 'ai'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'نام و نام خانوادگی الزامی است',
            'phone.required' => 'شماره تلفن الزامی است',
            'phone.unique' => 'این شماره تلفن قبلاً ثبت شده است',
            'phone.min' => 'شماره تلفن معتبر نیست',
            'password.required' => 'رمز عبور الزامی است',
            'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد',
            'support_type.required' => 'نوع پشتیبانی الزامی است',
            'support_type.in' => 'نوع پشتیبانی باید وب یا هوش مصنوعی باشد',
        ];
    }
}
