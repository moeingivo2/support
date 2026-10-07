import { z } from "zod";
import { IRANIAN_PHONE_ERROR, isValidIranianPhone } from "../utils/iranian-phone";

export const studentLoginSchema = z.object({
    phone: z
        .string()
        .trim()
        .min(1, "شماره موبایل الزامی است.")
        .refine(isValidIranianPhone, { message: IRANIAN_PHONE_ERROR }),
    password: z
        .string()
        .min(1, "رمز عبور الزامی است.")
        .max(190, "رمز عبور بیش از حد طولانی است."),
});

export type StudentLoginFormValues = z.output<typeof studentLoginSchema>;
export type StudentLoginFormInput = z.input<typeof studentLoginSchema>;
