import { useQuery } from "@tanstack/react-query";
import {
    getReportableShift,
    shiftReportQueryKeys,
} from "../services/shiftReportService";

export function useReportableShift(enabled = true) {
    return useQuery({
        queryKey: shiftReportQueryKeys.reportableShift,
        queryFn: getReportableShift,
        retry: false,
        staleTime: 0,
        enabled,
    });
}
