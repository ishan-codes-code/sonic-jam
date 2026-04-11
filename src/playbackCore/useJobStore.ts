import { create } from 'zustand';
import { Song } from './types';

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';

export type JobItem = {
    jobId: string;
    status: JobStatus;
    createdAt: number;
    
    // optional metadata
    song?: Song;
    
    // status info
    progress?: number; // 0 to 100
    
    // result
    streamUrl?: string;
    error?: string;
};

type JobStore = {
    jobs: Record<string, JobItem>;
    
    addJob: (jobId: string, metadata?: { song?: Song }) => void;
    updateJob: (jobId: string, data: Partial<JobItem>) => void;
    removeJob: (jobId: string) => void;
};

export const useJobStore = create<JobStore>((set) => ({
    jobs: {},
    
    addJob: (jobId, metadata) => set((state) => ({
        jobs: {
            ...state.jobs,
            [jobId]: {
                jobId,
                status: 'waiting',
                createdAt: Date.now(),
                ...metadata,
            },
        },
    })),
    
    updateJob: (jobId, data) => set((state) => {
        const existing = state.jobs[jobId];
        if (!existing) return state;
        
        return {
            jobs: {
                ...state.jobs,
                [jobId]: {
                    ...existing,
                    ...data,
                },
            },
        };
    }),
    
    removeJob: (jobId) => set((state) => {
        const newJobs = { ...state.jobs };
        delete newJobs[jobId];
        return { jobs: newJobs };
    }),
}));
