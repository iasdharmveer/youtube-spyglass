// YouTube Data API Client (Client-Side)
// Enhanced with proper error handling, rate limiting, and retry logic

import type { AnalyzedVideo, VideoThumbnails, Region, Language } from "@/types/video";
import { calculateFacelessScore } from "./scoring";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// API Error types for better error handling
export class YouTubeAPIError extends Error {
    public code: number;
    public reason?: string;

    constructor(message: string, code: number, reason?: string) {
        super(message);
        this.name = "YouTubeAPIError";
        this.code = code;
        this.reason = reason;
    }
}

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff retry wrapper
async function withRetry<T>(
    fn: () => Promise<T>,
    retries = RETRY_CONFIG.maxRetries
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on client errors (400-499) except rate limiting (429)
            if (error instanceof YouTubeAPIError) {
                if (error.code >= 400 && error.code < 500 && error.code !== 429) {
                    throw error;
                }
            }

            if (attempt < retries) {
                const delay = Math.min(
                    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
                    RETRY_CONFIG.maxDelay
                );
                console.warn(`Retrying after ${delay}ms (attempt ${attempt + 1}/${retries})`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

// Fetch with timeout wrapper
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 30000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Parse and validate YouTube API response
async function handleYouTubeResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = errorData.error || {};
        throw new YouTubeAPIError(
            error.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            error.errors?.[0]?.reason
        );
    }

    const data = await response.json();

    if (data.error) {
        throw new YouTubeAPIError(
            data.error.message || "YouTube API error",
            data.error.code || 500,
            data.error.errors?.[0]?.reason
        );
    }

    return data;
}

// Parse ISO 8601 duration (PT1H2M3S) to minutes
export function parseDuration(isoDuration: string): number {
    if (!isoDuration) return 0;

    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    return hours * 60 + minutes + seconds / 60;
}

// Extract video ID from various URL formats
export function extractVideoId(url: string): string | null {
    if (!url || typeof url !== "string") return null;

    const trimmed = url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Extract channel handle from URL or text
export function extractChannelHandle(input: string): string | null {
    if (!input || typeof input !== "string") return null;

    const trimmed = input.trim();

    // Handle @username format
    const handleMatch = trimmed.match(/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch) return handleMatch[1];

    // Handle youtube.com/@username URLs
    const urlMatch = trimmed.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
    if (urlMatch) return urlMatch[1];

    // Handle youtube.com/c/channelname URLs
    const customUrlMatch = trimmed.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/);
    if (customUrlMatch) return customUrlMatch[1];

    return null;
}

// MOCK DATA FOR TESTING
const MOCK_CHANNELS = [
    {
        channelId: "UC_MOCK_MAIN",
        title: "Tech Reviews Daily",
        description: "Daily tech reviews and email: contact@techreviews.com. Check us out on twitter: https://twitter.com/techreviews",
        customUrl: "@techreviews",
        subscriberCount: 1500000,
        videoCount: 450,
        viewCount: 200000000,
        publishedAt: "2018-01-01T00:00:00Z",
        country: "US",
        keywords: "tech reviews gadgets ai",
        bannerUrl: "https://via.placeholder.com/1000x200",
        thumbnails: { high: "https://via.placeholder.com/800x800.png?text=TR" },
    },
    {
        channelId: "UC_MOCK_COMP1",
        title: "Gadget Guru",
        description: "Best gadgets 2024. Business: guru@gadgets.net",
        customUrl: "@gadgetguru",
        subscriberCount: 800000,
        videoCount: 300,
        viewCount: 100000000,
        publishedAt: "2019-05-01T00:00:00Z",
        country: "UK",
        keywords: "gadgets phones reviews",
        bannerUrl: "https://via.placeholder.com/1000x200",
        thumbnails: { high: "https://via.placeholder.com/800x800.png?text=GG" },
    },
    {
        channelId: "UC_MOCK_COMP2",
        title: "AI Future",
        description: "AI news everyday.",
        customUrl: "@aifuture",
        subscriberCount: 2000000,
        videoCount: 600,
        viewCount: 500000000,
        publishedAt: "2020-01-01T00:00:00Z",
        country: "US",
        keywords: "ai artificial intelligence",
        bannerUrl: "https://via.placeholder.com/1000x200",
        thumbnails: { high: "https://via.placeholder.com/800x800.png?text=AI" },
    }
];

const MOCK_VIDEOS = [
    {
        id: "v_mock_001",
        title: "Reviewing the New AI Phone",
        description: "It is crazy! #tech #ai",
        channelId: "UC_MOCK_MAIN",
        channelTitle: "Tech Reviews Daily",
        publishedAt: "2024-01-15T10:00:00Z",
        tags: ["tech", "review", "ai"],
        categoryId: "28",
        duration: "PT10M30S",
        viewCount: 500000,
        likeCount: 25000,
        commentCount: 1500,
        favoriteCount: 0,
        thumbnails: { high: "https://via.placeholder.com/640x360.png?text=Video+1" },
    },
    {
        id: "v_mock_002",
        title: "Top 5 AI Tools (Short)",
        description: "Quick look at tools",
        channelId: "UC_MOCK_COMP2",
        channelTitle: "AI Future",
        publishedAt: "2024-02-01T12:00:00Z",
        tags: ["ai", "tools"],
        categoryId: "28",
        duration: "PT59S",
        viewCount: 1000000,
        likeCount: 50000,
        commentCount: 2000,
        favoriteCount: 0,
        thumbnails: { high: "https://via.placeholder.com/640x360.png?text=Short+Video" },
    },
    {
        id: "v_mock_003",
        title: "Gadget Unboxing",
        description: "Unboxing the latest thing",
        channelId: "UC_MOCK_COMP1",
        channelTitle: "Gadget Guru",
        publishedAt: "2024-03-01T15:00:00Z",
        tags: ["gadgets", "unboxing"],
        categoryId: "28",
        duration: "PT15M",
        viewCount: 750000,
        likeCount: 30000,
        commentCount: 1800,
        favoriteCount: 0,
        thumbnails: { high: "https://via.placeholder.com/640x360.png?text=Unboxing" },
    }
];

// Validate API key format (basic check)
export function validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== "string") return false;
    if (apiKey.toLowerCase() === "mock") return true;
    // YouTube API keys are typically 39 characters starting with "AIza"
    return apiKey.length >= 30 && apiKey.startsWith("AIza");
}

