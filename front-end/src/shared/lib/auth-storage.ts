const TOKEN_KEY = "aio_token";
const USER_KEY = "aio_user";
const OBSERVER_TOKEN_KEY = "aio_observer_token";
const OBSERVER_USER_KEY = "aio_observer_user";

/**
 * توکن و هویت ناظر اکانت هنگام ورود به حساب یک پشتیبان.
 *
 * در `sessionStorage` نگه‌داری می‌شوند تا با رفرش صفحه از دست نروند؛ وگرنه
 * نشست پشتیبان باقی می‌ماند ولی نشانی «بازگشت به اکانت ناظر» گم می‌شد و
 * ناظر دیگر نمی‌توانست به نقش خودش برگردد.
 */
export function setStoredObserverSession(
    token: string,
    user: PanelUser,
): void {
    sessionStorage.setItem(OBSERVER_TOKEN_KEY, token);
    sessionStorage.setItem(OBSERVER_USER_KEY, JSON.stringify(user));
}

export function getStoredObserverSession(): {
    token: string | null;
    user: PanelUser | null;
} {
    try {
        const raw = sessionStorage.getItem(OBSERVER_USER_KEY);
        return {
            token: sessionStorage.getItem(OBSERVER_TOKEN_KEY),
            user: raw ? (JSON.parse(raw) as PanelUser) : null,
        };
    } catch {
        return { token: null, user: null };
    }
}

export function clearStoredObserverSession(): void {
    sessionStorage.removeItem(OBSERVER_TOKEN_KEY);
    sessionStorage.removeItem(OBSERVER_USER_KEY);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function setStoredUser(user: PanelUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setAuth(token: string, user: PanelUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): PanelUser | null {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as PanelUser) : null;
    } catch {
        return null;
    }
}

export function clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearStoredObserverSession();
}

export type PanelRole =
    | "admin"
    | "support"
    | "observer"
    | "account_observer"
    | "trainee"
    | "student";

export interface PanelUser {
    id: number;
    name: string;
    phone: string | null;
    role: PanelRole;
    support_type?: "web" | "ai" | null;
    observer_id?: number | null;
}
