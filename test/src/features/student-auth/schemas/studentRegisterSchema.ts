import { z } from 'zod'
import { TOTAL_SESSIONS } from '../constants/courses'

export const studentRegisterSchema = z
  .object({
    first_name: z.string().trim().min(2, 'نام باید حداقل ۲ حرف باشد.').max(120),
    last_name: z.string().trim().min(2, 'نام خانوادگی باید حداقل ۲ حرف باشد.').max(120),
    email: z.string().trim().min(1, 'ایمیل الزامی است.').email('قالب ایمیل معتبر نیست.').max(190),
    password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.').max(190),
    password_confirmation: z.string().min(1, 'تکرار رمز عبور الزامی است.'),
    course: z.enum(['offline', 'in_person', 'school'], {
      errorMap: () => ({ message: 'دوره را انتخاب کنید.' }),
    }),
    track: z.enum(['ai', 'web']).nullable().optional(),
    sessions: z.array(z.number().int().min(1).max(TOTAL_SESSIONS)).default([]),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password_confirmation'],
        message: 'تکرار رمز عبور مطابقت ندارد.',
      })
    }

    if (values.course !== 'offline') {
      if (values.track) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['track'],
          message: 'انتخاب رشته فقط برای دوره آفلاین است.',
        })
      }
      return
    }

    if (!values.track) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['track'],
        message: 'برای دوره آفلاین انتخاب رشته الزامی است.',
      })
    }

    if (values.sessions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sessions'],
        message: 'حداقل یک جلسه را انتخاب کنید.',
      })
    }
  })

export type StudentRegisterFormValues = z.output<typeof studentRegisterSchema>
export type StudentRegisterFormInput = z.input<typeof studentRegisterSchema>
