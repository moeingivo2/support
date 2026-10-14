import { expect, test, type Page } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:5174", channel: "chrome" });

async function openCourseStep(page: Page) {
    await page.goto("/register");
    await page.getByRole("button", { name: "ورود فوری به پنل" }).click();
    await expect(page.getByRole("region", { name: "در حال ورود به پنل" })).toBeHidden();
    await page.getByLabel("نام", { exact: true }).fill("دانشجو");
    await page.getByLabel("نام خانوادگی", { exact: true }).fill("نمونه");
    await page.getByLabel("شماره موبایل", { exact: true }).fill("09123456789");
    await page.getByLabel("رمز عبور", { exact: true }).fill("password123");
    await page.getByLabel("تکرار رمز عبور", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "ادامه: انتخاب دوره" }).click();
    await expect(page.getByRole("group", { name: "دوره‌ها", exact: true })).toBeVisible();
}

for (const theme of ["light", "dark"]) {
    test(`courses toggle independently with keyboard and selected styles in ${theme} mode`, async ({ page }) => {
        await page.addInitScript((value) => localStorage.setItem("aio_theme", value), theme);
        await openCourseStep(page);
        const offline = page.getByRole("checkbox", { name: "آفلاین", exact: true });
        const inPerson = page.getByRole("checkbox", { name: "حضوری", exact: true });
        const school = page.getByRole("checkbox", { name: "مدرسه", exact: true });
        const unselectedBackground = await school.locator("..").evaluate((label) => getComputedStyle(label).backgroundColor);
        const selectedBackground = await offline.locator("..").evaluate((label) => getComputedStyle(label).backgroundColor);
        await expect(offline).toBeChecked();
        await inPerson.focus();
        await page.keyboard.press("Space");
        await page.keyboard.press("Tab");
        await expect(school).toBeFocused();
        await page.keyboard.press("Space");
        await expect(offline).toBeChecked();
        await expect(inPerson).toBeChecked();
        await expect(school).toBeChecked();
        await expect(page.getByLabel("دوره اصلی", { exact: true })).toHaveValue("offline");
        await expect(school.locator("..")).toHaveCSS("background-color", selectedBackground);
        await page.keyboard.press("Space");
        await expect(school).not.toBeChecked();
        await expect(offline).toBeChecked();
        await expect(inPerson).toBeChecked();
        await expect(school.locator("..")).toHaveCSS("background-color", unselectedBackground);
        expect(selectedBackground).not.toBe(unselectedBackground);
    });
}

test("additional selections preserve offline details and the existing signup payload", async ({ page }) => {
    let payload: unknown;
    await page.route("**/api/register/student", async (route) => {
        payload = route.request().postDataJSON();
        await route.fulfill({ status: 422, json: { message: "خطای نمونه برای حفظ فرم" } });
    });
    await openCourseStep(page);
    await page.getByRole("button", { name: "وب مسیر یادگیری توسعه وب" }).click();
    await page.getByRole("button", { name: "جلسه 1", exact: true }).click();
    await page.getByRole("checkbox", { name: "حضوری", exact: true }).check();
    await page.getByRole("checkbox", { name: "مدرسه", exact: true }).check();
    await expect(page.getByRole("button", { name: "جلسه 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "ثبت‌نام و ورود", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("خطای نمونه برای حفظ فرم");
    expect(payload).toEqual({
        first_name: "دانشجو", last_name: "نمونه", phone: "0912 345 6789",
        password: "password123", password_confirmation: "password123",
        course: "offline", track: "web", sessions: [1],
    });
    await expect(page.getByRole("checkbox", { name: "مدرسه", exact: true })).toBeChecked();
});

test("removing the primary course selects a remaining course and an empty selection blocks signup", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/api/register/student")) requests.push(request.url());
    });
    await openCourseStep(page);
    await page.getByRole("checkbox", { name: "حضوری", exact: true }).check();
    await page.getByRole("checkbox", { name: "آفلاین", exact: true }).uncheck();
    await expect(page.getByLabel("دوره اصلی", { exact: true })).toHaveValue("in_person");
    await page.getByRole("checkbox", { name: "حضوری", exact: true }).uncheck();
    await expect(page.getByText("حداقل یک دوره را انتخاب کنید.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت‌نام و ورود", exact: true })).toBeDisabled();
    expect(requests).toEqual([]);
    await page.getByRole("checkbox", { name: "مدرسه", exact: true }).check();
    await expect(page.getByLabel("دوره اصلی", { exact: true })).toHaveValue("school");
    await expect(page.getByRole("button", { name: "ثبت‌نام و ورود", exact: true })).toBeEnabled();
});

test("the explicit primary selector preserves one course in the request", async ({ page }) => {
    let payload: unknown;
    await page.route("**/api/register/student", async (route) => {
        payload = route.request().postDataJSON();
        await route.fulfill({ status: 422, json: { message: "خطای نمونه برای حفظ فرم" } });
    });
    await openCourseStep(page);
    await page.getByRole("checkbox", { name: "حضوری", exact: true }).check();
    await page.getByLabel("دوره اصلی", { exact: true }).selectOption("in_person");
    await page.getByRole("button", { name: "ثبت‌نام و ورود", exact: true }).click();
    await expect(page.getByText("خطای نمونه برای حفظ فرم", { exact: true })).toBeVisible();
    expect(payload).toMatchObject({ course: "in_person", track: null, sessions: [] });
    expect(payload).not.toHaveProperty("selectedCourses");
    await expect(page.getByRole("checkbox", { name: "آفلاین", exact: true })).toBeChecked();
});

for (const path of ["/login", "/register"]) {
    test(`the ${path} header keeps the original logo size on the RTL right at mobile and tablet widths`, async ({ page }) => {
        await page.goto(path);
        await page.getByRole("button", { name: "ورود فوری به پنل" }).click();
        await expect(page.getByRole("region", { name: "در حال ورود به پنل" })).toBeHidden();
        for (const width of [320, 390, 768, 900]) {
            await page.setViewportSize({ width, height: 900 });
            const header = page.locator("header");
            await expect(header.locator("img")).toBeVisible();
            const layout = await header.evaluate((element) => {
                const [logo, text, action] = [...element.children].map((child) => child.getBoundingClientRect());
                return { logoWidth: logo!.width, logoRight: logo!.right, textRight: text!.right, textLeft: text!.left, actionRight: action!.right, overflow: element.scrollWidth > element.clientWidth };
            });
            expect(layout.logoWidth).toBe(58);
            expect(layout.logoRight).toBeGreaterThan(layout.textRight);
            expect(layout.textLeft).toBeGreaterThanOrEqual(layout.actionRight);
            expect(layout.overflow).toBe(false);
        }
    });
}
test("ordinary login opens chat without a support dialog", async ({ page }) => {
    await page.route("http://127.0.0.1:5174/api/**", (route) => route.fulfill({ json: route.request().method() === "POST"
        ? { user: { id: 1, name: "دانشجو", role: "student", email: null, phone: null }, token: "ordinary-login-preview" }
        : { data: route.request().url().includes("/profile") ? { remaining_chats: 12 } : [] } }));
    await page.goto("/login");
    await page.getByRole("button", { name: "ورود فوری به پنل" }).click();
    await expect(page.getByRole("region", { name: "در حال ورود به پنل" })).toBeHidden();
    await page.getByLabel("شماره موبایل", { exact: true }).fill("09123456789");
    await page.getByLabel("رمز عبور", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "شروع گفتگوی جدید" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ثبت نارضایتی از منتور" })).toBeVisible();
});
