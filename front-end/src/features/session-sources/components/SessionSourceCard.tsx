import { useState } from "react";
import {
    CalendarDays,
    Check,
    Copy,
    Download,
    Pencil,
    Trash2,
    UserRound,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatResourceDate } from "../services/resourceService";
import type { Resource } from "../types/resource";

type SessionSourceCardProps = {
    resource: Resource;
    onEdit?: (resource: Resource) => void;
    onDelete?: (resource: Resource) => void;
};

export function SessionSourceCard({
    resource,
    onEdit,
    onDelete,
}: SessionSourceCardProps) {
    const [copied, setCopied] = useState(false);

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(resource.file_url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // کلیپ‌بورد در دسترس نیست؛ کاربر می‌تواند از دکمه دانلود استفاده کند
        }
    }

    return (
        <Card className="flex h-full flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
                {onEdit || onDelete ? (
                <span className="mr-auto flex items-center gap-1">
                    {onEdit ? <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label="ویرایش سورس"
                        onClick={() => onEdit(resource)}
                    >
                        <Pencil className="size-4" />
                    </Button> : null}
                    {onDelete ? <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-err-text hover:text-err-text"
                        aria-label="حذف سورس"
                        onClick={() => onDelete(resource)}
                    >
                        <Trash2 className="size-4" />
                    </Button> : null}
                </span>
                ) : null}
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-bold text-ink">{resource.title}</h3>
                {resource.description ? (
                    <p className="text-sm leading-7 text-ink-2">
                        {resource.description}
                    </p>
                ) : null}
            </div>

            <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" />
                        {formatResourceDate(resource.created_at)}
                    </span>
                    {resource.creator ? (
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-4" />
                            {resource.creator.name}
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="w-full sm:w-auto">
                        <a
                            href={resource.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download />
                            دانلود سورس
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={copyLink}
                        className="w-full sm:w-auto"
                    >
                        {copied ? <Check /> : <Copy />}
                        {copied ? "کپی شد" : "کپی لینک برای دانشجو"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
