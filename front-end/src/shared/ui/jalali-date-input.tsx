import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import {
    EMPTY_DATE,
    jalaliMonthName,
    jalaliToGregorian,
    pad2,
    parseJalaliDigits,
    toJalaliParts,
    todayJalali,
    type JalaliDate,
} from "@/shared/lib/jalali";
import { toPersianDigits } from "@/features/student-chat/utils/persian";

/**
 * انتخابگر تاریخ شمسی.
 *
 * ‎<input type="date">‎ مرورگر همیشه میلادی نشان می‌دهد و تقویم بومی
 * لپ‌تاپ لپ‌تاپ می‌رود؛ برای کاربر ایرانی این یعنی انتخاب اشتباه تاریخ
 * در هر بازه‌ی گزارش. این کامپوننت یک تقویم شمسی می‌سازد ولی مقدارِ
 * نهایی را میلادی (`YYYY-MM-DD`) نگه می‌دارد چون سرور با همان اعتبارسنجی
 * می‌کند.
 */

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** پهنای پنجره‌ی تقویم (پیکسل) — باید با `w-72` هماهنگ باشد. */
const CALENDAR_WIDTH = 288;

/** ارتفاع تقریبی پنجره، برای تصمیمِ «باز شود بالا یا پایین». */
const CALENDAR_HEIGHT = 340;

/** تعداد روزهای هر ماه شمسی برای سال داده‌شده. */
function daysInJalaliMonth(year: number, month: number): number {
    if (month <= 6) {
        return 31;
    }

    if (month <= 11) {
        return 30;
    }

    // اسفند: ۲۹ روز، و در سال کبیسه ۳۰ روز.
    return isJalaliLeapYear(year) ? 30 : 29;
}

/**
 * سال کبیسه‌ی شمسی.
 *
 * چرخه‌ی ۲۹ ساله: سال‌هایی که به ۳ یا ۲ (بجز سال‌های ۱۲ و ۲۹) بخش‌پذیر
 * باشند، کبیسه‌اند.
 */
function isJalaliLeapYear(year: number): boolean {
    const remainder = ((year % 33) + 33) % 33;

    if (remainder === 1) {
        return false;
    }

    return remainder % 4 === 1 || remainder % 4 === 2;
}

/** روزِ هفته‌ی اولِ ماه شمسی؛ ۰ = شنبه. */
function firstWeekdayOfJalaliMonth(year: number, month: number): number {
    const gregorian = jalaliToGregorian(year, month, 1);

    if (gregorian === null) {
        return 0;
    }

    // getDay(): 0 = یکشنبه. تبدیل به ۰ = شنبه.
    const dayOfWeek = new Date(gregorian).getDay();

    return (dayOfWeek + 1) % 7;
}

/**
 * ارقام لاتینِ یک عدد را فارسی می‌کند.
 *
 * برای نمایش. ورودی‌ها همیشه عددِ ساده‌اند (سال/ماه/روز)، پس نیازی به
 * نگه‌داشتن منطقِ تبدیل در دو جا نیست.
 */
function digits(value: number | string): string {
    return toPersianDigits(value);
}

export type JalaliDateInputProps = {
    /** مقدار میلادی به قالب `YYYY-MM-DD`؛ رشته‌ی خالی یعنی «انتخاب نشده». */
    value: string;
    onChange: (value: string) => void;
    id?: string;
    /** متن جایگزینِ داخل فیلد وقتی تاریخی انتخاب نشده است. */
    placeholder?: string;
    disabled?: boolean;
    /** کمینه/بیشینه به قالب `YYYY-MM-DD` میلادی. */
    min?: string;
    max?: string;
    className?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};

/**
 * ورودی تاریخ شمسی با تقویم بازشونده.
 *
 * تایپ دستی هم پذیرفته می‌شود (`۱۴۰۵/۰۷/۲۲` یا `1405-07-22`) چون
 * باز کردن تقویم برای بازه‌های گزارش کند است. مقدار فقط وقتی معتبر باشد
 * بالا می‌رود، پس تایپ نیمه‌کاره قیمتی ندارد.
 */
