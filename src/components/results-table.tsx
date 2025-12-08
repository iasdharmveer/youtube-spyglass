"use client";

import * as React from "react";
import Image from "next/image";
import {
    Download,
    FileText,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Eye,
    ThumbsUp,
    MessageSquare,
    Users,
    Clock,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    AlertCircle,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { downloadCSV, downloadCSVDataUrl } from "@/lib/csv-export";
import type { AnalyzedVideo } from "@/types/video";

const ITEMS_PER_PAGE = 10;

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
}

function formatDate(isoString: string): string {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDuration(minutes: number): string {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
}

function truncateText(text: string, maxLength: number): string {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}

interface FacelessBadgeProps {
    score: number;
    confidence: string;
}

function FacelessBadge({ score, confidence }: FacelessBadgeProps) {
    let variant: "success" | "warning" | "destructive" = "destructive";
    if (score >= 70) variant = "success";
    else if (score >= 50) variant = "warning";

    return (
        <div className="flex flex-col items-center gap-1">
            <Badge variant={variant} className="font-bold">
                {score}
            </Badge>
            <span className="text-xs text-slate-500">{confidence}</span>
        </div>
    );
}

// Copy to clipboard hook
function useCopyToClipboard() {
    const [copied, setCopied] = React.useState(false);

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return { copied, copy };
}

// Expandable text component for description and transcript
interface ExpandableTextProps {
    text: string;
    label: string;
    maxPreviewLength?: number;
}

function ExpandableText({
    text,
    label,
    maxPreviewLength = 150,
}: ExpandableTextProps) {
    const [expanded, setExpanded] = React.useState(false);
    const { copied, copy } = useCopyToClipboard();

    if (!text) {
        return (
            <p className="text-sm text-slate-500 italic">
                No {label.toLowerCase() || "content"} available
            </p>
        );
    }

    const needsExpansion = text.length > maxPreviewLength;
    const displayText = expanded ? text : truncateText(text, maxPreviewLength);

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase">
                        {label}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(text)}
                        className="h-6 px-2 text-xs"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                            <Copy className="w-3 h-3" />
                        )}
                    </Button>
                </div>
            )}
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                {displayText}
            </p>
            {needsExpansion && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="h-6 px-2 text-xs text-violet-400"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3 mr-1" /> Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3 mr-1" /> Show more (
                            {text.length} chars)
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}

// Mobile card view for a single video
interface VideoCardProps {
    video: AnalyzedVideo;
}

