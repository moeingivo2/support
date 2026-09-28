export type CourseOption = {
    value: "offline" | "in_person" | "school";
    label: string;
    description: string;
};

export type TrackOption = {
    value: "ai" | "web";
    label: string;
    description: string;
};

export const COURSE_OPTIONS: CourseOption[] = [
    {
        value: "offline",
        label: "آفلاین",
        description: "دوره آنلاین با جلسات مشخص و پشتیبانی نوشتاری",
    },
    {
        value: "in_person",
        label: "حضوری",
        description: "دوره حضوری در مرکز آموزش",
    },
    {
        value: "school",
        label: "مدرسه",
        description: "دوره ویژه مدارس",
    },
];

export const TRACK_OPTIONS: TrackOption[] = [
    {
        value: "ai",
        label: "هوش مصنوعی",
        description: "مسیر یادگیری هوش مصنوعی و مدل‌های زبانی",
    },
    {
        value: "web",
        label: "وب",
        description: "مسیر یادگیری توسعه وب",
    },
];

export const TOTAL_SESSIONS = 10;

export function courseLabel(value: string): string {
    return (
        COURSE_OPTIONS.find((option) => option.value === value)?.label ?? value
    );
}
