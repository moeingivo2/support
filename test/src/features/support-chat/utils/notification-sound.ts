/**
 * اعلان صوتی پیام جدید برای پشتیبان.
 *
 * از Web Audio API استفاده می‌شود تا نیازی به فایل صوتی و مجوز جداگانه نباشد.
 * سیاست autoplay مرورگر رعایت می‌شود: اگر مرورگر اجازه‌ی پخش خودکار ندهد،
 * صدا بی‌صدا رد می‌شود و به‌محض اولین تعامل کاربر بازپخش می‌شود.
 */

const MUTE_STORAGE_KEY = "aio_support_sound_muted";

export const SOUND_MUTE_EVENT = "aio:sound-muted";

let audioContext: AudioContext | null = null;

export function isSoundMuted(): boolean {
    try {
        return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

export function setSoundMuted(muted: boolean): void {
    try {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
        // حافظه‌ی در دسترس نیست؛ فقط در همین نشست اعمال می‌شود
    }

    window.dispatchEvent(
        new CustomEvent(SOUND_MUTE_EVENT, { detail: { muted } }),
    );
}

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

    if (!Ctor) return null;

    audioContext ??= new Ctor();
    return audioContext;
}

/**
 * بازپخش یک بوق کوتاه دو‌نت.
 */
async function playTone(): Promise<void> {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
    }

    // اگر مرورگر همچنان پخش را مسدود کند، بی‌صدا رد می‌شویم
    if (context.state !== "running") return;

    const now = context.currentTime;

    [
        { frequency: 880, at: 0 },
        { frequency: 1174.66, at: 0.14 },
    ].forEach(({ frequency, at }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + at);

        // حمله و فرود نرم تا صدا ناگهانی نباشد
        gain.gain.setValueAtTime(0.0001, now + at);
        gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);

        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + at);
        oscillator.stop(now + at + 0.24);
    });
}

/**
 * تلاش برای پخش. اگر مرورگر تعامل کاربر را لازم داشته باشد، پخش به
 * اولین کلیک/تاپ بعدی موکول می‌شود و فقط یک بار اجرا می‌گردد.
 */
export function playNewMessageSound(): void {
    if (isSoundMuted()) return;

    void playTone().catch(() => {
        armFirstInteractionPlayback();
    });
}

let armed = false;

function armFirstInteractionPlayback(): void {
    if (armed) return;
    armed = true;

    const handler = () => {
        if (!isSoundMuted()) {
            void playTone().catch(() => undefined);
        }
        detach();
    };

    const detach = () => {
        window.removeEventListener("pointerdown", handler);
        window.removeEventListener("keydown", handler);
        armed = false;
    };

    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
}
