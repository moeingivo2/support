import { z } from 'zod'

export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, 'شماره تلفن یا ایمیل را وارد کنید.')
    .max(190, 'مقدار وارد شده بیش از حد طولانی است.'),
  password: z.string().min(1, 'رمز عبور الزامی است.').max(190, 'رمز عبور بیش از حد طولانی است.'),
})

export type LoginFormValues = z.output<typeof loginSchema>
export type LoginFormInput = z.input<typeof loginSchema>
