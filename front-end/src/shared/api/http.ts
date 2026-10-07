import { getToken, clearAuth } from "@/shared/lib/auth-storage";

export class HttpApiError extends Error {
    readonly status: number;
    readonly fieldErrors?: Record<string, string[]>;

    constructor(
        message: string,
        status: number,
        fieldErrors?: Record<string, string[]>,
    ) {
        super(message);
        this.name = "HttpApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    payload?: unknown;
    query?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
};

export async function request<TResponse>(
    url: string,
    options: RequestOptions = {},
): Promise<TResponse> {
    const { method = "GET", payload, query, signal } = options;

    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let body: string | undefined;
    if (payload !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(payload);
    }

    return sendRequest<TResponse>(url, { method, headers, body, query, signal });
}

/**
 * ارسال درخواست با فرمت multipart/form-data برای آپلود فایل و پیوست.
 */
export async function postMultipart<TResponse>(
    url: string,
    formData: FormData,
    signal?: AbortSignal,
): Promise<TResponse> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return sendRequest<TResponse>(url, {
        method: "POST",
        headers,
        body: formData,
        signal,
    });
}

type SendOptions = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers: Record<string, string>;
    body: BodyInit | undefined;
    query?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
};

async function sendRequest<TResponse>(
    url: string,
    options: SendOptions,
): Promise<TResponse> {
    const fullUrl = appendQuery(url, options.query);

    let response: Response;
    try {
        response = await fetch(fullUrl, {
            method: options.method,
            headers: options.headers,
            body: options.body,
            signal: options.signal,
        });
    } catch {
        throw new HttpApiError(
            "اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.",
            0,
        );
    }

    if (response.status === 401) {
        clearAuth();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    const responseBody = await readJsonBody(response);

    if (!response.ok) {
        throw new HttpApiError(
            getSafeErrorMessage(responseBody, response.status),
            response.status,
            getFieldErrors(responseBody),
        );
    }

    return responseBody as TResponse;
}

export function getJson<TResponse>(
    url: string,
    query?: Record<string, string | number | undefined>,
): Promise<TResponse> {
    return request<TResponse>(url, { query });
}

export function postJson<TRequest, TResponse>(
    url: string,
    payload: TRequest,
    signal?: AbortSignal,
): Promise<TResponse> {
    return request<TResponse>(url, { method: "POST", payload, signal });
}

export function putJson<TRequest, TResponse>(
    url: string,
    payload: TRequest,
): Promise<TResponse> {
    return request<TResponse>(url, { method: "PUT", payload });
}

export function deleteJson<TResponse>(url: string): Promise<TResponse> {
    return request<TResponse>(url, { method: "DELETE" });
}

export type DownloadedFile = {
    blob: Blob;
    filename: string;
};

export async function downloadFile(
    url: string,
    query?: Record<string, string | number | undefined>,
    fallbackFilename = "download.xls",
): Promise<DownloadedFile> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.ms-excel, application/octet-stream, application/json",
    };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const fullUrl = appendQuery(url, query);
    let response: Response;
    try {
        response = await fetch(fullUrl, { headers });
    } catch {
        throw new HttpApiError(
            "اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.",
            0,
        );
    }

    if (response.status === 401) {
        clearAuth();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (!response.ok) {
        const responseBody = await readJsonBody(response);
        throw new HttpApiError(
            getSafeErrorMessage(responseBody, response.status),
            response.status,
            getFieldErrors(responseBody),
        );
    }

    return {
        blob: await response.blob(),
        filename: getDownloadFilename(
            response.headers.get("Content-Disposition"),
            fallbackFilename,
        ),
    };
}

/**
 * دریافت فایل به‌صورت blob با هدر احراز هویت.
 *
 * `<audio src>` و `<img src>` نمی‌توانند هدر Authorization بفرستند، و پیوست‌ها
 * پشت `auth:sanctum` هستند. برای همین فایل دستی گرفته می‌شود و به یک object
 * URL تبدیل می‌گردد. نوع واقعی صریح داده می‌شود چون سرور فایل‌ها را عمداً با
 * `application/octet-stream` می‌فرستد تا مرورگر آن‌ها را اجرا نکند.
 */
export async function fetchAuthenticatedBlob(
    url: string,
    mimeType: string,
): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(url, { headers });
    } catch {
        throw new HttpApiError(
            "اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.",
            0,
        );
    }

    if (response.status === 401) {
        clearAuth();
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (!response.ok) {
        throw new HttpApiError(
            getSafeErrorMessage(null, response.status, "دریافت فایل"),
            response.status,
        );
    }

    return new Blob([await response.arrayBuffer()], { type: mimeType });
}

