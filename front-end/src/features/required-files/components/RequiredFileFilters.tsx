import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";

type RequiredFileFiltersProps = {
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
};

export function RequiredFileFilters({
    search,
    onSearchChange,
    onSearchSubmit,
}: RequiredFileFiltersProps) {
    return (
        <form
            className="relative flex-1"
            onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
            }}
            role="search"
            aria-label="جستجوی فایل‌های مورد نیاز"
        >
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-2" />
            <Input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="جستجو در عنوان و توضیحات… (Enter)"
                className="pr-11"
                aria-label="جستجوی فایل‌های مورد نیاز"
            />
        </form>
    );
}