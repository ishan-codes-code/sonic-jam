import { useQuery } from '@tanstack/react-query';
import { searchItunes } from '../api/itunes.api';
import { useState, useEffect } from 'react';

export const useSearchQuery = (query: string) => {
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    return useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: ({ signal }) => searchItunes(debouncedQuery, signal),
        enabled: debouncedQuery.trim().length > 0,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
