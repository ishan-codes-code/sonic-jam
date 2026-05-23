import { apiClient } from "@/api/apiClient";
import { ListeningEvent } from "../types";

interface FetchHistoryParams {
  limit?: number;
  offset?: number;
}

export const fetchHistory = async ({
  limit = 20,
  offset = 0,
}: FetchHistoryParams): Promise<ListeningEvent[]> => {
  const { data } = await apiClient.get<ListeningEvent[]>("/listening/history", {
    params: { limit, offset },
  });

  return data;
};

export const deleteHistoryEvent = async (id: string): Promise<void> => {
  await apiClient.delete(`/listening/history/${id}`);
};