export function JalaliDateInput({
    value,
    onChange,
    id,
    placeholder = "انتخاب تاریخ",
    disabled = false,
    min,
    max,
    className,
    ...aria
}: JalaliDateInputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [invalid, setInvalid] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const calendarId = useId();

    // مختصاتِ پنجره‌ی شناور. تقویم داخل یک ‎Card‎ رندر می‌شود و Card
    // ‎overflow-hidden‎ دارد، پس اگر ‎absolute‎ باشد بریده می‌شود؛ به
    // ‎body‎ پورت می‌شود و با ‎position: fixed‎ خودش را جا می‌اندازد.
    const [anchor, setAnchor] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);

    const selected = useMemo(() => gregorianParts(value), [value]);
    const [viewYear, setViewYear] = useState(
        () => selected?.year ?? todayJalali().year,
    );
    const [viewMonth, setViewMonth] = useState(
        () => selected?.month ?? todayJalali().month,
    );

    // هر بار که مقدار بیرونی عوض می‌شود، متن فیلد هم باید عوض شود.
    useEffect(() => {
        setText(selected ? formatJalaliValue(selected) : "");
        setInvalid(false);
    }, [selected?.year, selected?.month, selected?.day]);

    const placePopup = useCallback(() => {
        const box = wrapperRef.current?.getBoundingClientRect();

        if (box === undefined) {
            return;
        }

        const width = Math.max(box.width, CALENDAR_WIDTH);
        const viewportWidth = window.innerWidth;
        const margin = 8;

        // اگر جا نبود، به سمت چپِ میدان دید می‌رود تا از لبه بیرون نزند.
        const left = Math.min(
            Math.max(box.left, margin),
            Math.max(margin, viewportWidth - width - margin),
        );

        const below = window.innerHeight - box.bottom;
        const flip = below < CALENDAR_HEIGHT + margin && box.top > below;

        const top = flip
            ? Math.max(margin, box.top - CALENDAR_HEIGHT - 8)
            : box.bottom + 8;

        setAnchor({ top, left, width });
    }, []);

    // بستن تقویم با کلیک بیرون از آن.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            const insideAnchor = wrapperRef.current?.contains(target) ?? false;
            const insidePopup = popupRef.current?.contains(target) ?? false;

            if (!insideAnchor && !insidePopup) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        const onReflow = () => placePopup();

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", onReflow);
        window.addEventListener("scroll", onReflow, true);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onReflow);
            window.removeEventListener("scroll", onReflow, true);
        };
    }, [open, placePopup]);

    useEffect(() => {
        if (open) {
            placePopup();
        } else {
            setAnchor(null);
        }
    }, [open, placePopup]);

    const commit = useCallback(
        (jalali: JalaliDate) => {
            const gregorian = jalaliToGregorian(
                jalali.year,
                jalali.month,
                jalali.day,
            );

            if (gregorian === null) return;

            // محدوده هم مثل سرور رعایت می‌شود تا کاربر بتواند بازه‌ای
            // بسازد که بعداً 422 می‌گیرد.
            if (min !== undefined && gregorian < min) return;
            if (max !== undefined && gregorian > max) return;

            onChange(gregorian);
            setOpen(false);
        },
        [max, min, onChange],
    );

    const handleTyped = (raw: string) => {
        setText(raw);
        setInvalid(false);

        const jalali = parseTypedJalali(raw);

        if (jalali === null) {
            setInvalid(raw.trim() !== "");
            return;
        }

        const gregorian = jalaliToGregorian(
            jalali.year,
            jalali.month,
            jalali.day,
        );

        if (gregorian === null) {
            setInvalid(true);
            return;
        }

        if (
            (min !== undefined && gregorian < min) ||
            (max !== undefined && gregorian > max)
        ) {
            setInvalid(true);
            return;
        }

        setViewYear(jalali.year);
        setViewMonth(jalali.month);
        onChange(gregorian);
    };

    const days = useMemo(
        () => buildMonthGrid(viewYear, viewMonth),
        [viewYear, viewMonth],
    );
    const today = todayJalali();

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)}>
            <Input
                id={inputId}
                value={text}
                placeholder={placeholder}
                disabled={disabled}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={invalid || aria["aria-invalid"]}
                aria-describedby={aria["aria-describedby"]}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls={open ? calendarId : undefined}
                onChange={(event) => handleTyped(event.target.value)}
                onFocus={() => {
                    if (selected) {
                        setViewYear(selected.year);
                        setViewMonth(selected.month);
                    }
                    setOpen(true);
                }}
                onBlur={() => {
                    // اگر کاربر چیزی نوشته که تاریخ معتبری نیست، متن به
                    // آخرین مقدار معتبر برمی‌گردد.
                    if (invalid) {
                        setText(selected ? formatJalaliValue(selected) : "");
                        setInvalid(false);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        const jalali = parseTypedJalali(text);
                        if (jalali !== null) {
                            commit(jalali);
                        }
                    }
                }}
            />
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                disabled={disabled}
                aria-label={open ? "بستن تقویم" : "باز کردن تقویم"}
                className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-2xl text-ink-3 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 disabled:opacity-50"
            >
                <CalendarDays className="size-4.5" aria-hidden />
            </button>

            {open && anchor !== null
                ? createPortal(
                      <div
                          ref={popupRef}
                          id={calendarId}
                          role="dialog"
                          aria-label="تقویم"
                          // ‎fixed‎ + پورت به body: از ‎overflow-hidden‎ کارت و
                          // ‎backdrop-filter‎ آن بیرون می‌ماند و بریده نمی‌شود.
                          style={{
                              top: `${anchor.top}px`,
                              left: `${anchor.left}px`,
                              width: `${anchor.width}px`,
                          }}
                          className="fixed z-[70] rounded-2xl border border-hairline-strong bg-surface p-3 text-ink shadow-[0_28px_80px_-28px_var(--c-shadow-color)] ring-1 ring-hairline-strong/40"
                      >
                          <div className="mb-2 flex items-center justify-between gap-1">
                              <button
                                  type="button"
                                  onClick={() => shiftMonth(-1)}
                                  aria-label="ماه قبل"
                                  className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-primary-soft hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                              >
                                  <ChevronRight
                                      className="size-4"
                                      aria-hidden
                                  />
                              </button>
                              <span className="text-sm font-bold">
                                  {digits(jalaliMonthName(viewMonth))}{" "}
                                  {digits(viewYear)}
                              </span>
                              <button
                                  type="button"
                                  onClick={() => shiftMonth(1)}
                                  aria-label="ماه بعد"
                                  className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-primary-soft hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                              >
                                  <ChevronLeft className="size-4" aria-hidden />
                              </button>
                          </div>

                          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-ink-3">
                              {WEEKDAY_LABELS.map((label, index) => (
                                  <span key={index} aria-hidden>
                                      {label}
                                  </span>
                              ))}
                          </div>

                          <div className="mt-1 grid grid-cols-7 gap-0.5">
                              {days.map((cell) =>
                                  cell === null ? (
                                      <span key="pad" aria-hidden />
                                  ) : (
                                      <button
                                          key={cell.day}
                                          type="button"
                                          onClick={() =>
                                              commit({
                                                  year: viewYear,
                                                  month: viewMonth,
                                                  day: cell.day,
                                              })
                                          }
                                          aria-current={
                                              today.year === viewYear &&
                                              today.month === viewMonth &&
                                              today.day === cell.day
                                                  ? "date"
                                                  : undefined
                                          }
                                          aria-pressed={
                                              selected?.year === viewYear &&
                                              selected?.month === viewMonth &&
                                              selected?.day === cell.day
                                          }
                                          className={cn(
                                              "grid h-9 place-items-center rounded-lg text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                              selected?.year === viewYear &&
                                                  selected?.month ===
                                                      viewMonth &&
                                                  selected?.day === cell.day
                                                  ? "bg-accent text-white"
                                                  : today.year === viewYear &&
                                                      today.month ===
                                                          viewMonth &&
                                                      today.day === cell.day
                                                    ? "bg-primary-soft font-bold text-accent-ink"
                                                    : "text-ink hover:bg-primary-soft hover:text-accent-ink",
                                          )}
                                      >
                                          {digits(pad2(cell.day))}
                                      </button>
                                  ),
                              )}
                          </div>

                          <button
                              type="button"
                              onClick={() => commit(today)}
                              className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-accent-ink transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                          >
                              امروز
                          </button>
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );

    function shiftMonth(delta: number): void {
        let nextMonth = viewMonth + delta;
        let nextYear = viewYear;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        } else if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        }

        setViewMonth(nextMonth);
        setViewYear(nextYear);
    }
}

