// CSV Export Utility with proper escaping

import type { AnalyzedVideo } from "@/types/video";

// Escape a field for CSV (RFC 4180 compliant)
function escapeCSVField(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    let stringValue: string;

    // If it's an array, join with semicolons (with fallback for empty arrays)
    if (Array.isArray(value)) {
        stringValue = value.length > 0 ? value.join("; ") : "[No Tags]";
    } else if (typeof value === "object") {
        // If it's an object (like thumbnails), stringify it
        stringValue = JSON.stringify(value);
    } else {
        stringValue = String(value);
    }

    // Check if we need to wrap in quotes
    const needsQuotes =
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r");

    if (needsQuotes) {
        // Escape internal quotes by doubling them
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
    }

    return stringValue;
}

// Define column order and headers
const CSV_COLUMNS: { key: keyof AnalyzedVideo; header: string }[] = [
    { key: "video_id", header: "Video ID" },
    { key: "video_title", header: "Title" },
    { key: "video_url", header: "URL" },
    { key: "channel_id", header: "Channel ID" },
    { key: "channel_name", header: "Channel" },
    { key: "views", header: "Views" },
    { key: "likes", header: "Likes" },
    { key: "comments_count", header: "Comments" },
    { key: "subscriber_count", header: "Subscribers" },
    { key: "publish_date", header: "Published Date" },
    { key: "duration_formatted", header: "Duration" },
    { key: "duration_seconds", header: "Duration (sec)" },
    { key: "faceless_score", header: "Faceless Score" },
    { key: "faceless_confidence", header: "Faceless Confidence" },
    { key: "made_for_kids", header: "Made for Kids" },
    { key: "default_language", header: "Language" },
    { key: "category_id", header: "Category ID" },
    { key: "tags", header: "Tags" },
    { key: "description", header: "Description" },
    { key: "channel_keywords", header: "Channel Keywords" },
    { key: "topic_categories_clean", header: "Topic Categories" },
    { key: "transcript_raw", header: "Transcript" },
    { key: "transcript_language", header: "Transcript Language" },
];

export function generateCSV(videos: AnalyzedVideo[]): string {
    // Header row
    const headers = CSV_COLUMNS.map((col) => col.header).join(",");

    // Data rows
    const rows = videos.map((video) => {
        return CSV_COLUMNS.map((col) => {
            const value = video[col.key];
            return escapeCSVField(value);
        }).join(",");
    });

    return [headers, ...rows].join("\r\n"); // Use CRLF for better Windows compatibility
}

export function downloadCSV(
    videos: AnalyzedVideo[],
    filename?: string
): void {
    // Generate filename with timestamp if not provided
    const timestamp = new Date().toISOString().split("T")[0];
    const finalFilename = filename || `youtube-spyglass-export-${timestamp}.csv`;

    // Ensure filename ends with .csv
    const csvFilename = finalFilename.endsWith(".csv")
        ? finalFilename
        : `${finalFilename}.csv`;

    const csv = generateCSV(videos);

    // Add BOM for Excel compatibility with UTF-8
    const bom = "\uFEFF";
    const csvContent = bom + csv;

    // Create blob with explicit type
    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8"
    });

    // Try modern download approach first
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
        // Modern File System Access API (Chrome 86+)
        saveWithFilePicker(blob, csvFilename).catch(() => {
            // Fallback to traditional approach
            downloadWithAnchor(blob, csvFilename);
        });
    } else {
        // Traditional anchor approach for other browsers
        downloadWithAnchor(blob, csvFilename);
    }
}

// Modern File System Access API download
async function saveWithFilePicker(blob: Blob, filename: string): Promise<void> {
    try {
        const handle = await (window as unknown as { showSaveFilePicker: (options: object) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: filename,
            types: [
                {
                    description: "CSV Files",
                    accept: { "text/csv": [".csv"] },
                },
            ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        // User cancelled or API not supported
        if ((err as Error).name !== "AbortError") {
            throw err;
        }
    }
}

// Traditional anchor download
function downloadWithAnchor(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    // Required for Firefox
    link.style.display = "none";
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

// Alternative: Generate data URL and download (fallback for older browsers)
export function downloadCSVDataUrl(videos: AnalyzedVideo[], filename?: string): void {
    const timestamp = new Date().toISOString().split("T")[0];
    const finalFilename = filename || `youtube-spyglass-export-${timestamp}.csv`;
    const csvFilename = finalFilename.endsWith(".csv") ? finalFilename : `${finalFilename}.csv`;

    const csv = generateCSV(videos);
    const bom = "\uFEFF";

    // Encode as data URL
    const dataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(bom + csv);

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = csvFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
}
