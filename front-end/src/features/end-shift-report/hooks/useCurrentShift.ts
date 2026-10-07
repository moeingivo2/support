import { useQuery } from "@tanstack/react-query";
import {
    getCurrentShift,
    shiftReportQueryKeys,
} from "../services/shiftReportService";

export function useCurrentShift(enabled = true) {
    return useQuery({
        queryKey: shiftReportQueryKeys.currentShift,
        queryFn: getCurrentShift,
        retry: false,
        staleTime: 0,
        enabled,
    });
}
