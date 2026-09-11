import { z } from 'zod'

export const startShiftSchema = z.object({
  channel: z.enum(['web', 'ai', 'phone'], {
    errorMap: () => ({ message: 'کانال شیفت را انتخاب کنید.' }),
  }),
})

export type StartShiftFormValues = z.output<typeof startShiftSchema>
