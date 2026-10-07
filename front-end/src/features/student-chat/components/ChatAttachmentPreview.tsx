import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { OutgoingAttachment } from "../types/chat";
import { formatFileSize } from "../utils/format";

export function ChatAttachmentPreview({
    attachment,
    disabled = false,
    onRemove,
}: {
    attachment: OutgoingAttachment;
    disabled?: boolean;
    onRemove: () => void;
}) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const isImage = attachment.file.type.startsWith("image/");

    useEffect(() => {
        if (!isImage) return;
        const url = URL.createObjectURL(attachment.file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [attachment.file, isImage]);

    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-hairline bg-surface-2 p-2.5" dir="rtl">
            {previewUrl ? (
                <img src={previewUrl} alt="پیش‌نمایش تصویر پیوست" onError={() => setPreviewUrl(null)} className="size-12 shrink-0 rounded-xl border border-hairline object-cover" />
            ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-ink">
                    {isImage ? <ImageIcon className="size-5" /> : attachment.file.type.startsWith("audio/") ? <Paperclip className="size-5" /> : <FileText className="size-5" />}
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{attachment.file.name}</span>
                <span className="block text-[11px] text-ink-2">{formatFileSize(attachment.file.size)}</span>
            </span>
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="حذف پیوست" disabled={disabled} className="max-sm:size-11 max-sm:shrink-0">
                <X />
            </Button>
        </div>
    );
}
