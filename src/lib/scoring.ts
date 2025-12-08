// Faceless Score Algorithm

interface VideoDetails {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
}

interface ChannelDetails {
    keywords: string;
    description: string;
}

interface FacelessResult {
    score: number;
    confidence: "High" | "Medium" | "Low" | "N/A";
}

// Bonus keywords (case-insensitive)
const BONUS_CONTENT_KEYWORDS = [
    "ai", "stock", "footage", "archive", "voiceover", "animation",
    "animated", "motion graphics", "infographic", "b-roll", "narration"
];

const BONUS_TITLE_KEYWORDS = [
    "explained", "history of", "the truth", "documentary", "how", "what is",
    "why", "facts about", "things you", "top 10", "top 5", "did you know"
];

// Penalty keywords (case-insensitive)
const PENALTY_TITLE_KEYWORDS = [
    "vlog", "live", "q&a", "my day", "react", "reaction", "day in my life",
    "get ready with me", "grwm", "unboxing", "haul", "room tour", "house tour"
];

const FIRST_PERSON_PATTERNS = /\b(i|me|my|we|our|i'm|i've|i'll)\b/i;

// Education/Science category IDs
const FACELESS_FRIENDLY_CATEGORIES = ["27", "28"]; // Education, Science & Tech

export function calculateFacelessScore(
    video: VideoDetails,
    channel: ChannelDetails
): FacelessResult {
    let score = 50;
    const titleLower = video.title.toLowerCase();
    const descLower = video.description.toLowerCase();
    const tagsLower = video.tags.map(t => t.toLowerCase()).join(" ");
    const keywordsLower = channel.keywords?.toLowerCase() || "";
    const combinedContent = `${descLower} ${tagsLower} ${keywordsLower}`;

    // --- BONUSES ---

    // +20 if content contains faceless-friendly keywords
    const hasContentBonus = BONUS_CONTENT_KEYWORDS.some(kw =>
        combinedContent.includes(kw)
    );
    if (hasContentBonus) {
        score += 20;
    }

    // +15 if title contains explanatory/documentary patterns
    const hasTitleBonus = BONUS_TITLE_KEYWORDS.some(kw =>
        titleLower.includes(kw)
    );
    if (hasTitleBonus) {
        score += 15;
    }

    // +10 if category is Education or Science
    if (FACELESS_FRIENDLY_CATEGORIES.includes(video.categoryId)) {
        score += 10;
    }

    // --- PENALTIES ---

    // -40 if title contains vlog/live/react patterns (unless "Product Review")
    const isProductReview = titleLower.includes("product") && titleLower.includes("review");
    const hasPenaltyTitle = PENALTY_TITLE_KEYWORDS.some(kw =>
        titleLower.includes(kw)
    );
    if (hasPenaltyTitle && !isProductReview) {
        score -= 40;
    }

    // -30 if title uses first person pronouns
    if (FIRST_PERSON_PATTERNS.test(video.title)) {
        score -= 30;
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine confidence
    let confidence: "High" | "Medium" | "Low" | "N/A";
    if (score >= 75) {
        confidence = "High";
    } else if (score >= 50) {
        confidence = "Medium";
    } else {
        confidence = "Low";
    }

    return { score, confidence };
}

// Export keyword arrays for use in search augmentation
export const FACELESS_SEARCH_SUFFIXES = [
    "explained",
    "documentary",
    "facts",
    "history of",
    "how it works",
    "animation"
];
