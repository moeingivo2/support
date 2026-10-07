export async function copyTextToClipboard(text: string): Promise<void> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
    } catch {
        // The browser can deny the Clipboard API; try its document fallback.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.insetInlineStart = "-10000px";
    textarea.style.top = "0";
    textarea.setAttribute("dir", "ltr");
    document.body.append(textarea);
    try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        if (!document.execCommand("copy")) {
            throw new Error("Clipboard write failed");
        }
    } finally {
        textarea.remove();
    }
}
