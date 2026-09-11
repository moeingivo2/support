<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterSupportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // چون این یک لینک عمومیه، نیازی به لاگین قبلی نیست
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|min:10|unique:users,phone',
            'password' => 'required|string|min:8|confirmed',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'نام و نام خانوادگی الزامی است',
            'phone.required' => 'شماره تلفن الزامی است',
            'phone.unique' => 'این شماره تلفن قبلاً ثبت شده است',
            'password.required' => 'رمز عبور الزامی است',
            'password.min' => 'رمز عبور باید حداقل ۶ کاراکتر باشد',
            'password.confirmed' => 'تکرار رمز عبور مطابقت ندارد',
        ];
    }
}