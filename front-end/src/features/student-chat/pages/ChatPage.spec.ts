/// <reference types="node" />

import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:5174", channel: "chrome" });

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("aio_token", "support-request-preview");
        localStorage.setItem("aio_user", JSON.stringify({ id: 1, name: "دانشجو", role: "student", email: null, phone: null }));
    });
    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
        const url = route.request().url();
        await route.fulfill({ json: { data: url.includes("/profile") ? { remaining_chats: 12 } : [] } });
    });
    await page.goto("/chat");
    await page.getByRole("button", { name: "ورود فوری به پنل" }).click();
    await expect(page.getByRole("region", { name: "در حال ورود به پنل" })).toBeHidden();
    await page.getByRole("button", { name: "درخواست تیکت پشتیبانی", exact: true }).click();
});

test("blank requests show labeled errors without making API requests and Escape restores focus", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
        if (request.method() === "POST") posts.push(request.url());
    });
    await expect(page.getByLabel("موضوع", { exact: true })).toBeFocused();
    await page.getByLabel("موضوع", { exact: true }).fill("   ");
    await page.getByLabel("متن درخواست", { exact: true }).fill("   ");
    await page.getByRole("button", { name: "ارسال درخواست", exact: true }).click();
    await expect(page.getByLabel("موضوع", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("موضوع درخواست را بنویسید.", { exact: true })).toBeVisible();
    await expect(page.getByText("متن درخواست را بنویسید.", { exact: true })).toBeVisible();
    expect(posts).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "درخواست تیکت پشتیبانی", exact: true })).toBeFocused();
});

test("support requests use the existing title and message payloads and open the created conversation", async ({ page }) => {
    const payloads: unknown[] = [];
    await page.route("**/api/conversations", async (route) => {
        if (route.request().method() === "POST") {
            payloads.push(route.request().postDataJSON());
            await route.fulfill({ status: 201, json: { data: { id: 42, title: "#1" } } });
        } else {
            await route.fulfill({ json: { data: [] } });
        }
    });
    await page.route("**/api/conversations/42/messages", async (route) => {
        payloads.push(route.request().postDataJSON());
        await route.fulfill({ json: { message: "ارسال شد", data: { id: 10 } } });
    });
    await page.getByLabel("موضوع", { exact: true }).fill("  دسترسی به دوره  ");
    await page.getByLabel("متن درخواست", { exact: true }).fill("  لطفاً دسترسی را بررسی کنید.  ");
    await page.getByRole("button", { name: "ارسال درخواست", exact: true }).click();
    await expect(page.getByText("درخواست شما برای پشتیبانی ارسال شد.", { exact: true })).toBeVisible();
    expect(payloads).toEqual([
        { title: "دسترسی به دوره" },
        { body: "موضوع: دسترسی به دوره\n\nلطفاً دسترسی را بررسی کنید.", code_mode: false, language: null },
    ]);
    await page.getByRole("button", { name: "مشاهده گفتگو", exact: true }).click();
    await expect(page).toHaveURL(/\/chat\?c=42$/);
});

