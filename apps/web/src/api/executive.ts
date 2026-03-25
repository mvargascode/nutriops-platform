import { http } from "@/api/http";
import type { ExecutiveSummaryResponse } from "@/types/executive";

export type ExecutiveSummaryParams = {
  date?: string; // YYYY-MM-DD
};

export async function getExecutiveSummary(params: ExecutiveSummaryParams = {}) {
  const { data } = await http.get<ExecutiveSummaryResponse>(
    "/executive/summary",
    { params },
  );
  return data;
}
