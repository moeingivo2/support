import { getJson } from "@/shared/api/http";

export type DashboardResponse = {
    data: {
        weeklySatisfaction: number;
        openComplaints: number;
        answeredStudents: number;
        availableServices: number;
        unseenComplaints: number;
    };
};

export async function getDashboardData(): Promise<DashboardResponse> {
    return getJson<DashboardResponse>("/api/dashboard");
}
