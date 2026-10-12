import { z } from "zod";

export const loginSchema = z.object({
    phone: z
        .string()
        .trim()
        .min(4, "شماره موبایل را وارد کنید.")
        .max(32, "شماره موبایل بیش از حد طولانی است."),
    password: z
        .string()
        .min(1, "رمز عبور الزامی است.")
        .max(190, "رمز عبور بیش از حد طولانی است."),
});

export type LoginFormValues = z.output<typeof loginSchema>;
export type LoginFormInput = z.input<typeof loginSchema>;
