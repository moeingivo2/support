import { z } from 'zod'

export const complaintSchema = z.object({
  student_name: z.string().trim().min(2, 'نام دانشجو الزامی است.').max(255),
  student_code: z
    .string()
    .trim()
    .max(50, 'کد دانشجویی حداکثر ۵۰ کاراکتر است.')
    .optional()
    .or(z.literal('')),
  student_phone: z
    .string()
    .trim()
    .max(20, 'شماره تماس حداکثر ۲۰ کاراکتر است.')
    .optional()
    .or(z.literal('')),
  mentor_name: z.string().trim().min(2, 'نام منتور الزامی است.').max(255),
  mentor_phone: z
    .string()
    .trim()
    .max(20, 'شماره تماس حداکثر ۲۰ کاراکتر است.')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .min(10, 'توضیحات باید حداقل ۱۰ کاراکتر باشد.')
    .max(5000, 'توضیحات حداکثر ۵۰۰۰ کاراکتر است.'),
  priority: z.enum(['high', 'normal', 'low'], {
    errorMap: () => ({ message: 'اولویت را انتخاب کنید.' }),
  }),
})

export type ComplaintFormValues = z.output<typeof complaintSchema>
export type ComplaintFormInput = z.input<typeof complaintSchema>
