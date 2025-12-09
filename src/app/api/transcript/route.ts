// Server-Side Transcript Proxy - BULLETPROOF 2025 Implementation
// GET /api/transcript?videoId=...
// Uses multiple fallback strategies: manual captions → auto-generated → any language
// With p-retry for network resilience

import { NextRequest, NextResponse } from "next/server";
import pRetry from "p-retry";
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
    method?: string; // Track which method succeeded
}

// Priority languages for fallback (most common YouTube languages)
const LANGUAGE_PRIORITY = [
    "en", "en-US", "en-GB", "en-AU", "en-CA", "en-IN",
    "hi", "es", "es-ES", "es-MX", "es-419",
    "pt", "pt-BR", "pt-PT",
    "fr", "fr-FR", "fr-CA",
    "de", "de-DE",
    "ar", "ja", "ko", "zh", "zh-CN", "zh-TW",
    "ru", "it", "nl", "pl", "tr", "id", "th", "vi"
];

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

    if (data.success && data.segments.length > 0) {
        response.headers.set(
            "Cache-Control",
            `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
        );
    } else {
        response.headers.set("Cache-Control", "no-store");
    }

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

// Clean transcript text - remove HTML entities and normalize whitespace
function cleanTranscriptText(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Parse YouTube's timedtext XML format
function parseTimedTextXML(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    // Match <text> elements with start and dur attributes
    const textRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
        const start = parseFloat(match[1]);
        const duration = parseFloat(match[2]);
        const text = cleanTranscriptText(match[3]);

        if (text) {
            segments.push({ start, duration, text });
        }
    }

    return segments;
}

// Parse YouTube's JSON3 format (newer format)
function parseJSON3Format(json: any): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    try {
        const events = json.events || [];
        for (const event of events) {
            if (event.segs) {
                const start = (event.tStartMs || 0) / 1000;
                const duration = (event.dDurationMs || 0) / 1000;
                const text = event.segs.map((s: any) => s.utf8 || "").join("");

                if (text.trim()) {
                    segments.push({
                        start,
                        duration,
                        text: cleanTranscriptText(text)
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error parsing JSON3 format:", e);
    }

    return segments;
}

// Fetch video page and extract caption tracks
async function getCaptionTracks(videoId: string): Promise<{
    captionTracks: Array<{
        baseUrl: string;
        languageCode: string;
        kind?: string; // "asr" for auto-generated
        name?: string;
    }>;
}> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await fetch(watchUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch video page: ${response.status}`);
    }

    const html = await response.text();

    // Extract ytInitialPlayerResponse
    const playerResponseMatch = html.match(
        /ytInitialPlayerResponse\s*=\s*({.+?});(?:<\/script>|\s*var\s)/
    );

    if (!playerResponseMatch) {
        // Try alternative pattern
        const altMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
        if (!altMatch) {
            throw new Error("Could not find player response in video page");
        }
        const playerResponse = JSON.parse(altMatch[1]);
        return extractCaptionTracks(playerResponse);
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    return extractCaptionTracks(playerResponse);
}

function extractCaptionTracks(playerResponse: any): {
    captionTracks: Array<{
        baseUrl: string;
        languageCode: string;
        kind?: string;
        name?: string;
    }>;
} {
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;

    if (!captions || !captions.captionTracks) {
        // Check for playability error
        const playability = playerResponse?.playabilityStatus;
        if (playability?.status === "ERROR" || playability?.status === "UNPLAYABLE") {
            throw new Error(playability.reason || "Video is not available");
        }
        if (playability?.status === "LOGIN_REQUIRED") {
            throw new Error("Video requires login - possibly age-restricted");
        }

        throw new Error("No caption tracks available");
    }

    return {
        captionTracks: captions.captionTracks.map((track: any) => ({
            baseUrl: track.baseUrl,
            languageCode: track.languageCode,
            kind: track.kind,
            name: track.name?.simpleText || track.languageCode,
        })),
    };
}

