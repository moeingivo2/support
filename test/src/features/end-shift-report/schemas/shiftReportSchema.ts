import { z } from 'zod'

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export const shiftReportSchema = z.object({
  responded_students_count: nonNegativeCount('تعداد دانشجویان پاسخ‌داده‌شده'),
  unsatisfied_students_count: nonNegativeCount('تعداد دانشجویان ناراضی'),
  desk_requests_count: nonNegativeCount('تعداد درخواست‌های میز'),
  extra_notes: z
    .string()
    .trim()
    .max(1000, 'یادداشت‌های اضافی نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.')
    .optional(),
})

export type ShiftReportFormValues = z.output<typeof shiftReportSchema>
export type ShiftReportFormInput = z.input<typeof shiftReportSchema>

// Count fields are read as text so Persian and Arabic-Indic digits can be typed
// on localised keyboards, then normalised and coerced to real numbers.
function nonNegativeCount(label: string) {
  const minimumMessage = `${label} باید صفر یا بیشتر باشد.`
  const integerMessage = `${label} باید عدد صحیح باشد.`

  return z
    .string({ required_error: minimumMessage })
    .trim()
    .transform(toLatinDigits)
    .superRefine((value, context) => {
      if (value.length === 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: minimumMessage })
        return
      }

      if (!/^[+-]?\d+$/.test(value)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: integerMessage })
        return
      }

      const parsed = Number(value)

      if (!Number.isSafeInteger(parsed)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: integerMessage })
      } else if (parsed < 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: minimumMessage })
      }
    })
    .transform((value) => Number(value))
}

export function toLatinDigits(value: string): string {
  return Array.from(value)
    .map((character) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(character)

      if (persianIndex >= 0) {
        return String(persianIndex)
      }

      const arabicIndex = ARABIC_DIGITS.indexOf(character)

      return arabicIndex >= 0 ? String(arabicIndex) : character
    })
    .join('')
}
