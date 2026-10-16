/**
 * نارضایتی یکپارچه — دانشجو خودش ثبت می‌کند و نوع را انتخاب می‌کند.
 */
export type ComplaintType = "support" | "mentor" | "course";

export type ComplaintStatus = "open" | "in_progress" | "resolved";

export interface ComplaintAuthor {
    id: number;
    name: string;
    phone: string | null;
}

export interface Complaint {
    id: number;
    user_id: number;
    type: ComplaintType | (string & {});
    mentor_first_name: string | null;
    mentor_last_name: string | null;
    course_name: string | null;
    description: string;
    status: ComplaintStatus | (string & {});
    conversation_id: number | null;
    support_id: number | null;
    seen_at: string | null;
    created_at: string;
    updated_at: string;
    user: ComplaintAuthor;
    support?: ComplaintAuthor | null;
}

export interface LaravelPaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface LaravelPagination<TData> {
    current_page: number;
    data: TData[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: LaravelPaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

/**
 * بدنه‌ی ثبت نارضایتی.
 *
 * فیلدهای نام منتور و نام دوره فقط برای نوع مربوطه لازم‌اند؛ باقی
 * نارضایتی‌ها باید خالی بفرستند و بک‌اند هم آن‌ها را پاک می‌کند.
 */
export type CreateComplaintPayload = {
    type: ComplaintType;
    description: string;
    mentor_first_name?: string;
    mentor_last_name?: string;
    course_name?: string;
    conversation_id?: number | null;
};

export type CreateComplaintResponse = {
    message: string;
    data: Complaint;
};

export type ComplaintStatusResponse = {
    message: string;
    data: Complaint;
};

/** فیلترهای فهرست پنل — همه اختیاری‌اند و با هم جمع می‌شوند. */
export interface ComplaintFilters {
    type?: ComplaintType | "";
    status?: ComplaintStatus | "";
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
}

export type ComplaintSummary = {
    unseen: number;
    open: number;
};