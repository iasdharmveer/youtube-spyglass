// YouTube Spyglass - Core Types

export interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

export interface VideoThumbnails {
    default: string;
    medium: string;
    high: string;
    standard: string;
    maxres: string;
}

export interface AnalyzedVideo {
    // --- IDENTIFICATION ---
    video_id: string;
    video_title: string;
    video_url: string;
    channel_id: string;
    channel_name: string;

    // --- METRICS ---
    views: number;
    likes: number;
    comments_count: number;
    favorite_count: number;
    subscriber_count: number;

    // --- CONTENT DETAILS ---
    publish_date: string;
    duration_minutes: number; // Legacy: decimal minutes
    duration_seconds: number; // Total seconds
    duration_formatted: string; // Human-readable (MM:SS or HH:MM:SS)
    made_for_kids: boolean;
    default_language: string;
    default_audio_language: string;

    // --- METADATA ---
    tags: string[];
    description: string;
    category_id: string;
    topic_categories: string[]; // Raw Wikipedia URLs from API
    topic_categories_clean: string; // Human-readable names (e.g., "Technology | Gaming")

    // --- VISUALS ---
    thumbnails: VideoThumbnails;

    // --- CHANNEL CONTEXT ---
    channel_keywords: string;
    channel_description: string;

    // --- TRANSCRIPT DATA ---
    transcript_raw: string;
    transcript_language: string;
    transcript_segments: TranscriptSegment[];

    // --- COMPUTED FACELESS METRICS ---
    faceless_score: number;
    faceless_confidence: "High" | "Medium" | "Low" | "N/A";
}

// Channel information for display above results
export interface ChannelInfo {
    channelId: string;
    title: string;
    description: string;
    customUrl: string;
    thumbnailUrl: string;
    bannerUrl: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    publishedAt: string;
    country: string;
    keywords: string;
    email: string;
    links: string[];
}

export type SearchMode = "keyword" | "video-link" | "channel-handle";

// Expanded Region types - all major YouTube markets
export type Region =
    | "US" // United States
    | "GB" // United Kingdom
    | "CA" // Canada
    | "AU" // Australia
    | "IN" // India
    | "DE" // Germany
    | "FR" // France
    | "BR" // Brazil
    | "MX" // Mexico
    | "JP" // Japan
    | "KR" // South Korea
    | "ID" // Indonesia
    | "PH" // Philippines
    | "RU" // Russia
    | "ES" // Spain
    | "IT" // Italy
    | "NL" // Netherlands
    | "PL" // Poland
    | "TR" // Turkey
    | "SA" // Saudi Arabia
    | "AE" // UAE
    | "EG" // Egypt
    | "NG" // Nigeria
    | "ZA" // South Africa
    | "AR" // Argentina
    | "CL" // Chile
    | "CO" // Colombia
    | "TH" // Thailand
    | "VN" // Vietnam
    | "MY" // Malaysia
    | "SG" // Singapore
    | "PK" // Pakistan
    | "BD" // Bangladesh
    | ""; // Global (no filter)

// Expanded Language types - all major languages on YouTube
export type Language =
    | "en" // English
    | "es" // Spanish
    | "pt" // Portuguese
    | "fr" // French
    | "de" // German
    | "it" // Italian
    | "nl" // Dutch
    | "pl" // Polish
    | "ru" // Russian
    | "uk" // Ukrainian
    | "hi" // Hindi
    | "bn" // Bengali
    | "ta" // Tamil
    | "te" // Telugu
    | "mr" // Marathi
    | "gu" // Gujarati
    | "kn" // Kannada
    | "ml" // Malayalam
    | "pa" // Punjabi
    | "ur" // Urdu
    | "ar" // Arabic
    | "fa" // Persian/Farsi
    | "tr" // Turkish
    | "vi" // Vietnamese
    | "th" // Thai
    | "id" // Indonesian
    | "ms" // Malay
    | "tl" // Filipino/Tagalog
    | "ja" // Japanese
    | "ko" // Korean
    | "zh" // Chinese
    | ""; // Any language

export interface FilterState {
    region: Region;
    language: Language;
    facelessMode: boolean;
    minSubscribers: number;
    minViews: number;
    resultsLimit: number;
    publishedAfter: string | null;
    videoDuration: "all" | "short" | "long";
}

export interface AppState {
    // API Key
    apiKey: string;
    setApiKey: (key: string) => void;

    // Search Mode
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;

    // Filters
    filters: FilterState;
    setFilters: (filters: Partial<FilterState>) => void;

    // Results
    results: AnalyzedVideo[];
    setResults: (results: AnalyzedVideo[]) => void;
    updateVideoTranscript: (
        videoId: string,
        transcript: {
            raw: string;
            language: string;
            segments: TranscriptSegment[];
        }
    ) => void;

    // Channel Info (for Video Link and Channel Handle searches)
    channelInfo: ChannelInfo | null;
    setChannelInfo: (channelInfo: ChannelInfo | null) => void;

    // Loading states
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
}