interface YouTubeSearchParams {
    apiKey: string;
    query: string;
    maxResults?: number;
    regionCode?: Region;
    relevanceLanguage?: Language;
    order?: "viewCount" | "date" | "relevance" | "rating";
    type?: "video" | "channel";
    publishedAfter?: string;
    channelId?: string;
}

interface YouTubeSearchResult {
    videoId?: string;
    channelId: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: VideoThumbnails;
}

interface YouTubeAPIResponse {
    items?: Array<{
        id: { videoId?: string; channelId?: string };
        snippet: {
            channelId?: string;
            title?: string;
            description?: string;
            publishedAt?: string;
            thumbnails?: Record<string, { url?: string }>;
        };
    }>;
    pageInfo?: { totalResults?: number };
}

// Search YouTube
export async function searchYouTube(
    params: YouTubeSearchParams
): Promise<YouTubeSearchResult[]> {
    if (params.apiKey.toLowerCase() === "mock") {
        await sleep(500); // Simulate network delay

        if (params.type === "channel") {
            // Return mock channels (excluding main if needed, but here simple)
            return MOCK_CHANNELS.map(c => ({
                channelId: c.channelId,
                title: c.title,
                description: c.description,
                publishedAt: c.publishedAt,
                thumbnails: {
                    default: c.thumbnails.high,
                    medium: c.thumbnails.high,
                    high: c.thumbnails.high,
                    standard: c.thumbnails.high,
                    maxres: c.thumbnails.high
                }
            }));
        }

        // Return mock videos
        let videos = MOCK_VIDEOS;

        // Filter by channelId if present
        if (params.channelId) {
            videos = videos.filter(v => v.channelId === params.channelId);
            // If no videos for this specific channel in mock, generate some generic ones
            if (videos.length === 0) {
                return Array.from({ length: 5 }).map((_, i) => ({
                    videoId: `mock_gen_${params.channelId}_${i}`,
                    channelId: params.channelId!,
                    title: `Mock Video ${i + 1} from ${params.channelId}`,
                    description: "Auto generated mock video",
                    publishedAt: new Date().toISOString(),
                    thumbnails: {
                        default: "https://via.placeholder.com/120?text=Mock",
                        medium: "https://via.placeholder.com/320?text=Mock",
                        high: "https://via.placeholder.com/480?text=Mock",
                        standard: "https://via.placeholder.com/640?text=Mock",
                        maxres: "https://via.placeholder.com/1280?text=Mock"
                    }
                }));
            }
        }

        return videos.map(v => ({
            videoId: v.id,
            channelId: v.channelId,
            title: v.title,
            description: v.description,
            publishedAt: v.publishedAt,
            thumbnails: {
                default: v.thumbnails.high,
                medium: v.thumbnails.high,
                high: v.thumbnails.high,
                standard: v.thumbnails.high,
                maxres: v.thumbnails.high
            }
        }));
    }

    return withRetry(async () => {
        const searchParams = new URLSearchParams({
            key: params.apiKey,
            part: "snippet",
            maxResults: String(params.maxResults || 25),
            order: params.order || "viewCount",
            type: params.type || "video",
        });

        // Only add query if it's not empty
        if (params.query.trim()) {
            searchParams.set("q", params.query);
        }

        if (params.regionCode) {
            searchParams.set("regionCode", params.regionCode);
        }
        if (params.relevanceLanguage) {
            searchParams.set("relevanceLanguage", params.relevanceLanguage);
        }
        if (params.publishedAfter) {
            searchParams.set("publishedAfter", params.publishedAfter);
        }
        if (params.channelId) {
            searchParams.set("channelId", params.channelId);
        }

        const response = await fetchWithTimeout(
            `${YOUTUBE_API_BASE}/search?${searchParams}`
        );
        const data = await handleYouTubeResponse<YouTubeAPIResponse>(response);

        return (data.items || []).map((item) => {
            const snippet = item.snippet || {};
            const id = item.id || {};
            const thumbnails = snippet.thumbnails || {};

            return {
                videoId: id.videoId,
                channelId: id.channelId || snippet.channelId || "",
                title: snippet.title || "",
                description: snippet.description || "",
                publishedAt: snippet.publishedAt || "",
                thumbnails: {
                    default: thumbnails.default?.url || "",
                    medium: thumbnails.medium?.url || "",
                    high: thumbnails.high?.url || "",
                    standard: thumbnails.standard?.url || "",
                    maxres: thumbnails.maxres?.url || "",
                },
            };
        });
    });
}

