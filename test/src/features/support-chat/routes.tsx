import { lazy } from "react";

const SupportInboxPage = lazy(() => import("./pages/SupportInboxPage"));

export function SupportInboxRoute() {
    return <SupportInboxPage />;
}
