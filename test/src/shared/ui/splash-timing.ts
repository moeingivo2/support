/**
 * زمان‌بندی مشترک اسپلش‌ها.
 *
 * نباید در هیچ فایلی مقدار دیگری برای مدت اسپلش تعریف شود؛ همه‌ی پنل‌ها
 * (دانشجو، پشتیبانی، ادمین و صفحات ورود) از همین اعداد استفاده می‌کنند.
 */

/** حداقل زمان نمایش — کمتر از این، انتقال «پرشی» به نظر می‌رسد */
export const SPLASH_MIN_MS = 420;

/** سقف سخت — تضمین می‌کند اسپلش در هیچ شرایطی گیر نکند */
export const SPLASH_MAX_MS = 2200;

/** مدت انیمیشن خروج */
export const SPLASH_LEAVE_MS = 360;

/**
 * انتظار برای آماده‌شدن واقعی صفحه: فونت‌ها، پایان بارگذاری مستند،
 * و دست‌کم یک فریم رندر تا محتوا واقعاً دیده شود.
 */
export function waitForSplashReadiness(): Promise<void> {
    if (typeof document === "undefined") {
        return Promise.resolve();
    }

    const fontsReady = document.fonts?.ready ?? Promise.resolve(undefined);

    const documentReady =
        document.readyState === "complete"
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                  window.addEventListener("load", () => resolve(), {
                      once: true,
                  });
              });

    return Promise.all([
        fontsReady.then(() => undefined),
        documentReady,
    ])
        .then(() => undefined)
        .catch(() => undefined)
        .then(
            () =>
                new Promise<void>((resolve) => {
                    requestAnimationFrame(() => resolve());
                }),
        );
}