/** دریافت امن پیوست محافظت‌شده و دانلود آن بدون URL مستقیم بدون توکن. */
export async function downloadAuthenticatedBlob(
    url: string,
    mimeType: string,
    filename: string,
): Promise<void> {
    const blob = await fetchAuthenticatedBlob(url, mimeType);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function appendQuery(
    url: string,
    query?: Record<string, string | number | undefined>,
): string {
    if (!query) return url;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== "") {
            params.append(key, String(value));
        }
    }
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
}

function getDownloadFilename(
    contentDisposition: string | null,
    fallbackFilename: string,
): string {
    if (!contentDisposition) return fallbackFilename;
    const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? fallbackFilename;
}

async function readJsonBody(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function getServerMessage(payload: unknown): string | undefined {
    if (
        isRecord(payload) &&
        typeof payload.message === "string" &&
        payload.message.length > 0
    ) {
        return payload.message;
    }
    return undefined;
}

/**
 * پیام خطای سرور فقط وقتی به کاربر نشان داده می‌شود که فارسی و مناسب UI
 * باشد؛ متن انگلیسی، SQL، HTML یا پیام‌های زیرساختی با متن قابل‌فهم جایگزین
 * می‌شوند. برای پیگیری پشتیبانی، کد HTTP نیز در پیام fallback باقی می‌ماند.
 */
function getSafeErrorMessage(
    payload: unknown,
    status: number,
    action = "درخواست",
): string {
    const serverMessage = getServerMessage(payload)?.trim();
    if (status < 500 && serverMessage && /[\u0600-\u06FF]/.test(serverMessage)) {
        return serverMessage;
    }

    const messages: Record<number, string> = {
        400: "اطلاعات ارسالی درست نیست. بررسی و دوباره تلاش کنید.",
        401: "نشست شما منقضی شده است. دوباره وارد حساب شوید.",
        403: "برای انجام این کار دسترسی ندارید.",
        404: "مورد درخواستی پیدا نشد یا حذف شده است.",
        409: "این تغییر با وضعیت فعلی سازگار نیست. صفحه را تازه‌سازی کنید.",
        413: "حجم فایل بیش از حد مجاز است.",
        419: "نشست شما منقضی شده است. صفحه را تازه‌سازی و دوباره تلاش کنید.",
        422: "اطلاعات واردشده معتبر نیست. موارد مشخص‌شده را بررسی کنید.",
        429: "تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.",
        500: "خطای داخلی سامانه رخ داد. کد پیگیری: HTTP 500",
        502: "ارتباط با سرور برقرار نشد. کمی بعد دوباره تلاش کنید. (HTTP 502)",
        503: "سامانه موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید. (HTTP 503)",
        504: "پاسخ سرور بیش از حد طول کشید. دوباره تلاش کنید. (HTTP 504)",
    };

    if (status === 0) {
        return "اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.";
    }

    return messages[status] ?? `${action} ناموفق بود. کد پیگیری: HTTP ${status}`;
}

function getFieldErrors(
    payload: unknown,
): Record<string, string[]> | undefined {
    if (!isRecord(payload) || !isRecord(payload.errors)) {
        return undefined;
    }

    const fieldErrors: Record<string, string[]> = {};

    for (const [field, messages] of Object.entries(payload.errors)) {
        if (!Array.isArray(messages)) {
            continue;
        }

        const validMessages = messages.filter(
            (message): message is string => typeof message === "string",
        ).map(localizeValidationMessage);

        if (validMessages.length > 0) {
            fieldErrors[field] = validMessages;
        }
    }

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function localizeValidationMessage(message: string): string {
    if (/[\u0600-\u06FF]/.test(message)) return message;

    const translations: Array<[RegExp, string]> = [
        [/is required/i, "این فیلد الزامی است."],
        [/must be at least (\d+) characters/i, "تعداد نویسه‌ها کمتر از حد مجاز است."],
        [/must be at least (\d+)/i, "مقدار واردشده کمتر از حد مجاز است."],
        [/must not be greater than (\d+)/i, "مقدار واردشده بیش از حد مجاز است."],
        [/must be a valid email/i, "ایمیل معتبر وارد کنید."],
        [/has already been taken/i, "این مقدار قبلاً ثبت شده است."],
        [/must be a number/i, "یک عدد معتبر وارد کنید."],
        [/must be an integer/i, "یک عدد صحیح وارد کنید."],
    ];

    for (const [pattern, translated] of translations) {
        if (pattern.test(message)) return translated;
    }

    return "مقدار واردشده معتبر نیست.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
