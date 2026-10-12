import { expect, test, type Page } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:5174", channel: "chrome" });

const STORAGE_KEY = "aio_rating_feedback:1:42";

async function openConversation(page: Page, options: { isOpen?: boolean; rejectRating?: boolean } = {}) {
    const posts: Array<{ path: string; payload: { rating_value: number; description: string | null; closure_confirmed?: boolean } }> = [];
    let savedRating: { rating_value: number; description: string | null } | null = null;
    function conversation() {
        return {
            id: 42, title: "گفتگوی نمونه", last_message_preview: null, last_message_at: null,
            unread_count: 0, status: options.isOpen && !savedRating ? "open" : "closed",
            status_label: "بسته", closure_actor: "support", closed_at: null,
            can_rate: !options.isOpen && savedRating === null, has_rating: savedRating !== null,
            support: { id: 2, name: "پشتیبان" },
        };
    }
    await page.addInitScript(() => {
        localStorage.setItem("aio_token", "rating-preview");
        localStorage.setItem("aio_user", JSON.stringify({ id: 1, name: "دانشجو", role: "student", email: null, phone: null }));
    });
    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (request.method() === "POST") {
            const payload = request.postDataJSON();
            posts.push({ path, payload });
            if (options.rejectRating) {
                await route.fulfill({ status: 422, json: { message: "ثبت امتیاز ناموفق بود." } });
                return;
            }
            savedRating = { rating_value: payload.rating_value, description: payload.description };
            await route.fulfill({ json: { message: "امتیاز شما ثبت شد.", data: { conversation: conversation(), rating: savedRating } } });
            return;
        }
        const data = path === "/api/conversations/42"
            ? { conversation: conversation(), messages: [], rating: savedRating }
            : path === "/api/conversations" ? [conversation()]
              : path === "/api/student/profile" ? { remaining_chats: 12 } : [];
        await route.fulfill({ json: { data } });
    });
    await page.goto("/chat?c=42");
    await page.getByRole("button", { name: "ورود فوری به پنل" }).click();
    await expect(page.getByRole("region", { name: "در حال ورود به پنل" })).toBeHidden();
    if (options.isOpen) {
        await page.getByRole("button", { name: "بستن گفتگو", exact: true }).click();
        await page.getByRole("button", { name: "بله، ادامه", exact: true }).click();
        await page.getByRole("button", { name: "بله، گفتگو را ببندید", exact: true }).click();
    } else {
        await page.getByRole("button", { name: "ثبت امتیاز", exact: true }).click();
    }
    return posts;
}

async function submitRating(page: Page, value: number, isClosing = false) {
    await page.getByRole("button", { name: new RegExp(`^${value} ستاره`) }).click();
    if (value <= 3) {
        await page.getByLabel("دلیل نارضایتی", { exact: true }).fill("پاسخ با تأخیر ارسال شد.");
    }
    await page.getByRole("dialog").getByRole("button", { name: isClosing ? "ثبت امتیاز و بستن گفتگو" : "ثبت امتیاز", exact: true }).click();
}

for (const ratingValue of [1, 2, 3]) {
    test(`${ratingValue} stars open the optional follow-up after successful rating and skip preserves the rating`, async ({ page }) => {
        const posts = await openConversation(page);
        await submitRating(page, ratingValue);
        const followUp = page.getByRole("dialog", { name: "چه مشکلی پیش آمد؟", exact: true });
        await expect(followUp).toBeVisible();
        await expect(page.getByLabel("توضیح کوتاه (اختیاری)")).toBeFocused();
        await expect(page.getByRole("button", { name: "ذخیره در این مرورگر", exact: true })).toBeDisabled();
        await page.getByRole("button", { name: "رد کردن", exact: true }).click();
        await expect(followUp).toBeHidden();
        await expect(page.getByRole("heading", { name: "گفتگوی نمونه", exact: true })).toBeFocused();
        await expect(page.getByRole("button", { name: "ثبت امتیاز", exact: true })).toBeHidden();
        expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
        expect(posts).toEqual([{ path: "/api/conversations/42/rate", payload: { rating_value: ratingValue, description: "پاسخ با تأخیر ارسال شد." } }]);
    });
}

for (const ratingValue of [4, 5]) {
    test(`${ratingValue} stars complete without an optional follow-up`, async ({ page }) => {
        const posts = await openConversation(page);
        await submitRating(page, ratingValue);
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(page.getByRole("button", { name: "ثبت امتیاز", exact: true })).toBeHidden();
        expect(posts).toEqual([{ path: "/api/conversations/42/rate", payload: { rating_value: ratingValue, description: null } }]);
    });
}