interface VideoDetails {
    id: string;
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    tags: string[];
    categoryId: string;
    defaultLanguage: string;
    defaultAudioLanguage: string;
    duration: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    madeForKids: boolean;
    topicCategories: string[];
    thumbnails: VideoThumbnails;
}

// Get video details for multiple video IDs
export async function getVideoDetails(
    apiKey: string,
    videoIds: string[]
): Promise<VideoDetails[]> {
    if (apiKey.toLowerCase() === "mock") {
        await sleep(300);
        return videoIds.map(id => {
            const mockVid = MOCK_VIDEOS.find(v => v.id === id);
            if (mockVid) {
                return {
                    ...mockVid,
                    channelTitle: mockVid.channelTitle,
                    defaultLanguage: "en",
                    defaultAudioLanguage: "en",
                    madeForKids: false,
                    topicCategories: [],
                    thumbnails: {
                        default: mockVid.thumbnails.high,
                        medium: mockVid.thumbnails.high,
                        high: mockVid.thumbnails.high,
                        standard: mockVid.thumbnails.high,
                        maxres: mockVid.thumbnails.high
                    }
                };
            }
            // Generate detail for unknown IDs (like generated ones)
            return {
                id: id,
                title: `Mock Video Title for ${id}`,
                description: "Mock Description",
                channelId: "UC_MOCK_GEN",
                channelTitle: "Mock Generated Channel",
                publishedAt: new Date().toISOString(),
                tags: ["mock"],
                categoryId: "28",
                duration: "PT5M",
                viewCount: 10000,
                likeCount: 500,
                commentCount: 50,
                favoriteCount: 0,
                madeForKids: false,
                topicCategories: [],
                defaultLanguage: "en",
                defaultAudioLanguage: "en",
                thumbnails: {
                    default: "https://via.placeholder.com/120",
                    medium: "https://via.placeholder.com/320",
                    high: "https://via.placeholder.com/480",
                    standard: "https://via.placeholder.com/640",
                    maxres: "https://via.placeholder.com/1280"
                }
            };
        });
    }

    if (videoIds.length === 0) return [];

    // Batch in groups of 50 (API limit)
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
        batches.push(videoIds.slice(i, i + 50));
    }

    const results: VideoDetails[] = [];

    for (const batch of batches) {
        const batchResults = await withRetry(async () => {
            const searchParams = new URLSearchParams({
                key: apiKey,
                part: "snippet,contentDetails,statistics,topicDetails,status",
                id: batch.join(","),
            });

            const response = await fetchWithTimeout(
                `${YOUTUBE_API_BASE}/videos?${searchParams}`
            );
            const data = await handleYouTubeResponse<{ items?: Array<Record<string, unknown>> }>(response);

            const batchVideos: VideoDetails[] = [];

            for (const item of data.items || []) {
                const snippet = (item.snippet || {}) as Record<string, unknown>;
                const contentDetails = (item.contentDetails || {}) as Record<string, unknown>;
                const statistics = (item.statistics || {}) as Record<string, unknown>;
                const topicDetails = (item.topicDetails || {}) as Record<string, unknown>;
                const status = (item.status || {}) as Record<string, unknown>;
                const thumbnails = (snippet.thumbnails || {}) as Record<string, { url?: string }>;

                batchVideos.push({
                    id: String(item.id || ""),
                    title: String(snippet.title || ""),
                    description: String(snippet.description || ""),
                    channelId: String(snippet.channelId || ""),
                    channelTitle: String(snippet.channelTitle || ""),
                    publishedAt: String(snippet.publishedAt || ""),
                    tags: Array.isArray(snippet.tags) ? snippet.tags : [],
                    categoryId: String(snippet.categoryId || ""),
                    defaultLanguage: String(snippet.defaultLanguage || ""),
                    defaultAudioLanguage: String(snippet.defaultAudioLanguage || ""),
                    duration: String(contentDetails.duration || ""),
                    viewCount: parseInt(String(statistics.viewCount || "0"), 10),
                    likeCount: parseInt(String(statistics.likeCount || "0"), 10),
                    commentCount: parseInt(String(statistics.commentCount || "0"), 10),
                    favoriteCount: parseInt(String(statistics.favoriteCount || "0"), 10),
                    madeForKids: Boolean(status.madeForKids),
                    topicCategories: Array.isArray(topicDetails.topicCategories)
                        ? topicDetails.topicCategories
                        : [],
                    thumbnails: {
                        default: thumbnails.default?.url || "",
                        medium: thumbnails.medium?.url || "",
                        high: thumbnails.high?.url || "",
                        standard: thumbnails.standard?.url || "",
                        maxres: thumbnails.maxres?.url || "",
                    },
                });
            }

            return batchVideos;
        });

        results.push(...batchResults);
    }

    return results;
}

