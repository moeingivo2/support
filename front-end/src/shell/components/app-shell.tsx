import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, X, ChevronRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { getNavigation } from "@/shared/navigation";
import { useAuth } from "@/shared/services/auth-context";
import { Logo } from "@/shared/api/logo";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { cn } from "@/shared/lib/utils";

export default function AppShell({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, observerUser, returnToObserverAccount } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const activePath = location.pathname;
    const navigation = getNavigation(user);
    const homePath = user?.role === "observer" ? "/inbox" : "/";
    // روی صفحه‌ی اصلی چیزی برای برگشت نیست، پس دکمه مخفی می‌شود.
    const canGoBack = activePath !== homePath;

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <div className="app-canvas flex h-dvh overflow-hidden">
            <div className="mx-auto flex h-dvh w-full max-w-[1440px]">
                <aside className="hidden h-full w-[276px] shrink-0 flex-col border-l border-hairline bg-glass px-5 py-6 shadow-[-18px_0_45px_-35px_rgb(0_0_0/0.28)] backdrop-blur-xl lg:flex">
                    <div className="flex w-full flex-1 flex-col">
                        <Link
                            to={user?.role === "observer" ? "/inbox" : "/"}
                            className="mb-4 flex items-center gap-3 px-1"
                        >
                            <Logo size={44} />
                            <span>
                                <span className="block text-sm font-bold text-ink">
                                    {user?.role === "admin"
                                        ? "پنل سوپر ادمین"
                                        : user?.role === "observer"
                                          ? "پنل ناظر"
                                          : user?.role === "account_observer"
                                            ? "پنل ناظر اکانت"
                                          : "پنل پشتیبانی"}
                                </span>
                                <span className="block text-xs text-ink-2">
                                    AIO Support
                                </span>
                            </span>
                        </Link>
                        <span
                            className={cn(
                                "mb-6 mr-1 inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
                                user?.role === "admin" || user?.role === "observer"
                                    ? "bg-warn-soft text-alret-gold ring-warn-ring"
                                    : "bg-primary-soft text-accent-ink ring-primary-ring",
                            )}
                        >
                            {user?.role === "admin"
                                ? "دسترسی سوپر ادمین"
                                : user?.role === "observer"
                                  ? "دسترسی ناظر — فقط‌خواندنی"
                                  : user?.role === "account_observer"
                                    ? "ناظر اکانت — دسترسی پشتیبانی"
                                  : user?.support_type === "ai"
                                    ? "پشتیبان هوش مصنوعی"
                                    : "پشتیبان وب"}
                        </span>
                        <DesktopNavigation
                            navigation={navigation}
                            activePath={activePath}
                        />
                    </div>
                </aside>
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-hairline bg-glass px-4 backdrop-blur-xl md:h-20 md:px-7">
                        {observerUser ? (
                            <Button type="button" variant="ghost" onClick={() => { returnToObserverAccount(); navigate("/observer-schedules", { replace: true }); }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 md:right-7">
                                <ChevronRight />بازگشت به اکانت ناظر
                            </Button>
                        ) : null}
                        <Dialog.Root
                            open={mobileMenuOpen}
                            onOpenChange={setMobileMenuOpen}
                        >
                            <Dialog.Trigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    aria-label="باز کردن منو"
                                >
                                    <Menu />
                                </Button>
                            </Dialog.Trigger>
                            <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
                                <Dialog.Content className="fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-[320px] flex-col border-l border-hairline bg-surface px-5 py-6">
                                    <div className="mb-6 flex items-center justify-between gap-3">
                                        <Dialog.Title className="text-sm font-bold text-ink">
                                            منوی پنل
                                        </Dialog.Title>
                                        <div className="flex items-center gap-1">
                                            <ThemeToggle />
                                            <Dialog.Close asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="بستن منو"
                                                >
                                                    <X />
                                                </Button>
                                            </Dialog.Close>
                                        </div>
                                    </div>
                                    <MobileNavigation
                                        navigation={navigation}
                                        activePath={activePath}
                                        onNavigate={() =>
                                            setMobileMenuOpen(false)
                                        }
                                    />
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>
                        {/*
                            دکمه بازگشت در انتهای هدر می‌نشیند تا در RTL به
                            گوشه‌ی راست بیفتد؛ اگر اولین فرزند گروه
                            mr-auto باشد، همان سمت چپ می‌افتد.
                        */}
                        {canGoBack ? (
                            <BackButton
                                fallbackPath={homePath}
                                className="max-md:px-2.5"
                            />
                        ) : null}
                        {/* mr-auto مثل قبل گروه را به لبه می‌چسباند؛ فقط
                            دکمه بازگشت از آن بیرون آمده و سمت راست نشسته. */}
                        <div className="mr-auto flex items-center gap-2">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary-line bg-primary-soft text-sm font-bold text-accent-ink">
                                {getUserInitial(user?.name)}
                            </span>
                            <span className="hidden min-w-0 text-right md:block">
                                <span className="block max-w-40 truncate text-sm font-semibold text-ink">
                                    {user?.name ?? "کاربر"}
                                </span>
                                <span className="block text-xs text-ink-2">
                                    {formatRoleLabel(user)}
                                </span>
                            </span>
                            <span className="hidden lg:block">
                                <ThemeToggle />
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                aria-label="خروج از حساب"
                            >
                                <LogOut />
                            </Button>
                        </div>
                    </header>
            {/* صفحه‌های چت خودشان اسکرول داخلی دارند و min-h-0 لازم دارند؛
                بقیه‌ی صفحه‌ها بلندتر از دید هستند و overflow-y-auto اسکرول
                را همین‌جا نگه می‌دارد. */}
            <main className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-6 md:px-7 md:py-8">
                {children}
            </main>
                </div>
            </div>
        </div>
    );
}

