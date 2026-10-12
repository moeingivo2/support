import { useRef, type KeyboardEvent } from "react";
import {
    Braces,
    Check,
    ChevronDown,
    Code2,
    CornerDownLeft,
    Loader2,
    X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

type CodeEditorProps = {
    value: string;
    onChange: (value: string) => void;
    language: string;
    onLanguageChange: (language: string) => void;
    disabled?: boolean;
    onSubmit: () => void;
    canSubmit?: boolean;
    isSubmitting?: boolean;
    onClose?: () => void;
};

const LANGUAGES = [
    { value: "plain", label: "متن ساده" },
    { value: "python", label: "Python" },
    { value: "php", label: "PHP" },
    { value: "javascript", label: "JavaScript" },
    { value: "sql", label: "SQL" },
    { value: "bash", label: "Bash" },
    { value: "json", label: "JSON" },
];

const INDENT = "    ";

export function CodeEditor({
    value,
    onChange,
    language,
    onLanguageChange,
    disabled = false,
    onSubmit,
    canSubmit = true,
    isSubmitting = false,
    onClose,
}: CodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const lineNumbersRef = useRef<HTMLDivElement | null>(null);
    const lineCount = Math.max(1, value.split("\n").length);

    function updateValue(nextValue: string, selectionStart: number, selectionEnd = selectionStart) {
        onChange(nextValue);
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
        });
    }

    function indentSelection(textarea: HTMLTextAreaElement, outdent: boolean) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const nextNewline = value.indexOf("\n", end);
        const lineEnd = nextNewline === -1 ? value.length : nextNewline;
        const lines = value.slice(lineStart, lineEnd).split("\n");
        const lineStarts: number[] = [];
        let nextLineStart = lineStart;
        const nextLines = lines.map((line) => {
            lineStarts.push(nextLineStart);
            nextLineStart += line.length + 1;
            if (!outdent) {
                return `${INDENT}${line}`;
            }

            const removed = line.match(/^(?: {1,4}|\t)/)?.[0].length ?? 0;
            return line.slice(removed);
        });

        const nextBlock = nextLines.join("\n");
        const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
        const mapSelection = (position: number) => lineStarts.reduce((mappedPosition, currentLineStart, index) => {
            if (!outdent && currentLineStart <= position) {
                return mappedPosition + INDENT.length;
            }

            if (outdent && currentLineStart < position) {
                const removed = (lines[index] ?? "").match(/^(?: {1,4}|\t)/)?.[0].length ?? 0;
                return mappedPosition - Math.min(removed, position - currentLineStart);
            }

            return mappedPosition;
        }, position);

        const nextStart = mapSelection(start);
        const nextEnd = Math.max(nextStart, mapSelection(end));

        updateValue(nextValue, nextStart, nextEnd);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.nativeEvent.isComposing && event.key === "Enter") {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            if (canSubmit && !disabled) {
                onSubmit();
            }
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            indentSelection(event.currentTarget, event.shiftKey);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const textarea = event.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
            const indentation = value.slice(lineStart, start).match(/^\s*/)?.[0] ?? "";
            const insertion = `\n${indentation}`;
            updateValue(`${value.slice(0, start)}${insertion}${value.slice(end)}`, start + insertion.length);
        }
    }

    function handleScroll() {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }

    return (
        <section
            className="min-w-0 overflow-hidden rounded-2xl border border-hairline bg-surface-2 shadow-sm transition-colors focus-within:border-primary-line-2 focus-within:ring-2 focus-within:ring-primary-ring-2"
            aria-label="ویرایشگر کد"
        >
            <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-hairline bg-sunken px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-active-blue" aria-hidden="true">
                        <Code2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">نوشتن کد</h3>
                        <p className="text-[11px] text-ink-2">کد شما با قالب‌بندی اصلی ارسال می‌شود</p>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                    <label className="relative flex min-w-0 items-center">
                        <span className="sr-only">زبان کد</span>
                        <select
                            aria-label="زبان کد"
                            value={language}
                            onChange={(event) => onLanguageChange(event.target.value)}
                            disabled={disabled}
                            dir="ltr"
                            className="h-10 max-w-[10.5rem] appearance-none rounded-xl border border-hairline bg-surface-2 py-2 pl-3 pr-9 text-sm font-medium text-ink outline-none focus-visible:border-primary-line-2 focus-visible:ring-2 focus-visible:ring-primary-ring-2 disabled:opacity-50 sm:max-w-none"
                        >
                            {LANGUAGES.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 size-4 text-ink-2" aria-hidden="true" />
                    </label>
                    {onClose ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            disabled={disabled}
                            className="size-10 shrink-0"
                            aria-label="بازگشت به نوشتن پیام"
                            title="بازگشت به پیام"
                        >
                            <X aria-hidden="true" />
                        </Button>
                    ) : null}
                </div>
            </header>

            <div className="flex min-w-0 bg-surface-2" dir="ltr">
                <div
                    ref={lineNumbersRef}
                    aria-hidden="true"
                    className="w-11 shrink-0 overflow-hidden border-r border-hairline bg-sunken/70 py-3 text-right font-mono text-xs leading-6 text-ink-3 sm:w-12"
                >
                    {Array.from({ length: lineCount }, (_, index) => (
                        <div key={index + 1} className="h-6 px-2">{index + 1}</div>
                    ))}
                </div>
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    disabled={disabled}
                    dir="ltr"
                    wrap="off"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    aria-label="کد پیام"
                    placeholder="کد خود را اینجا جایگذاری کنید"
                    className="h-[min(17rem,42vh)] min-h-36 min-w-0 flex-1 resize-none overflow-auto whitespace-pre rounded-none border-0 bg-transparent px-3 py-3 font-mono text-left text-[13px] leading-6 text-ink outline-none transition-none placeholder:font-sans placeholder:text-sm placeholder:text-ink-3 hover:border-transparent  focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none disabled:cursor-not-allowed sm:h-[min(22rem,55vh)] sm:px-4"
                />
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-sunken px-3 py-2 sm:px-4">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-2" dir="rtl">
                    <Braces className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Tab تورفتگی می‌دهد؛ Shift+Tab آن را کم می‌کند</span>
                </p>
                {onClose ? (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={disabled}
                            className="h-11 flex-1 px-3 sm:flex-none"
                        >
                            بازگشت
                        </Button>
                        <Button
                            type="button"
                            onClick={onSubmit}
                            disabled={!canSubmit || disabled || isSubmitting}
                            className="h-11 flex-1 px-4 sm:flex-none"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Check aria-hidden="true" />}
                            {isSubmitting ? "در حال ارسال..." : "ارسال کد"}
                        </Button>
                    </div>
                ) : (
                    <p className="flex items-center gap-1 text-[11px] text-ink-3" dir="ltr">
                        <CornerDownLeft className="size-3" aria-hidden="true" />
                        Ctrl/⌘ + Enter برای ارسال
                    </p>
                )}
            </footer>
        </section>
    );
}