/** نمایش داخل فیلد: «۱۴۰۵/۰۷/۲۲». */
function formatJalaliValue(value: JalaliDate): string {
    return digits(`${value.year}/${pad2(value.month)}/${pad2(value.day)}`);
}

/**
 * متن تایپ‌شده را به تاریخ شمسی تبدیل می‌کند.
 *
 * هر سه قالب رایج پذیرفته می‌شود: ‎۱۴۰۵/۰۷/۲۲‎، ‎۱۴۰۵-۷-۲۲‎ و
 * ‎۲۲ مهر ۱۴۰۵‎. برای تشخیص اینکه کدام عدد روز است و کدام سال، از
 * اندازه‌ی عدد استفاده می‌شود: سال همیشه ۱۰۰۰ به بالاست و روز هرگز.
 */
function parseTypedJalali(raw: string): JalaliDate | null {
    const numbers = raw
        .split(/[^\d]+/)
        .map((part) => parseJalaliDigits(part))
        .filter((part) => part > 0);

    if (numbers.length !== 3) {
        return null;
    }

    // سال همیشه ۱۰۰۰ به بالاست و روز/ماه هرگز، پس جای سال قابل تشخیص است.
    const yearIndex = numbers.findIndex((part) => part >= 1000);

    if (yearIndex === -1) {
        return null;
    }

    const year = numbers[yearIndex];

    if (year === undefined) {
        return null;
    }

    const others = numbers.filter((_, index) => index !== yearIndex);

    if (others.length !== 2) {
        return null;
    }

    // ترتیب بقیه بسته به جای سال فرق می‌کند: ‎۱۴۰۵/۰۷/۲۲‎ ماه-روز است
    // ولی ‎۲۲ مهر ۱۴۰۵‎ روز-ماه.
    const first = others[0];
    const second = others[1];

    if (first === undefined || second === undefined) {
        return null;
    }

    // ترتیب بقیه بسته به جای سال فرق می‌کند: ‎۱۴۰۵/۰۷/۲۲‎ ماه-روز است
    // ولی ‎۲۲ مهر ۱۴۰۵‎ روز-ماه.
    const month = yearIndex === 0 ? first : second;
    const day = yearIndex === 0 ? second : first;

    if (month > 12 || day > 31 || day < 1) {
        return null;
    }

    return { year, month, day };
}

