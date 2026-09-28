export type Theme = "dark" | "light";

const THEME_KEY = "aio_theme";

export const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme | null {
    try {
        const stored = localStorage.getItem(THEME_KEY);
        return stored === "light" || stored === "dark" ? stored : null;
    } catch {
        return null;
    }
}

export function storeTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // در حالت مرورگر خصوصی نوشتن ممکن نیست؛ بی‌اهمیت است
    }
}

export function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
}
