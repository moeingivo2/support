import { z } from "zod";

export const createTraineeSchema = z.object({
    name: z.string().trim().min(3, "نام و نام خانوادگی الزامی است.").max(255),
    phone: z
        .string()
        .trim()
        .transform((value) =>
            value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))),
        )
        .refine(
            (value) => /^09\d{9}$/.test(value),
            "شماره موبایل معتبر وارد کنید (مثلاً 09123456789).",
        ),
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(190),
});

export type CreateTraineeFormValues = z.output<typeof createTraineeSchema>;
export type CreateTraineeFormInput = z.input<typeof createTraineeSchema>;