/** بخش‌های شمسیِ یک مقدار میلادی. */
function gregorianParts(value: string): JalaliDate | null {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (matched === null) {
        return null;
    }

    const [, year, month, day] = matched;

    if (year === undefined || month === undefined || day === undefined) {
        return null;
    }

    // محلی و نه UTC، وگرنه در منطقه‌ی زمانیِ جلوتر از UTC یک روز عقب می‌افتد.
    return toJalaliParts(
        new Date(Number(year), Number(month) - 1, Number(day)),
    );
}

type MonthCell = { day: number } | null;

/** شبکه‌ی ۶×۷ تقویم برای یک ماه شمسی. */
function buildMonthGrid(year: number, month: number): MonthCell[] {
    const leading = firstWeekdayOfJalaliMonth(year, month);
    const total = daysInJalaliMonth(year, month);
    const cells: MonthCell[] = [];

    for (let index = 0; index < leading; index++) {
        cells.push(null);
    }

    for (let day = 1; day <= total; day++) {
        cells.push({ day });
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return cells;
}

/**
 * انتخابگر بازه‌ی تاریخ شمسی (از / تا).
 *
 * مقدار بیرونی همچنان میلادی است تا با سرور و query string هماهنگ بماند.
 */
export function JalaliDateRangeInput({
    from,
    to,
    onFromChange,
    onToChange,
    fromId,
    toId,
    fromLabel,
    toLabel,
    disabled = false,
    className,
    ...aria
}: {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    fromId?: string;
    toId?: string;
    fromLabel?: string;
    toLabel?: string;
    disabled?: boolean;
    className?: string;
} & Pick<ComponentProps<"input">, "aria-describedby" | "aria-invalid">) {
    return (
        <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
            <div className="space-y-2">
                {fromLabel ? (
                    <label
                        className="block text-sm font-medium text-ink-2"
                        htmlFor={fromId}
                    >
                        {fromLabel}
                    </label>
                ) : null}
                <JalaliDateInput
                    id={fromId}
                    value={from}
                    onChange={onFromChange}
                    max={to || undefined}
                    placeholder="از تاریخ"
                    disabled={disabled}
                    {...aria}
                />
            </div>
            <div className="space-y-2">
                {toLabel ? (
                    <label
                        className="block text-sm font-medium text-ink-2"
                        htmlFor={toId}
                    >
                        {toLabel}
                    </label>
                ) : null}
                <JalaliDateInput
                    id={toId}
                    value={to}
                    onChange={onToChange}
                    min={from || undefined}
                    placeholder="تا تاریخ"
                    disabled={disabled}
                    {...aria}
                />
            </div>
        </div>
    );
}

/** «۱۴۰۵/۰۷/۲۲» برای نمایش فشرده در جاهای تنگ (مثل کارت فیلتر). */
export function formatJalaliCompact(value: string): string {
    const parts = gregorianParts(value);

    return parts === null ? EMPTY_DATE : digits(formatJalaliValue(parts));
}
