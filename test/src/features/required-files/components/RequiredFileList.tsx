import { File } from 'lucide-react'
import { RequiredFileCard } from './RequiredFileCard'
import type { Resource } from '../types/resource'

type RequiredFileListProps = {
  resources: Resource[]
  onEdit: (resource: Resource) => void
  onDelete: (resource: Resource) => void
}

export function RequiredFileList({ resources, onEdit, onDelete }: RequiredFileListProps) {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-4xl border border-border/10 bg-deactive-btn-gray/70 p-12 text-center">
        <File className="size-10 text-zinc-600" />
        <p className="text-base font-bold text-white">فایل مورد نیازی یافت نشد.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <RequiredFileCard
          key={resource.id}
          resource={resource}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}