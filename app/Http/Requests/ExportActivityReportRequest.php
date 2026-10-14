<?php

namespace App\Http\Requests;

use App\Support\SupportRanking;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExportActivityReportRequest extends FormRequest
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
            'user_id' => [
                'required',
                'integer',
                // ناظر هم شیفت می‌دهد، پس گزارش فعالیت او هم معتبر است.
                Rule::exists('users', 'id')->whereIn('role', SupportRanking::RANKED_ROLES),
            ],
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['from', 'to'])) {
                    return;
                }

                $from = date('Y-m-d', strtotime((string) $this->input('from')));
                $to = date('Y-m-d', strtotime((string) $this->input('to')));

                if ((strtotime($to) - strtotime($from)) / 86400 > 366) {
                    $validator->errors()->add('to', 'بازه زمانی حداکثر ۳۶۶ روز باشد.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'انتخاب پشتیبان الزامی است.',
            'user_id.exists' => 'پشتیبان انتخاب‌شده یافت نشد.',
            'from.required' => 'تاریخ شروع بازه الزامی است.',
            'from.date_format' => 'تاریخ شروع بازه معتبر نیست.',
            'to.required' => 'تاریخ پایان بازه الزامی است.',
            'to.date_format' => 'تاریخ پایان بازه معتبر نیست.',
            'to.after_or_equal' => 'تاریخ پایان باید بعد از تاریخ شروع باشد.',
        ];
    }

    public function attributes(): array
    {
        return [
            'user_id' => 'پشتیبان',
            'from' => 'تاریخ شروع',
            'to' => 'تاریخ پایان',
        ];
    }
}