interface ChannelDetails {
    channelId: string;
    id: string;
    title: string;
    description: string;
    customUrl: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    publishedAt: string;
    country: string;
    keywords: string;
    thumbnails: VideoThumbnails;
    bannerUrl: string;
    // Extracted from description
    email: string;
    links: string[];
}

// Get channel details for multiple channel IDs
export async function getChannelDetails(
    apiKey: string,
    channelIds: string[]
): Promise<ChannelDetails[]> {
    if (apiKey.toLowerCase() === "mock") {
        await sleep(300);
        return channelIds.map(id => {
            const mockCh = MOCK_CHANNELS.find(c => c.channelId === id);

            // Extract mock emails/links
            let email = "";
            let links: string[] = [];
            if (mockCh) {
                const emailMatch = mockCh.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                email = emailMatch ? emailMatch[0] : "";
                const linkRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
                const rawLinks = mockCh.description.match(linkRegex) || [];
                links = [...new Set(rawLinks)];
            }

            if (mockCh) {
                return {
                    ...mockCh,
                    id: mockCh.channelId,
                    email,
                    links,
                    thumbnails: {
                        default: mockCh.thumbnails.high,
                        medium: mockCh.thumbnails.high,
                        high: mockCh.thumbnails.high,
                        standard: mockCh.thumbnails.high,
                        maxres: mockCh.thumbnails.high
                    }
                };
            }
            // Generate dummy channel for unknown IDs
            return {
                channelId: id,
                id: id,
                title: `Mock Channel ${id}`,
                description: "Generated mock channel description",
                customUrl: `@mock${id}`,
                subscriberCount: 50000,
                videoCount: 100,
                viewCount: 1000000,
                publishedAt: new Date().toISOString(),
                country: "US",
                keywords: "mock generated",
                bannerUrl: "https://via.placeholder.com/1000x200",
                email: "",
                links: [],
                thumbnails: {
                    default: "https://via.placeholder.com/88",
                    medium: "https://via.placeholder.com/88",
                    high: "https://via.placeholder.com/88",
                    standard: "https://via.placeholder.com/88",
                    maxres: "https://via.placeholder.com/88"
                }
            };
        });
    }

    if (channelIds.length === 0) return [];

    // Batch in groups of 50
    const batches: string[][] = [];
    for (let i = 0; i < channelIds.length; i += 50) {
        batches.push(channelIds.slice(i, i + 50));
    }

    const results: ChannelDetails[] = [];

    for (const batch of batches) {
        const batchResults = await withRetry(async () => {
            const searchParams = new URLSearchParams({
                key: apiKey,
                part: "snippet,statistics,brandingSettings",
                id: batch.join(","),
            });

            const response = await fetchWithTimeout(
                `${YOUTUBE_API_BASE}/channels?${searchParams}`
            );
            const data = await handleYouTubeResponse<{ items?: Array<Record<string, unknown>> }>(response);

            const batchChannels: ChannelDetails[] = [];

            for (const item of data.items || []) {
                const snippet = (item.snippet || {}) as Record<string, unknown>;
                const statistics = (item.statistics || {}) as Record<string, unknown>;
                const brandingSettings = (item.brandingSettings || {}) as Record<string, unknown>;
                const branding = (brandingSettings.channel || {}) as Record<string, unknown>;
                const image = (brandingSettings.image || {}) as Record<string, unknown>;
                const thumbnails = (snippet.thumbnails || {}) as Record<string, { url?: string }>;

                const description = String(snippet.description || "");

                // Extract email from description
                const emailMatch = description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const email = emailMatch ? emailMatch[0] : "";

                // Extract links from description
                const linkRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
                const rawLinks = description.match(linkRegex) || [];
                // Filter and deduplicate links
                const links = [...new Set(rawLinks)].slice(0, 10); // Max 10 links

                batchChannels.push({
                    channelId: String(item.id || ""),
                    id: String(item.id || ""),
                    title: String(snippet.title || ""),
                    description: description,
                    customUrl: String(snippet.customUrl || ""),
                    subscriberCount: parseInt(String(statistics.subscriberCount || "0"), 10),
                    videoCount: parseInt(String(statistics.videoCount || "0"), 10),
                    viewCount: parseInt(String(statistics.viewCount || "0"), 10),
                    publishedAt: String(snippet.publishedAt || ""),
                    country: String(snippet.country || ""),
                    keywords: String(branding.keywords || ""),
                    bannerUrl: String(image.bannerExternalUrl || ""),
                    email: email,
                    links: links,
                    thumbnails: {
                        default: thumbnails.default?.url || "",
                        medium: thumbnails.medium?.url || "",
                        high: thumbnails.high?.url || "",
                        standard: thumbnails.standard?.url || "",
                        maxres: thumbnails.maxres?.url || "",
                    },
                });
            }

            return batchChannels;
        });

        results.push(...batchResults);
    }

    return results;
}

