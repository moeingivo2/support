import { useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useFaqs } from '../hooks/useFaqs'
import { FAQ_CATEGORIES, categoryLabel } from '../services/faq-service'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { Check, ChevronDown, Copy, HelpCircle, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export default function FaqPage() {
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const faqsQuery = useFaqs(category, search)

  const faqs = faqsQuery.data ?? []

  async function copyAnswer(id: number, question: string, answer: string) {
    try {
      await navigator.clipboard.writeText(`${question}\n\n${answer}`)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // کلیپ‌بورد در دسترس نیست
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">سوالات متداول</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          پاسخ سریع مشکلات پرتکرار — پاسخ هر سوال را می‌توانید مستقیماً برای دانشجو کپی کنید.
        </p>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جستجو در سوالات و پاسخ‌ها…"
            className="pr-11"
            aria-label="جستجوی سوالات متداول"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton active={category === ''} onClick={() => setCategory('')}>
            همه
          </FilterButton>
          {FAQ_CATEGORIES.map((item) => (
            <FilterButton
              key={item.value}
              active={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </FilterButton>
          ))}
        </div>
      </div>

      {faqsQuery.isError ? (
        <Alert tone="danger" className="flex items-center justify-between gap-3">
          <span>دریافت سوالات متداول ناموفق بود.</span>
          <Button variant="danger" onClick={() => faqsQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : faqsQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="mt-3 h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <HelpCircle className="size-10 text-zinc-600" />
          <p className="text-base font-bold text-white">سوالی یافت نشد.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.id} className="group rounded-4xl border border-border/10 bg-deactive-btn-gray/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-zinc-100">{faq.question}</p>
                  <StatusPill tone="info">{categoryLabel(faq.category)}</StatusPill>
                </div>
                <ChevronDown className="size-5 shrink-0 text-zinc-500 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-4 border-t border-border/10 p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{faq.answer}</p>
                <Button variant="ghost" onClick={() => copyAnswer(faq.id, faq.question, faq.answer)}>
                  {copiedId === faq.id ? <Check /> : <Copy />}
                  {copiedId === faq.id ? 'کپی شد' : 'کپی برای ارسال به دانشجو'}
                </Button>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-xs font-semibold transition',
        active
          ? 'bg-active-blue text-white'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}