function MobileVideoCard({ video }: VideoCardProps) {
    const [expanded, setExpanded] = React.useState(false);
    const hasTranscript = video.transcript_raw && video.transcript_raw.length > 0;

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-700/50">
            {/* Thumbnail and Title */}
            <div className="flex gap-3">
                <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                    {video.thumbnails.medium ? (
                        <Image
                            src={video.thumbnails.medium}
                            alt={video.video_title}
                            fill
                            className="object-cover"
                            sizes="96px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                            No Image
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-violet-400 transition-colors line-clamp-2 text-sm flex items-start gap-1"
                    >
                        {video.video_title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    </a>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                        {video.channel_name}
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/50 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1 text-violet-400">
                        <Eye className="w-3 h-3" />
                        <span className="text-sm font-medium">{formatNumber(video.views)}</span>
                    </div>
                    <span className="text-xs text-slate-500">Views</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-sm font-medium">{formatNumber(video.likes)}</span>
                    </div>
                    <span className="text-xs text-slate-500">Likes</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                        <Users className="w-3 h-3" />
                        <span className="text-sm font-medium">
                            {formatNumber(video.subscriber_count)}
                        </span>
                    </div>
                    <span className="text-xs text-slate-500">Subs</span>
                </div>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration_minutes)}
                    </span>
                    <span>{formatDate(video.publish_date)}</span>
                </div>

                <div className="flex items-center gap-2">
                    <FacelessBadge
                        score={video.faceless_score}
                        confidence={video.faceless_confidence}
                    />
                    {hasTranscript && (
                        <Badge variant="success" className="text-xs">
                            <FileText className="w-3 h-3" />
                        </Badge>
                    )}
                </div>
            </div>

            {/* Expand button */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full"
            >
                {expanded ? (
                    <>
                        <ChevronUp className="w-4 h-4 mr-2" /> Hide Details
                    </>
                ) : (
                    <>
                        <ChevronDown className="w-4 h-4 mr-2" /> Show Details
                    </>
                )}
            </Button>

            {/* Expanded content */}
            {expanded && (
                <div className="space-y-4 pt-2 border-t border-slate-700/50">
                    {/* Description */}
                    <ExpandableText text={video.description} label="Description" />

                    {/* Transcript */}
                    <div className="space-y-2">
                        <span className="text-xs font-medium text-slate-400 uppercase">
                            Transcript{" "}
                            {video.transcript_language && `(${video.transcript_language})`}
                        </span>
                        {hasTranscript ? (
                            <ExpandableText
                                text={video.transcript_raw}
                                label=""
                                maxPreviewLength={300}
                            />
                        ) : (
                            <p className="text-sm text-slate-500 italic">
                                No transcript available
                            </p>
                        )}
                    </div>

                    {/* Tags */}
                    {video.tags && video.tags.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-xs font-medium text-slate-400 uppercase">
                                Tags
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {video.tags.slice(0, 10).map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {video.tags.length > 10 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{video.tags.length - 10} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Desktop table row with expandable details
function VideoRow({ video }: VideoCardProps) {
    const [expanded, setExpanded] = React.useState(false);
    const hasTranscript = video.transcript_raw && video.transcript_raw.length > 0;

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-slate-800/50"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Expand indicator */}
                <TableCell className="w-10">
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </TableCell>

                {/* Thumbnail */}
                <TableCell className="w-32">
                    <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-slate-800">
                        {video.thumbnails.medium ? (
                            <Image
                                src={video.thumbnails.medium}
                                alt={video.video_title}
                                fill
                                className="object-cover"
                                sizes="112px"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                No Image
                            </div>
                        )}
                    </div>
                </TableCell>

                {/* Title & Channel */}
                <TableCell className="max-w-xs">
                    <div className="space-y-1">
                        <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-white hover:text-violet-400 transition-colors line-clamp-2 flex items-start gap-1"
                        >
                            {video.video_title}
                            <ExternalLink className="w-3 h-3 flex-shrink-0 mt-1" />
                        </a>
                        <p className="text-sm text-slate-400">{video.channel_name}</p>
                    </div>
                </TableCell>

                {/* Metrics */}
                <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-violet-400" />
                            {formatNumber(video.views)}
                        </span>
                        <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-emerald-400" />
                            {formatNumber(video.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            {formatNumber(video.comments_count)}
                        </span>
                    </div>
                </TableCell>

                {/* Channel Stats */}
                <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3 text-violet-400" />
                        {formatNumber(video.subscriber_count)}
                    </span>
                </TableCell>

                {/* Duration */}
                <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDuration(video.duration_minutes)}
                    </span>
                </TableCell>

                {/* Published */}
                <TableCell className="text-sm text-slate-400">
                    {formatDate(video.publish_date)}
                </TableCell>

                {/* Faceless Score */}
                <TableCell>
                    <FacelessBadge
                        score={video.faceless_score}
                        confidence={video.faceless_confidence}
                    />
                </TableCell>

                {/* Transcript Status */}
                <TableCell>
                    {hasTranscript ? (
                        <Badge variant="success" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Ready
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs text-slate-400">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            N/A
                        </Badge>
                    )}
                </TableCell>
            </TableRow>

            {/* Expanded row with description and transcript */}
            {expanded && (
                <TableRow className="bg-slate-900/50">
                    <TableCell colSpan={9} className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Description */}
                            <div className="space-y-2">
                                <ExpandableText
                                    text={video.description}
                                    label="Description"
                                    maxPreviewLength={400}
                                />
                            </div>

                            {/* Transcript */}
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-slate-400 uppercase">
                                    Transcript{" "}
                                    {video.transcript_language && `(${video.transcript_language})`}
                                </span>
                                {hasTranscript ? (
                                    <ExpandableText
                                        text={video.transcript_raw}
                                        label=""
                                        maxPreviewLength={500}
                                    />
                                ) : (
                                    <p className="text-sm text-slate-500 italic">
                                        No transcript available for this video
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {video.tags && video.tags.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                                <span className="text-xs font-medium text-slate-400 uppercase block mb-2">
                                    Tags
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {video.tags.slice(0, 15).map((tag, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {video.tags.length > 15 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{video.tags.length - 15} more
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

export function ResultsTable() {
    const { results, filters } = useAppStore();
    const [currentPage, setCurrentPage] = React.useState(1);

    // Reset page when results change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [results]);

    // Sort results if faceless mode is on
    const sortedResults = React.useMemo(() => {
        if (filters.facelessMode) {
            return [...results].sort((a, b) => b.faceless_score - a.faceless_score);
        }
        return results;
    }, [results, filters.facelessMode]);

    const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedResults = sortedResults.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    const handleExportCSV = () => {
        // Create unique filename with channel name and timestamp
        const now = new Date();
        const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const time = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS

        // Get channel name from first result (sanitize for filename)
        const channelName = sortedResults.length > 0
            ? sortedResults[0].channel_name
                .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
                .replace(/\s+/g, "_") // Replace spaces with underscores
                .substring(0, 30) // Limit length
            : "export";

        const filename = `youtube-spyglass-${channelName}-${date}-${time}.csv`;

        try {
            downloadCSV(sortedResults, filename);
        } catch (error) {
            console.warn("Primary CSV download failed, trying fallback:", error);
            try {
                downloadCSVDataUrl(sortedResults, filename);
            } catch (fallbackError) {
                console.error("CSV export failed:", fallbackError);
                alert("Failed to export CSV. Please try again.");
            }
        }
    };

    if (results.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 sm:py-12">
                    <div className="text-center text-slate-400">
                        <Eye className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-base sm:text-lg font-medium">No results yet</p>
                        <p className="text-sm">
                            Use the search above to discover viral content
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg sm:text-xl">
                        Results ({sortedResults.length})
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {filters.facelessMode
                            ? "Sorted by Faceless Score (highest first)"
                            : "Sorted by view count"}{" "}
                        • Click a row to expand details
                    </CardDescription>
                </div>
                <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="w-full sm:w-auto"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
            </CardHeader>
            <CardContent>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                    {paginatedResults.map((video) => (
                        <MobileVideoCard key={video.video_id} video={video} />
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Thumbnail</TableHead>
                                <TableHead>Title / Channel</TableHead>
                                <TableHead>Metrics</TableHead>
                                <TableHead>Subscribers</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Published</TableHead>
                                <TableHead>Faceless</TableHead>
                                <TableHead>Transcript</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedResults.map((video) => (
                                <VideoRow key={video.video_id} video={video} />
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-700/50">
                        <p className="text-xs sm:text-sm text-slate-400 order-2 sm:order-1">
                            Showing {startIndex + 1}-
                            {Math.min(startIndex + ITEMS_PER_PAGE, sortedResults.length)} of{" "}
                            {sortedResults.length}
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Prev</span>
                            </Button>
                            <span className="text-sm text-slate-300 px-2 min-w-[100px] text-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <span className="hidden sm:inline">Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