test("a failed message keeps the draft and retries in the same conversation", async ({ page }) => {
    let creates = 0;
    let sends = 0;
    await page.route("**/api/conversations", async (route) => {
        if (route.request().method() === "POST") {
            creates++;
            await route.fulfill({ status: 201, json: { data: { id: 42 } } });
        } else {
            await route.fulfill({ json: { data: [] } });
        }
    });
    await page.route("**/api/conversations/42/messages", async (route) => {
        sends++;
        await route.fulfill(sends === 1
            ? { status: 422, json: { message: "ارسال پیام ناموفق بود." } }
            : { json: { message: "ارسال شد", data: { id: 10 } } });
    });
    await page.getByLabel("موضوع", { exact: true }).fill("درخواست راهنمایی");
    await page.getByLabel("متن درخواست", { exact: true }).fill("متن حفظ می‌شود.");
    await page.getByRole("button", { name: "ارسال درخواست", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("ارسال پیام ناموفق بود.");
    await expect(page.getByLabel("متن درخواست", { exact: true })).toHaveValue("متن حفظ می‌شود.");
    await page.getByRole("button", { name: "بستن درخواست پشتیبانی" }).click();
    await page.getByRole("button", { name: "درخواست تیکت پشتیبانی", exact: true }).click();
    await page.getByRole("button", { name: "تلاش مجدد", exact: true }).click();
    await expect(page.getByText("درخواست شما برای پشتیبانی ارسال شد.", { exact: true })).toBeVisible();
    expect(creates).toBe(1);
    expect(sends).toBe(2);
});

test("creation errors preserve the form and allow retry", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/conversations", async (route) => {
        if (route.request().method() === "POST") {
            attempts++;
            await route.fulfill(attempts === 1
                ? { status: 403, json: { message: "ساخت گفتگو ناموفق بود." } }
                : { status: 201, json: { data: { id: 42 } } });
        } else {
            await route.fulfill({ json: { data: [] } });
        }
    });
    await page.route("**/api/conversations/42/messages", (route) => route.fulfill({ json: { data: { id: 10 } } }));
    await page.getByLabel("موضوع", { exact: true }).fill("راهنمایی");
    await page.getByLabel("متن درخواست", { exact: true }).fill("نیاز به راهنمایی دارم.");
    await page.getByRole("button", { name: "ارسال درخواست", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("ساخت گفتگو ناموفق بود.");
    await expect(page.getByLabel("موضوع", { exact: true })).toHaveValue("راهنمایی");
    await page.getByRole("button", { name: "تلاش مجدد", exact: true }).click();
    await expect(page.getByText("درخواست شما برای پشتیبانی ارسال شد.", { exact: true })).toBeVisible();
    expect(attempts).toBe(2);
});

test("attachments use the existing multipart fields and can be removed", async ({ page }) => {
    let upload = "";
    await page.route("**/api/conversations", (route) => route.fulfill({ json: { data: route.request().method() === "POST" ? { id: 42 } : [] } }));
    await page.route("**/api/conversations/42/messages", async (route) => {
        upload = route.request().postData() ?? "";
        expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
        await route.fulfill({ json: { data: { id: 10 } } });
    });
    await page.getByLabel("موضوع", { exact: true }).fill("پیوست درخواست");
    await page.getByLabel("متن درخواست", { exact: true }).fill("فایل نمونه پیوست شد.");
    const file = { name: "example.txt", mimeType: "text/plain", buffer: Buffer.from("support attachment") };
    await page.getByLabel("پیوست (اختیاری)").setInputFiles(file);
    await expect(page.getByText("example.txt", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "حذف پیوست" }).click();
    await expect(page.getByText("example.txt", { exact: true })).toBeHidden();
    await page.getByLabel("پیوست (اختیاری)").setInputFiles(file);
    await page.getByRole("button", { name: "ارسال درخواست", exact: true }).click();
    await expect(page.getByText("درخواست شما برای پشتیبانی ارسال شد.", { exact: true })).toBeVisible();
    expect(upload).toContain('name="body"');
    expect(upload).toContain('name="code_mode"');
    expect(upload).toContain('name="attachment"; filename="example.txt"');
    expect(upload).toContain("support attachment");
    expect(upload).not.toContain('name="subject"');
});

test("the dialog and topbar fit mobile and tablet widths in both themes", async ({ page }) => {
    for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
        for (const width of [320, 390, 768, 900]) {
            await page.setViewportSize({ width, height: 640 });
            const bounds = await page.getByRole("dialog").evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, overflow: element.scrollWidth > element.clientWidth, direction: getComputedStyle(element).direction };
            });
            expect(bounds.left).toBeGreaterThanOrEqual(0);
            expect(bounds.right).toBeLessThanOrEqual(width);
            expect(bounds.top).toBeGreaterThanOrEqual(0);
            expect(bounds.bottom).toBeLessThanOrEqual(640);
            expect(bounds.overflow).toBe(false);
            expect(bounds.direction).toBe("rtl");
        }
    }
    await page.keyboard.press("Escape");
    for (const width of [320, 768, 900, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const layout = await page.locator("header").first().evaluate((element) => {
            const [brand, actions] = [...element.firstElementChild!.children].map((child) => child.getBoundingClientRect());
            return { overlap: actions!.right > brand!.left, overflow: element.scrollWidth > element.clientWidth };
        });
        expect(layout).toEqual({ overlap: false, overflow: false });
        if (width < 1024) {
            await expect(page.getByRole("button", { name: "باز کردن منو", exact: true })).toBeVisible();
        }
    }
});
