/**
 * بخش محتوایی پنل (سورس جلسات، فایل‌های مورد نیاز و سوالات متداول) به دو
 * شاخه‌ی مستقل «وب» و «هوش مصنوعی» تقسیم شده است.
 *
 * سوپر ادمین هر دو شاخه را می‌بیند و می‌تواند به هر کدام که خواست اضافه کند؛
 * پشتیبان و ناظر اکانت فقط شاخه‌ی هم‌نوع خودشان را می‌بینند و همان‌جا هم
 * ثبت می‌کنند. سرور این محدودیت را خودش اعمال می‌کند؛ این مقدار فقط برای
 * فیلتر سوپر ادمین و برچسب‌های رابط کاربری است.
 */

export type SupportChannel = "web" | "ai";

/** گزینه‌ی فیلتر سوپر ادمین؛ «هر دو» یعنی بدون فیلتر. */
export type ChannelFilter = SupportChannel | "all";

export const SUPPORT_CHANNELS: {
    value: SupportChannel;
    label: string;
}[] = [
    { value: "web", label: "وب" },
    { value: "ai", label: "هوش مصنوعی" },
];

export const CHANNEL_FILTERS: {
    value: ChannelFilter;
    label: string;
}[] = [
    { value: "all", label: "هر دو بخش" },
    ...SUPPORT_CHANNELS,
];

export function channelLabel(
    channel: SupportChannel | null | undefined,
): string {
    return (
        SUPPORT_CHANNELS.find((item) => item.value === channel)?.label ??
        "وب"
    );
}