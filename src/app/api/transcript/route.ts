// Server-Side Transcript Proxy
// GET /api/transcript?videoId=...
// Enhanced with proper error handling, validation, and caching headers

import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

interface TranscriptResponse {
    success: boolean;
    language: string;
    segments: TranscriptSegment[];
    raw: string;
    error?: string;
    cached?: boolean;
}

// Validate video ID format
function isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

// Create response with proper headers
function createResponse(
    data: TranscriptResponse,
    status: number = 200,
    cacheSeconds: number = 3600
): NextResponse<TranscriptResponse> {
    const response = NextResponse.json(data, { status });

    // Set cache headers for successful responses
    if (data.success && data.segments.length > 0) {
        response.headers.set(
            "Cache-Control",
            `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
        );
    } else {
        // Don't cache errors or empty responses
        response.headers.set("Cache-Control", "no-store");
    }

    // CORS headers (useful if API is called from other domains)
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return response;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

export async function GET(
    request: NextRequest
): Promise<NextResponse<TranscriptResponse>> {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const lang = searchParams.get("lang"); // Optional: preferred language

    // Validate videoId parameter
    if (!videoId) {
        return createResponse(
            {
                success: false,
                language: "",
                segments: [],
                raw: "",
                error: "Missing videoId parameter",
            },
            400
        );
    }

    // Validate videoId format
    if (!isValidVideoId(videoId)) {
        return createResponse(
            {
                success: false,
                language: "",
                segments: [],
                raw: "",
                error: "Invalid videoId format. Expected 11 character YouTube video ID.",
            },
            400
        );
    }

    try {
        // Fetch transcript using youtube-transcript library
        // The library handles language fallback automatically
        const transcriptOptions = lang ? { lang } : undefined;
        const transcript = await YoutubeTranscript.fetchTranscript(
            videoId,
            transcriptOptions
        );

        if (!transcript || transcript.length === 0) {
            // Return empty but successful response when no transcript available
            return createResponse({
                success: true,
                language: "",
                segments: [],
                raw: "",
                error: "No transcript available for this video",
            });
        }

        // Transform to our segment format with text cleaning
        const segments: TranscriptSegment[] = transcript.map((item) => ({
            start: (item.offset || 0) / 1000, // Convert ms to seconds
            duration: (item.duration || 0) / 1000,
            text: cleanTranscriptText(item.text || ""),
        }));

        // Combine all text for raw transcript
        const raw = segments.map((s) => s.text).join(" ").trim();

        // Detect language (basic heuristic)
        const language = detectLanguage(raw);

        return createResponse({
            success: true,
            language,
            segments,
            raw,
        });
    } catch (error) {
        // Log error for debugging (server-side only)
        console.error("Transcript fetch error:", {
            videoId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Determine error type and message
        const errorMessage = getTranscriptErrorMessage(error);

        // Return 200 OK with error details for graceful degradation
        // This allows the UI to show a meaningful message while row stays valid
        return createResponse({
            success: true, // Still return success to not break the UI
            language: "",
            segments: [],
            raw: "",
            error: errorMessage,
        });
    }
}

// Clean transcript text (remove HTML entities, extra whitespace)
function cleanTranscriptText(text: string): string {
    return (
        text
            // Decode common HTML entities
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            // Remove any HTML tags
            .replace(/<[^>]*>/g, "")
            // Normalize whitespace
            .replace(/\s+/g, " ")
            .trim()
    );
}

// Get user-friendly error message for transcript errors
function getTranscriptErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("disabled")) {
            return "Transcripts are disabled for this video";
        }
        if (message.includes("private")) {
            return "Video is private - transcripts not accessible";
        }
        if (message.includes("not found") || message.includes("404")) {
            return "Video not found or has been removed";
        }
        if (message.includes("unavailable")) {
            return "Transcript unavailable for this video";
        }
        if (message.includes("no transcript")) {
            return "No transcript available for this video";
        }
        if (message.includes("network") || message.includes("fetch")) {
            return "Network error - please try again";
        }

        return error.message;
    }

    return "Transcript not available";
}

// Basic language detection (checks for common patterns)
function detectLanguage(text: string): string {
    if (!text || text.length < 10) return "";

    // Sample the first 500 characters for detection
    const sample = text.slice(0, 500).toLowerCase();

    // Check for Devanagari script (Hindi)
    if (/[\u0900-\u097F]/.test(sample)) return "hi";

    // Check for Arabic script
    if (/[\u0600-\u06FF]/.test(sample)) return "ar";

    // Check for CJK characters (Chinese, Japanese, Korean)
    if (/[\u4E00-\u9FFF]/.test(sample)) return "zh";
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return "ja";
    if (/[\uAC00-\uD7AF]/.test(sample)) return "ko";

    // Check for Cyrillic script (Russian)
    if (/[\u0400-\u04FF]/.test(sample)) return "ru";

    // Check for Spanish indicators
    if (/[áéíóúñ¿¡]/.test(sample)) return "es";

    // Check for French indicators
    if (/[àâäæçéèêëîïôùûü]/i.test(sample)) return "fr";

    // Check for German indicators
    if (/[äöüß]/.test(sample)) return "de";

    // Check for Portuguese indicators
    if (/[ãõçáéíóú]/.test(sample)) return "pt";

    // Check for common Spanish words
    if (/\b(el|la|de|que|en|es|un|los|las|por|con)\b/.test(sample)) return "es";

    // Check for common French words
    if (/\b(le|la|les|de|du|des|un|une|et|en|est)\b/.test(sample)) return "fr";

    // Check for common German words
    if (/\b(der|die|das|und|ist|ein|eine|nicht|mit|auf)\b/.test(sample)) return "de";

    // Default to English
    return "en";
}
