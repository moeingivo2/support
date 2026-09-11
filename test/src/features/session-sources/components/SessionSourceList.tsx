import { FolderOpen } from 'lucide-react'
import { SessionSourceCard } from './SessionSourceCard'
import type { Resource } from '../types/resource'

type SessionSourceListProps = {
  resources: Resource[]
  onEdit: (resource: Resource) => void
  onDelete: (resource: Resource) => void
}

export function SessionSourceList({ resources, onEdit, onDelete }: SessionSourceListProps) {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-4xl border border-border/10 bg-deactive-btn-gray/70 p-12 text-center">
        <FolderOpen className="size-10 text-zinc-600" />
        <p className="text-base font-bold text-white">سورس جلسه‌ای یافت نشد.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <SessionSourceCard
          key={resource.id}
          resource={resource}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}