// Fetch transcript from a caption track URL
async function fetchTranscriptFromUrl(
    baseUrl: string,
    preferJSON: boolean = true
): Promise<TranscriptSegment[]> {
    // Try JSON3 format first (more reliable parsing)
    const url = new URL(baseUrl);
    if (preferJSON) {
        url.searchParams.set("fmt", "json3");
    }

    const response = await fetch(url.toString(), {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`);
    }

    const content = await response.text();

    // Try parsing as JSON first
    if (preferJSON) {
        try {
            const json = JSON.parse(content);
            const segments = parseJSON3Format(json);
            if (segments.length > 0) {
                return segments;
            }
        } catch {
            // Fall through to XML parsing
        }
    }

    // Parse as XML
    return parseTimedTextXML(content);
}

// Main transcript fetching logic with fallbacks
async function fetchTranscriptWithFallbacks(
    videoId: string,
    preferredLang?: string
): Promise<{ segments: TranscriptSegment[]; language: string; method: string }> {
    // Get all available caption tracks
    const { captionTracks } = await getCaptionTracks(videoId);

    if (captionTracks.length === 0) {
        throw new Error("No caption tracks available for this video");
    }

    console.log(`[Transcript] Found ${captionTracks.length} caption tracks for ${videoId}`);

    // Strategy 1: Try preferred language (manual captions first)
    if (preferredLang) {
        const manualTrack = captionTracks.find(
            t => t.languageCode.startsWith(preferredLang) && t.kind !== "asr"
        );
        if (manualTrack) {
            try {
                const segments = await fetchTranscriptFromUrl(manualTrack.baseUrl);
                if (segments.length > 0) {
                    return {
                        segments,
                        language: manualTrack.languageCode,
                        method: `manual_${preferredLang}`
                    };
                }
            } catch (e) {
                console.warn(`[Transcript] Failed to fetch manual ${preferredLang}:`, e);
            }
        }

        // Try auto-generated for preferred language
        const autoTrack = captionTracks.find(
            t => t.languageCode.startsWith(preferredLang) && t.kind === "asr"
        );
        if (autoTrack) {
            try {
                const segments = await fetchTranscriptFromUrl(autoTrack.baseUrl);
                if (segments.length > 0) {
                    return {
                        segments,
                        language: autoTrack.languageCode,
                        method: `auto_${preferredLang}`
                    };
                }
            } catch (e) {
                console.warn(`[Transcript] Failed to fetch auto ${preferredLang}:`, e);
            }
        }
    }

    // Strategy 2: Try manual captions in priority order
    for (const lang of LANGUAGE_PRIORITY) {
        const manualTrack = captionTracks.find(
            t => t.languageCode.startsWith(lang) && t.kind !== "asr"
        );
        if (manualTrack) {
            try {
                const segments = await fetchTranscriptFromUrl(manualTrack.baseUrl);
                if (segments.length > 0) {
                    return {
                        segments,
                        language: manualTrack.languageCode,
                        method: `manual_priority_${lang}`
                    };
                }
            } catch (e) {
                console.warn(`[Transcript] Failed manual priority ${lang}:`, e);
            }
        }
    }

    // Strategy 3: Try auto-generated captions in priority order
    for (const lang of LANGUAGE_PRIORITY) {
        const autoTrack = captionTracks.find(
            t => t.languageCode.startsWith(lang) && t.kind === "asr"
        );
        if (autoTrack) {
            try {
                const segments = await fetchTranscriptFromUrl(autoTrack.baseUrl);
                if (segments.length > 0) {
                    return {
                        segments,
                        language: autoTrack.languageCode,
                        method: `auto_priority_${lang}`
                    };
                }
            } catch (e) {
                console.warn(`[Transcript] Failed auto priority ${lang}:`, e);
            }
        }
    }

    // Strategy 4: Try ANY available manual caption
    const anyManual = captionTracks.find(t => t.kind !== "asr");
    if (anyManual) {
        try {
            const segments = await fetchTranscriptFromUrl(anyManual.baseUrl);
            if (segments.length > 0) {
                return {
                    segments,
                    language: anyManual.languageCode,
                    method: `any_manual_${anyManual.languageCode}`
                };
            }
        } catch (e) {
            console.warn(`[Transcript] Failed any manual:`, e);
        }
    }

    // Strategy 5: Try ANY available auto-generated caption
    const anyAuto = captionTracks.find(t => t.kind === "asr");
    if (anyAuto) {
        try {
            const segments = await fetchTranscriptFromUrl(anyAuto.baseUrl);
            if (segments.length > 0) {
                return {
                    segments,
                    language: anyAuto.languageCode,
                    method: `any_auto_${anyAuto.languageCode}`
                };
            }
        } catch (e) {
            console.warn(`[Transcript] Failed any auto:`, e);
        }
    }

    // Strategy 6: Last resort - try first available track
    const firstTrack = captionTracks[0];
    const segments = await fetchTranscriptFromUrl(firstTrack.baseUrl);
    if (segments.length > 0) {
        return {
            segments,
            language: firstTrack.languageCode,
            method: `last_resort_${firstTrack.languageCode}`
        };
    }

    throw new Error("All transcript fetch strategies failed");
}

// Get user-friendly error message
function getTranscriptErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("disabled") || message.includes("no caption tracks")) {
            return "[Transcript Disabled]";
        }
        if (message.includes("private") || message.includes("login")) {
            return "[Video Private/Restricted]";
        }
        if (message.includes("not found") || message.includes("404") || message.includes("not available")) {
            return "[Video Unavailable]";
        }
        if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
            return "[Network Error]";
        }
        if (message.includes("age-restricted")) {
            return "[Age Restricted]";
        }

        return `[Error: ${error.message.slice(0, 50)}]`;
    }

    return "[Transcript Error]";
}

export async function GET(
    request: NextRequest
): Promise<NextResponse<TranscriptResponse>> {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const lang = searchParams.get("lang");

    // Validate videoId parameter
    if (!videoId) {
        return createResponse({
            success: false,
            language: "",
            segments: [],
            raw: "",
            error: "Missing videoId parameter",
        }, 400);
    }

    // Validate videoId format
    if (!isValidVideoId(videoId)) {
        return createResponse({
            success: false,
            language: "",
            segments: [],
            raw: "",
            error: "Invalid videoId format",
        }, 400);
    }

    try {
        // Use p-retry for network resilience (3 attempts with exponential backoff)
        const result = await pRetry(
            () => fetchTranscriptWithFallbacks(videoId, lang || undefined),
            {
                retries: 3,
                minTimeout: 1000,
                maxTimeout: 5000,
                onFailedAttempt: (ctx) => {
                    console.warn(
                        "[Transcript] Attempt " + ctx.attemptNumber + " failed for " + videoId + ", " + ctx.retriesLeft + " retries left"
                    );
                },
            }
        );

        // Combine all text for raw transcript
        const raw = result.segments.map((s) => s.text).join(" ").trim();

        console.log(
            `[Transcript] Success for ${videoId}: ${result.segments.length} segments, ` +
            `language=${result.language}, method=${result.method}`
        );

        return createResponse({
            success: true,
            language: result.language,
            segments: result.segments,
            raw,
            method: result.method,
        });
    } catch (primaryError) {
        console.warn("[Transcript] Primary method failed, trying youtube-transcript fallback:", {
            videoId,
            error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        });

        // SECONDARY FALLBACK: Try youtube-transcript library
        try {
            const fallbackTranscript = await pRetry(
                async () => {
                    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                    if (!transcript || transcript.length === 0) {
                        throw new Error("No transcript from fallback");
                    }
                    return transcript;
                },
                { retries: 2, minTimeout: 500, maxTimeout: 3000 }
            );

            const segments: TranscriptSegment[] = fallbackTranscript.map((item) => ({
                start: (item.offset || 0) / 1000,
                duration: (item.duration || 0) / 1000,
                text: cleanTranscriptText(item.text || ""),
            }));

            const raw = segments.map((s) => s.text).join(" ").trim();

            console.log("[Transcript] Fallback succeeded for " + videoId + ": " + segments.length + " segments");

            return createResponse({
                success: true,
                language: "en", // youtube-transcript doesn't provide language info
                segments,
                raw,
                method: "youtube-transcript-fallback",
            });
        } catch (fallbackError) {
            console.error("[Transcript] All methods failed:", {
                videoId,
                primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
                fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });

            const errorMessage = getTranscriptErrorMessage(primaryError);

            return createResponse({
                success: true, // Return success to not break UI
                language: "",
                segments: [],
                raw: errorMessage,
                error: errorMessage,
            });
        }
    }
}