function DesktopNavigation({
    activePath,
    navigation,
}: {
    activePath: string;
    navigation: ReturnType<typeof getNavigation>;
}) {
    return (
        <nav
            className="flex-1 space-y-1.5 overflow-y-auto"
            aria-label="منوی پنل"
        >
            {navigation.map((item) => (
                <NavigationLink
                    key={item.path}
                    item={item}
                    activePath={activePath}
                />
            ))}
        </nav>
    );
}

function MobileNavigation({
    activePath,
    navigation,
    onNavigate,
}: {
    activePath: string;
    navigation: ReturnType<typeof getNavigation>;
    onNavigate: () => void;
}) {
    return (
        <nav
            className="flex-1 space-y-1.5 overflow-y-auto"
            aria-label="منوی پنل"
        >
            {navigation.map((item) => (
                <NavigationLink
                    key={item.path}
                    item={item}
                    activePath={activePath}
                    onNavigate={onNavigate}
                />
            ))}
        </nav>
    );
}

function NavigationLink({
    activePath,
    item,
    onNavigate,
}: {
    activePath: string;
    item: { label: string; path: string; icon: typeof LayoutDashboard };
    onNavigate?: () => void;
}) {
    const active = activePath === item.path;

    return (
        <Link
            to={item.path}
            onClick={onNavigate}
            className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-out before:absolute before:right-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-active-blue before:opacity-0 before:shadow-[0_0_14px_var(--c-glow-accent)] before:transition-opacity",
                active
                    ? "border-primary-line bg-primary-soft text-accent-ink shadow-[0_10px_25px_-22px_var(--c-glow-accent)] before:opacity-100"
                    : "text-ink-2 hover:border-hairline hover:bg-surface-2 hover:text-ink",
            )}
            aria-current={active ? "page" : undefined}
        >
            <item.icon />
            {item.label}
        </Link>
    );
}

function getUserInitial(name: string | undefined): string {
    return name?.trim().charAt(0) || "؟";
}

function formatRoleLabel(
    user: { role: string; support_type?: string | null } | null,
): string {
    if (!user) return "کاربر";
    if (user.role === "admin") return "سوپر ادمین";
    if (user.role === "observer") return "ناظر";
    if (user.role === "account_observer") return user.support_type === "ai" ? "ناظر اکانت هوش مصنوعی" : "ناظر اکانت وب";
    return user.support_type === "ai" ? "پشتیبان هوش مصنوعی" : "پشتیبان وب";
}
