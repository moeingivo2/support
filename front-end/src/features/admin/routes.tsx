import { lazy } from "react";

const RegisterSupportPage = lazy(() => import("./pages/RegisterSupportPage"));
const AllReportsPage = lazy(() => import("./pages/AllReportsPage"));
const ActivityReportPage = lazy(() => import("./pages/ActivityReportPage"));
const ManageAdminsPage = lazy(() => import("./pages/ManageAdminsPage"));
const ManageTraineesPage = lazy(() => import("./pages/ManageTraineesPage"));
const SupportRankingPage = lazy(
    () => import("./pages/SupportRankingPage"),
);

export function RegisterSupportRoute() {
    return <RegisterSupportPage />;
}

export function AllReportsRoute() {
    return <AllReportsPage />;
}

export function ActivityReportRoute() {
    return <ActivityReportPage />;
}

export function ManageAdminsRoute() {
    return <ManageAdminsPage />;
}

export function ManageTraineesRoute() {
    return <ManageTraineesPage />;
}

export function SupportRankingRoute() {
    return <SupportRankingPage />;
}
