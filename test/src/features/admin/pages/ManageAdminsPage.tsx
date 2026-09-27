import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, UserCog, X } from 'lucide-react'
import { useAuth } from '@/shared/services/auth-context'
import { HttpApiError } from '@/shared/api/http'
import {
  adminKeys,
  createAdmin,
  deleteAdmin,
  getAdmins,
  updateAdmin,
  type AdminListItem,
} from '../services/admin-service'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { useToast } from '@/shared/ui/toast'

type AdminFormState = {
  name: string
  email: string
  phone: string
  password: string
}

const emptyForm: AdminFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
}

export default function ManageAdminsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AdminFormState>(emptyForm)
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminListItem | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const adminsQuery = useQuery({ queryKey: adminKeys.admins, queryFn: getAdmins })
  const admins = adminsQuery.data?.data ?? []

  function updateField(field: keyof AdminFormState, value: string): void {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage(null)
  }

  function startEditing(admin: AdminListItem): void {
    setEditingAdmin(admin)
    setForm({
      name: admin.name,
      email: admin.email ?? '',
      phone: admin.phone ?? '',
      password: '',
    })
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function resetForm(): void {
    setEditingAdmin(null)
    setForm(emptyForm)
    setErrorMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      const response = editingAdmin
        ? await updateAdmin(editingAdmin.id, form)
        : await createAdmin(form)

      setSuccessMessage(response.message)
      toast.success(response.message)
      resetForm()
      await queryClient.invalidateQueries({ queryKey: adminKeys.admins })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const response = await deleteAdmin(deleteTarget.id)
      toast.success(response.message)
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: adminKeys.admins })
    } catch (error) {
      setDeleteTarget(null)
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-alret-gold/10 text-alret-gold ring-1 ring-alret-gold/20">
            <UserCog className="size-6" />
          </span>
          <div>
            <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">مدیریت سوپر ادمین‌ها</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              حساب‌های سوپر ادمین را ایجاد کنید، مشخصاتشان را ویرایش کنید یا حساب‌های اضافی را حذف کنید. حذف آخرین سوپر ادمین و حساب فعلی مجاز نیست.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="h-fit p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
                {editingAdmin ? <Pencil className="size-5" /> : <Plus className="size-5" />}
              </span>
              <h2 className="text-xl font-bold text-white">
                {editingAdmin ? 'ویرایش سوپر ادمین' : 'ایجاد سوپر ادمین'}
              </h2>
            </div>
            {editingAdmin ? (
              <Button variant="ghost" size="icon" onClick={resetForm} aria-label="انصراف از ویرایش">
                <X />
              </Button>
            ) : null}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
            {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="admin-name">نام و نام خانوادگی</Label>
              <Input
                id="admin-name"
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="مثلاً فرزان اسلامی"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">ایمیل</Label>
              <Input
                id="admin-email"
                type="email"
                dir="ltr"
                required
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="admin@example.com"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">شماره موبایل</Label>
              <Input
                id="admin-phone"
                type="tel"
                dir="ltr"
                required
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="09123456789"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">رمز عبور</Label>
              <Input
                id="admin-password"
                type="password"
                dir="ltr"
                required={!editingAdmin}
                minLength={editingAdmin ? undefined : 8}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder={editingAdmin ? 'برای حفظ رمز فعلی خالی بگذارید' : 'حداقل ۸ کاراکتر'}
                disabled={isSaving}
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {isSaving ? 'در حال ذخیره...' : editingAdmin ? 'ذخیره تغییرات' : 'ایجاد سوپر ادمین'}
            </Button>
          </form>
        </Card>

        <Card className="p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">سوپر ادمین‌های فعال</h2>
              <p className="mt-1 text-xs text-zinc-500">{admins.length.toLocaleString('fa-IR')} حساب مدیریتی</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {adminsQuery.isPending ? (
              Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24 w-full rounded-3xl" />)
            ) : adminsQuery.isError ? (
              <Alert tone="danger">دریافت فهرست سوپر ادمین‌ها ناموفق بود.</Alert>
            ) : admins.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">هنوز سوپر ادمینی ثبت نشده است.</p>
            ) : (
              admins.map((admin) => {
                const isCurrent = user?.id === admin.id
                return (
                  <div key={admin.id} className="rounded-3xl border border-border/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-zinc-100">{admin.name}</p>
                          {isCurrent ? <StatusPill tone="info">حساب فعلی</StatusPill> : null}
                        </div>
                        <p dir="ltr" className="mt-1 text-right text-xs text-zinc-500">{admin.email}</p>
                        <p dir="ltr" className="mt-1 text-right text-xs text-zinc-500">{admin.phone}</p>
                      </div>
                      <StatusPill tone="warning">سوپر ادمین</StatusPill>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="ghost" size="md" onClick={() => startEditing(admin)}>
                        <Pencil />
                        ویرایش
                      </Button>
                      <Button
                        variant="danger"
                        size="md"
                        onClick={() => setDeleteTarget(admin)}
                        disabled={isCurrent}
                        title={isCurrent ? 'حساب فعلی قابل حذف نیست' : undefined}
                      >
                        <Trash2 />
                        حذف
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف سوپر ادمین"
        description={deleteTarget ? `آیا از حذف حساب «${deleteTarget.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.` : ''}
        confirmLabel="حذف حساب"
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpApiError) {
    const fieldMessage = error.fieldErrors ? Object.values(error.fieldErrors).flat()[0] : undefined
    return fieldMessage ?? error.message
  }
  return error instanceof Error ? error.message : 'عملیات ناموفق بود.'
}
