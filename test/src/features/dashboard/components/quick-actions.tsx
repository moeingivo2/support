import { Link } from 'react-router-dom'
import { ArrowUpLeft } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import { dashboardQuickActions } from '../constants'

export function QuickActionsSection() {
  return (
    <section className="space-y-4" aria-labelledby="quick-actions">
      <h2 id="quick-actions" className="text-xl font-bold text-white">
        اقدامات سریع
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {dashboardQuickActions.map((action) => (
          <Card key={action.path} className="p-0">
            <Link
              to={action.path}
              className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-white/5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-active-blue/12 text-active-blue ring-1 ring-active-blue/20">
                <action.icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-100">
                  {action.title}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {action.description}
                </span>
              </span>
              <ArrowUpLeft className="size-4 shrink-0 text-zinc-500" />
            </Link>
          </Card>
        ))}
      </div>
    </section>
  )
}
