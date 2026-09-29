import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
    SOUND_MUTE_EVENT,
    isSoundMuted,
    setSoundMuted,
} from "../utils/notification-sound";

export function NotificationSoundToggle() {
    const [isMuted, setIsMuted] = useState(isSoundMuted);

    useEffect(() => {
        function sync(event: Event) {
            setIsMuted((event as CustomEvent<{ muted: boolean }>).detail.muted);
        }

        window.addEventListener(SOUND_MUTE_EVENT, sync);
        return () => window.removeEventListener(SOUND_MUTE_EVENT, sync);
    }, []);

    return (
        <button
            type="button"
            onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                setSoundMuted(next);
            }}
            aria-pressed={isMuted}
            title={isMuted ? "صدای اعلان خاموش است" : "صدای اعلان روشن است"}
            className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full",
                "border border-hairline bg-surface-2 text-ink-2",
                "transition-transform duration-[220ms] ease-spring-snappy",
                "hover:-translate-y-0.5 hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                "active:scale-95",
            )}
        >
            {isMuted ? (
                <VolumeX className="size-4" aria-hidden="true" />
            ) : (
                <Volume2 className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">
                {isMuted ? "روشن کردن صدای اعلان" : "خاموش کردن صدای اعلان"}
            </span>
        </button>
    );
}
