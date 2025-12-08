// Zustand Store for App State

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppState, FilterState, SearchMode, AnalyzedVideo, TranscriptSegment } from "@/types/video";

const DEFAULT_FILTERS: FilterState = {
    region: "", // Global (no filter)
    language: "", // Any language
    facelessMode: false,
    minSubscribers: 0,
    minViews: 0,
    resultsLimit: 25,
    publishedAfter: null,
    videoDuration: "all",
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // API Key
            apiKey: "",
            setApiKey: (apiKey: string) => set({ apiKey }),

            // Search Mode
            searchMode: "keyword" as SearchMode,
            setSearchMode: (searchMode: SearchMode) => set({ searchMode }),

            // Filters
            filters: DEFAULT_FILTERS,
            setFilters: (newFilters: Partial<FilterState>) =>
                set((state) => ({
                    filters: { ...state.filters, ...newFilters },
                })),

            // Results
            results: [] as AnalyzedVideo[],
            setResults: (results: AnalyzedVideo[]) => set({ results }),
            updateVideoTranscript: (
                videoId: string,
                transcript: { raw: string; language: string; segments: TranscriptSegment[] }
            ) =>
                set((state) => ({
                    results: state.results.map((video) =>
                        video.video_id === videoId
                            ? {
                                ...video,
                                transcript_raw: transcript.raw,
                                transcript_language: transcript.language,
                                transcript_segments: transcript.segments,
                            }
                            : video
                    ),
                })),

            // Channel Info (for Video Link and Channel Handle searches)
            channelInfo: null,
            setChannelInfo: (channelInfo) => set({ channelInfo }),

            // Loading states
            isLoading: false,
            setIsLoading: (isLoading: boolean) => set({ isLoading }),
            error: null as string | null,
            setError: (error: string | null) => set({ error }),
        }),
        {
            name: "youtube-spyglass-storage",
            partialize: (state) => ({
                apiKey: state.apiKey,
                filters: state.filters,
            }),
        }
    )
);
