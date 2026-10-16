import { z } from "zod";

/**
 * اعتبارسنجی فرم نارضایتی دانشجو.
 *
 * هر نوع فیلد مخصوص خودش را دارد، پس نیازِ هر فیلد به `superRefine`
 * وابسته است: نام منتور فقط برای نوع «منتور» و نام دوره فقط برای
 * نوع «دوره» الزامی می‌شود. این دقیقاً همان قاعده‌ی بک‌اند است
 * (`StoreComplaintRequest::after`).
 */
const baseFields = {
    type: z.enum(["support", "mentor", "course"], {
        errorMap: () => ({ message: "نوع نارضایتی را انتخاب کنید." }),
    }),
    description: z
        .string()
        .trim()
        .min(10, "توضیح نارضایتی باید حداقل ۱۰ حرف باشد.")
        .max(5000, "توضیح نارضایتی حداکثر ۵۰۰۰ حرف است."),
    mentor_first_name: z.string().trim().max(120).optional().or(z.literal("")),
    mentor_last_name: z.string().trim().max(120).optional().or(z.literal("")),
    course_name: z.string().trim().max(160).optional().or(z.literal("")),
};

export const complaintSchema = z
    .object(baseFields)
    .superRefine((values, ctx) => {
        if (values.type === "mentor") {
            if (!values.mentor_first_name) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["mentor_first_name"],
                    message: "نام منتور الزامی است.",
                });
            }

            if (!values.mentor_last_name) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["mentor_last_name"],
                    message: "نام خانوادگی منتور الزامی است.",
                });
            }
        }

        if (values.type === "course" && !values.course_name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["course_name"],
                message: "نام دوره الزامی است.",
            });
        }
    });

export type ComplaintFormValues = z.output<typeof complaintSchema>;
export type ComplaintFormInput = z.input<typeof complaintSchema>;