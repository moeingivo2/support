import { z } from 'zod'

export const studentLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'ایمیل را وارد کنید.')
    .email('قالب ایمیل معتبر نیست.')
    .max(190, 'مقدار وارد شده بیش از حد طولانی است.'),
  password: z.string().min(1, 'رمز عبور الزامی است.').max(190, 'رمز عبور بیش از حد طولانی است.'),
})

export type StudentLoginFormValues = z.output<typeof studentLoginSchema>
export type StudentLoginFormInput = z.input<typeof studentLoginSchema>
