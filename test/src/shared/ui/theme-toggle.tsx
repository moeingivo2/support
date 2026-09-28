import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/services/theme-context";
import { Button } from "@/shared/ui/button";
import { Tooltip } from "@/shared/ui/tooltip";

type ThemeToggleProps = {
    className?: string;
};

/**
 * دکمه تغییر تم — اندازه ثابت دارد تا هنگام تعویض، چیدمان جابه‌جا نشود.
 * در تم تیره آیکن خورشید (اقدام: روشن) و در تم روشن آیکن ماه (اقدام: تیره).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
    const { isDark, toggleTheme } = useTheme();
    const label = isDark ? "تغییر به تم روشن" : "تغییر به تم تیره";

    return (
        <Tooltip label={label}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={label}
                aria-pressed={!isDark}
                title={label}
                className={className}
            >
                {isDark ? (
                    <Sun className="icon-settle" />
                ) : (
                    <Moon className="icon-settle" />
                )}
            </Button>
        </Tooltip>
    );
}
