import { z } from 'zod'

export const createSupportSchema = z.object({
  name: z.string().trim().min(3, 'نام و نام خانوادگی الزامی است.').max(255),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))
    .refine((value) => /^09\d{9}$/.test(value), 'شماره موبایل معتبر وارد کنید (مثلاً 09123456789).'),
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.').max(190),
  support_type: z.enum(['web', 'ai'], {
    errorMap: () => ({ message: 'نوع پشتیبانی را انتخاب کنید.' }),
  }),
})

export type CreateSupportFormValues = z.output<typeof createSupportSchema>
export type CreateSupportFormInput = z.input<typeof createSupportSchema>
