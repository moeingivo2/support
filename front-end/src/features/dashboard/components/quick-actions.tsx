import { Link } from "react-router-dom";
import { ArrowUpLeft } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { dashboardQuickActions, observerDashboardQuickActions } from "../constants";
import { useAuth } from "@/shared/services/auth-context";

export function QuickActionsSection() {
    const { user } = useAuth();
    const actions = user?.role === "observer" ? observerDashboardQuickActions : dashboardQuickActions;
    return (
        <section className="space-y-4" aria-labelledby="quick-actions">
            <h2 id="quick-actions" className="text-xl font-bold text-ink">
                اقدامات سریع
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {actions.map((action) => (
                    <Card key={action.path} className="p-0">
                        <Link
                            to={action.path}
                            className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-surface-2"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                                <action.icon />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">
                                    {action.title}
                                </span>
                                <span className="block truncate text-xs text-ink-2">
                                    {action.description}
                                </span>
                            </span>
                            <ArrowUpLeft className="size-4 shrink-0 text-ink-2" />
                        </Link>
                    </Card>
                ))}
            </div>
        </section>
    );
}
