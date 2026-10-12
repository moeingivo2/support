import { lazy } from "react";

const UpgradeRequestsPage = lazy(() => import("./pages/UpgradeRequestsPage"));

export function UpgradeRequestsRoute() {
    return <UpgradeRequestsPage />;
}