// Resolve @handle to channel ID
export async function resolveChannelHandle(
    apiKey: string,
    handle: string
): Promise<string | null> {
    if (apiKey.toLowerCase() === "mock") {
        await sleep(200);
        return "UC_MOCK_MAIN";
    }

    // Clean up the handle - remove @ and any URL parts
    const cleanHandle = handle
        .replace(/^@/, "")
        .replace(/.*youtube\.com\/@/, "")
        .replace(/.*youtube\.com\/c\//, "")
        .replace(/[/?#].*/g, "")
        .trim();


    if (!cleanHandle) {
        console.error("Invalid handle provided:", handle);
        return null;
    }

    console.log("[resolveChannelHandle] Resolving handle:", cleanHandle);

    // Method 1: Try forHandle parameter (newer API)
    try {
        const searchParams = new URLSearchParams({
            key: apiKey,
            part: "snippet",
            forHandle: cleanHandle,
        });

        const response = await fetchWithTimeout(
            `${YOUTUBE_API_BASE}/channels?${searchParams}`
        );
        const data = await handleYouTubeResponse<{ items?: Array<{ id: string }> }>(response);

        if (data.items && data.items.length > 0) {
            console.log("[resolveChannelHandle] Found via forHandle:", data.items[0].id);
            return data.items[0].id;
        }
    } catch (error) {
        console.warn("[resolveChannelHandle] forHandle lookup failed:", error);
    }

    // Method 2: Try forUsername parameter (older API, maybe works for some channels)
    try {
        const searchParams = new URLSearchParams({
            key: apiKey,
            part: "snippet",
            forUsername: cleanHandle,
        });

        const response = await fetchWithTimeout(
            `${YOUTUBE_API_BASE}/channels?${searchParams}`
        );
        const data = await handleYouTubeResponse<{ items?: Array<{ id: string }> }>(response);

        if (data.items && data.items.length > 0) {
            console.log("[resolveChannelHandle] Found via forUsername:", data.items[0].id);
            return data.items[0].id;
        }
    } catch (error) {
        console.warn("[resolveChannelHandle] forUsername lookup failed:", error);
    }

    // Method 3: Fallback to search
    console.log("[resolveChannelHandle] Falling back to search for:", `@${cleanHandle}`);
    try {
        const searchResult = await searchYouTube({
            apiKey,
            query: `@${cleanHandle}`,
            type: "channel",
            maxResults: 5,
        });

        // Try to find exact match first
        const exactMatch = searchResult.find(
            (ch) => ch.title.toLowerCase().includes(cleanHandle.toLowerCase())
        );
        if (exactMatch) {
            console.log("[resolveChannelHandle] Found via search (exact):", exactMatch.channelId);
            return exactMatch.channelId;
        }

        // Otherwise return first result
        if (searchResult.length > 0) {
            console.log("[resolveChannelHandle] Found via search (first):", searchResult[0].channelId);
            return searchResult[0].channelId;
        }
    } catch (error) {
        console.error("[resolveChannelHandle] Search fallback failed:", error);
    }

    console.error("[resolveChannelHandle] Could not resolve handle:", cleanHandle);
    return null;
}

// Get channel's videos sorted by popularity
export async function getChannelVideos(
    apiKey: string,
    channelId: string,
    maxResults: number = 50,
    order: "viewCount" | "date" = "viewCount",
    publishedAfter?: string
): Promise<YouTubeSearchResult[]> {
    return searchYouTube({
        apiKey,
        query: "",
        channelId,
        maxResults,
        order,
        type: "video",
        publishedAfter,
    });
}

// Build full AnalyzedVideo objects from search results
export async function buildAnalyzedVideos(
    apiKey: string,
    searchResults: YouTubeSearchResult[],
    filters?: { minViews?: number; minSubscribers?: number; videoDuration?: "all" | "short" | "long" }
): Promise<AnalyzedVideo[]> {
    const videoIds = searchResults.filter((r) => r.videoId).map((r) => r.videoId!);

    if (videoIds.length === 0) return [];

    // Get video details
    const videoDetails = await getVideoDetails(apiKey, videoIds);

    // Get unique channel IDs
    const channelIds = [...new Set(videoDetails.map((v) => v.channelId).filter(Boolean))];
    const channelDetails = await getChannelDetails(apiKey, channelIds);

    // Create channel lookup map
    const channelMap = new Map(channelDetails.map((c) => [c.id, c]));

    // Build analyzed videos
    const analyzedVideos: AnalyzedVideo[] = [];

    for (const video of videoDetails) {
        const channel = channelMap.get(video.channelId);
        if (!channel) continue;

        // Apply filters
        if (filters?.minViews && video.viewCount < filters.minViews) continue;
        if (filters?.minSubscribers && channel.subscriberCount < filters.minSubscribers)
            continue;

        // Apply duration filter
        if (filters?.videoDuration && filters.videoDuration !== "all") {
            const minutes = parseDuration(video.duration);
            // Shorts: <= 1 minute (60 seconds)
            // Long: > 1 minute
            if (filters.videoDuration === "short" && minutes > 1.01) continue; // slight buffer for 60s
            if (filters.videoDuration === "long" && minutes <= 1.01) continue;
        }

        // Calculate faceless score
        const { score, confidence } = calculateFacelessScore(
            {
                title: video.title,
                description: video.description,
                tags: video.tags,
                categoryId: video.categoryId,
            },
            {
                keywords: channel.keywords,
                description: channel.description,
            }
        );

        analyzedVideos.push({
            video_id: video.id,
            video_title: video.title,
            video_url: `https://www.youtube.com/watch?v=${video.id}`,
            channel_id: video.channelId,
            channel_name: video.channelTitle,
            views: video.viewCount,
            likes: video.likeCount,
            comments_count: video.commentCount,
            favorite_count: video.favoriteCount,
            subscriber_count: channel.subscriberCount,
            publish_date: video.publishedAt,
            duration_minutes: parseDuration(video.duration),
            made_for_kids: video.madeForKids,
            default_language: video.defaultLanguage,
            default_audio_language: video.defaultAudioLanguage,
            tags: video.tags,
            description: video.description,
            category_id: video.categoryId,
            topic_categories: video.topicCategories,
            thumbnails: video.thumbnails,
            channel_keywords: channel.keywords,
            channel_description: channel.description,
            transcript_raw: "",
            transcript_language: "",
            transcript_segments: [],
            faceless_score: score,
            faceless_confidence: confidence,
        });
    }

    return analyzedVideos;
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
    if (error instanceof YouTubeAPIError) {
        switch (error.reason) {
            case "quotaExceeded":
                return "API quota exceeded. Please try again tomorrow or use a different API key.";
            case "keyInvalid":
                return "Invalid API key. Please check your YouTube Data API key.";
            case "keyExpired":
                return "API key has expired. Please generate a new key.";
            case "accessNotConfigured":
                return "YouTube Data API is not enabled for this key. Enable it in Google Cloud Console.";
            case "forbidden":
                return "Access forbidden. Check your API key permissions.";
            case "videoNotFound":
                return "Video not found. It may be private or deleted.";
            case "channelNotFound":
                return "Channel not found. Please check the channel handle.";
            default:
                return error.message;
        }
    }

    if (error instanceof Error) {
        if (error.name === "AbortError") {
            return "Request timed out. Please check your internet connection and try again.";
        }
        return error.message;
    }

    return "An unexpected error occurred. Please try again.";
}

// Fetch transcript for a single video
async function fetchSingleTranscript(videoId: string): Promise<{
    videoId: string;
    raw: string;
    language: string;
    segments: Array<{ start: number; duration: number; text: string }>;
}> {
    try {
        const response = await fetch(`/api/transcript?videoId=${videoId}`);
        const data = await response.json();

        if (data.success && data.raw) {
            return {
                videoId,
                raw: data.raw,
                language: data.language || "",
                segments: data.segments || [],
            };
        }
    } catch (error) {
        console.warn(`Failed to fetch transcript for ${videoId}:`, error);
    }

    return {
        videoId,
        raw: "",
        language: "",
        segments: [],
    };
}

// Batch fetch transcripts for multiple videos in parallel
export async function fetchTranscriptsForVideos(
    videos: AnalyzedVideo[],
    concurrency = 5
): Promise<AnalyzedVideo[]> {
    const results = [...videos];

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < videos.length; i += concurrency) {
        const batch = videos.slice(i, i + concurrency);
        const transcriptPromises = batch.map(video =>
            fetchSingleTranscript(video.video_id)
        );

        const transcripts = await Promise.all(transcriptPromises);

        // Update the corresponding videos with transcripts
        for (const transcript of transcripts) {
            const videoIndex = results.findIndex(v => v.video_id === transcript.videoId);
            if (videoIndex !== -1) {
                results[videoIndex] = {
                    ...results[videoIndex],
                    transcript_raw: transcript.raw,
                    transcript_language: transcript.language,
                    transcript_segments: transcript.segments,
                };
            }
        }
    }

    return results;
}
