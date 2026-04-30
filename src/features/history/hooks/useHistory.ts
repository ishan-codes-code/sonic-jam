import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchHistory } from "../api/historyApi";
import { ListeningEvent } from "../types";

export const useHistory = () => {
  return useInfiniteQuery<ListeningEvent[], Error>({
    queryKey: ["listening-history"],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchHistory({ limit: 20, offset: pageParam as number });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has less than the limit (20), we've reached the end
      if (lastPage.length < 20) {
        return undefined;
      }
      // Otherwise, the next offset is the current total number of items loaded
      return allPages.reduce((total, page) => total + page.length, 0);
    },
  });
};