test("saving the optional explanation persists locally and makes no feedback request", async ({ page }) => {
    const posts = await openConversation(page);
    await submitRating(page, 3);
    await page.getByLabel("توضیح کوتاه (اختیاری)").fill("  توضیح تکمیلی درباره تأخیر  ");
    await page.getByRole("button", { name: "ذخیره در این مرورگر", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "فقط در این مرورگر ذخیره شد" })).toBeVisible();
    await expect(page.getByRole("button", { name: "تمام", exact: true })).toBeFocused();
    expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY) ?? "null")).toEqual({ ratingValue: 3, explanation: "توضیح تکمیلی درباره تأخیر" });
    expect(posts).toHaveLength(1);
    await page.getByRole("button", { name: "تمام", exact: true }).click();
    await expect(page.getByRole("heading", { name: "گفتگوی نمونه", exact: true })).toBeFocused();
    await page.reload();
    await expect(page.getByRole("dialog", { name: "چه مشکلی پیش آمد؟", exact: true })).toBeHidden();
    expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY) ?? "null")).toEqual({ ratingValue: 3, explanation: "توضیح تکمیلی درباره تأخیر" });
});

test("Escape skips the follow-up and restores focus without saving a draft", async ({ page }) => {
    const posts = await openConversation(page);
    await submitRating(page, 2);
    await page.getByLabel("توضیح کوتاه (اختیاری)").fill("توضیح ذخیره‌نشده");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "گفتگوی نمونه", exact: true })).toBeFocused();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    expect(posts).toHaveLength(1);
});

test("closing a conversation with a low rating opens the same optional follow-up", async ({ page }) => {
    const posts = await openConversation(page, { isOpen: true });
    await submitRating(page, 3, true);
    await expect(page.getByRole("dialog", { name: "چه مشکلی پیش آمد؟", exact: true })).toBeVisible();
    await expect(page.getByLabel("توضیح کوتاه (اختیاری)")).toBeFocused();
    await page.getByRole("button", { name: "رد کردن", exact: true }).click();
    await expect(page.getByText("این گفتگو بسته شده است", { exact: true })).toBeVisible();
    expect(posts).toEqual([{ path: "/api/conversations/42/close", payload: { rating_value: 3, closure_confirmed: true, description: "پاسخ با تأخیر ارسال شد." } }]);
});

test("a failed rating keeps the original dialog and does not open a follow-up", async ({ page }) => {
    await openConversation(page, { rejectRating: true });
    await submitRating(page, 3);
    await expect(page.getByRole("alert")).toContainText("ثبت امتیاز ناموفق بود.");
    await expect(page.getByRole("dialog", { name: "امتیازدهی به پشتیبان", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "چه مشکلی پیش آمد؟", exact: true })).toBeHidden();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test("unavailable local storage shows an error and still allows skipping", async ({ page }) => {
    await page.addInitScript(() => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key.startsWith("aio_rating_feedback:")) {
                throw new DOMException("Storage unavailable", "QuotaExceededError");
            }
            originalSetItem.call(this, key, value);
        };
    });
    const posts = await openConversation(page);
    await submitRating(page, 3);
    await page.getByLabel("توضیح کوتاه (اختیاری)").fill("توضیح حفظ می‌شود.");
    await page.getByRole("button", { name: "ذخیره در این مرورگر", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("ذخیره در این مرورگر امکان‌پذیر نیست.");
    await expect(page.getByLabel("توضیح کوتاه (اختیاری)")).toHaveValue("توضیح حفظ می‌شود.");
    await page.getByRole("button", { name: "رد کردن", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(posts).toHaveLength(1);
});

for (const theme of ["light", "dark"]) {
    test(`the follow-up fits mobile widths and traps keyboard focus in ${theme} mode`, async ({ page }) => {
        await page.addInitScript((value) => localStorage.setItem("aio_theme", value), theme);
        await openConversation(page);
        await submitRating(page, 3);
        const dialog = page.getByRole("dialog", { name: "چه مشکلی پیش آمد؟", exact: true });
        await page.getByLabel("توضیح کوتاه (اختیاری)").fill("توضیح اختیاری");
        for (const width of [320, 390, 768]) {
            await page.setViewportSize({ width, height: 600 });
            const bounds = await dialog.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, overflow: element.scrollWidth > element.clientWidth, direction: getComputedStyle(element).direction };
            });
            expect(bounds.left).toBeGreaterThanOrEqual(0);
            expect(bounds.right).toBeLessThanOrEqual(width);
            expect(bounds.top).toBeGreaterThanOrEqual(0);
            expect(bounds.bottom).toBeLessThanOrEqual(600);
            expect(bounds.overflow).toBe(false);
            expect(bounds.direction).toBe("rtl");
            await page.getByRole("button", { name: "رد کردن", exact: true }).focus();
            await page.keyboard.press("Tab");
            await expect(page.getByRole("button", { name: "بستن پرسش تکمیلی", exact: true })).toBeFocused();
            await page.keyboard.press("Shift+Tab");
            await expect(page.getByRole("button", { name: "رد کردن", exact: true })).toBeFocused();
        }
        await expect(page.getByLabel("توضیح کوتاه (اختیاری)")).toHaveAttribute("maxlength", "500");
    });
}
