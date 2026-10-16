<?php

namespace App\Http\Requests;

use App\Models\Conversation;
use App\Support\ComplaintType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * اعتبارسنجی ثبت نارضایتی توسط دانشجو.
 *
 * فیلدهای هر نوع فرق می‌کند، پس قاعده‌ها هم با `type` تغییر می‌کنند:
 * برای «منتور» نام و نام خانوادگی، برای «دوره» نام دوره لازم است و برای
 * «پشتیبانی» هیچ‌کدام. اگر کاربر فیلدهای اضافه را بفرستد پاک می‌شوند تا
 * داده‌ی ناسازگار در دیتابیس ننشیند.
 */
class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        // فقط دانشجو؛ میدلورِ مسیر هم همین را تضمین می‌کند.
        return $this->user()?->isStudent() === true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(ComplaintType::class)],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'mentor_first_name' => ['nullable', 'string', 'max:120'],
            'mentor_last_name' => ['nullable', 'string', 'max:120'],
            'course_name' => ['nullable', 'string', 'max:160'],

            // اختیاری: اگر نارضایتی از داخل یک گفتگو ثبت شده باشد. مالکیت
            // گفتگو در `after()` بررسی می‌شود.
            'conversation_id' => ['nullable', 'integer', 'exists:conversations,id'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['type', 'mentor_first_name', 'mentor_last_name', 'course_name'])) {
                    return;
                }

                $type = ComplaintType::tryFrom((string) $this->input('type'));

                if ($type === null) {
                    return;
                }

                if ($type->needsMentorName()) {
                    foreach (['mentor_first_name', 'mentor_last_name'] as $field) {
                        if (blank($this->input($field))) {
                            $validator->errors()->add($field, 'برای نارضایتی از منتور، نام و نام خانوادگی الزامی است.');
                        }
                    }

                    return;
                }

                if ($type->needsCourseName() && blank($this->input('course_name'))) {
                    $validator->errors()->add('course_name', 'برای نارضایتی از دوره، نام دوره الزامی است.');
                }
            },

            function (Validator $validator): void {
                $conversationId = $this->input('conversation_id');

                if ($conversationId === null) {
                    return;
                }

                // دانشجو نباید بتواند نارضایتی را به گفتگوی کس دیگری بچسباند.
                $owns = Conversation::query()
                    ->whereKey($conversationId)
                    ->where('student_id', $this->user()->id)
                    ->exists();

                if (! $owns) {
                    $validator->errors()->add('conversation_id', 'گفتگوی انتخاب‌شده متعلق به شما نیست.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'نوع نارضایتی را انتخاب کنید.',
            'description.required' => 'توضیح نارضایتی را بنویسید.',
            'description.min' => 'توضیح نارضایتی باید حداقل ۱۰ حرف باشد.',
        ];
    }

    public function attributes(): array
    {
        return [
            'type' => 'نوع نارضایتی',
            'description' => 'توضیح نارضایتی',
            'mentor_first_name' => 'نام منتور',
            'mentor_last_name' => 'نام خانوادگی منتور',
            'course_name' => 'نام دوره',
        ];
    }

    /**
     * داده‌های آماده‌ی ذخیره، با فیلدهای بی‌ربطِ نوع پاک‌شده.
     *
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $type = ComplaintType::from((string) $this->input('type'));

        return [
            'type' => $type->value,
            'description' => trim((string) $this->input('description')),
            'mentor_first_name' => $type->needsMentorName()
                ? trim((string) $this->input('mentor_first_name'))
                : null,
            'mentor_last_name' => $type->needsMentorName()
                ? trim((string) $this->input('mentor_last_name'))
                : null,
            'course_name' => $type->needsCourseName()
                ? trim((string) $this->input('course_name'))
                : null,
            'conversation_id' => $this->input('conversation_id'),
        ];
    }
}
