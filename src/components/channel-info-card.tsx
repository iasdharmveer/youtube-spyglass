"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import {
    Users,
    Eye,
    Video,
    Calendar,
    Globe,
    ExternalLink,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function formatNumber(num: number): string {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
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

export function ChannelInfoCard() {
    const { channelInfo } = useAppStore();
    const [showFullDescription, setShowFullDescription] = useState(false);

    if (!channelInfo) {
        return null;
    }

    const description = channelInfo.description || "";
    const shouldTruncate = description.length > 300;
    const displayDescription = showFullDescription
        ? description
        : description.slice(0, 300) + (shouldTruncate ? "..." : "");

    return (
        <Card className="mb-6 overflow-hidden">
            {/* Banner */}
            {channelInfo.bannerUrl && (
                <div className="relative w-full h-24 sm:h-32 bg-gradient-to-r from-violet-600 to-purple-600">
                    <Image
                        src={channelInfo.bannerUrl}
                        alt="Channel banner"
                        fill
                        className="object-cover opacity-80"
                        sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                </div>
            )}

            <CardContent className="relative pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Channel Avatar */}
                    <div className="flex-shrink-0">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-700 -mt-12 sm:-mt-14">
                            {channelInfo.thumbnailUrl ? (
                                <Image
                                    src={channelInfo.thumbnailUrl}
                                    alt={channelInfo.title}
                                    fill
                                    className="object-cover"
                                    sizes="96px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl font-bold">
                                    {channelInfo.title.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Channel Info */}
                    <div className="flex-1 min-w-0">
                        {/* Title and Link */}
                        <div className="flex items-start gap-2 mb-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                                {channelInfo.title}
                            </h2>
                            {channelInfo.customUrl && (
                                <a
                                    href={`https://youtube.com/${channelInfo.customUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4 text-violet-400" />
                                </a>
                            )}
                        </div>

                        {/* Handle */}
                        {channelInfo.customUrl && (
                            <p className="text-sm text-slate-400 mb-3">
                                {channelInfo.customUrl.startsWith("@")
                                    ? channelInfo.customUrl
                                    : `@${channelInfo.customUrl}`}
                            </p>
                        )}

                        {/* Stats Row */}
                        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 px-3 py-1"
                            >
                                <Users className="w-3.5 h-3.5 text-violet-400" />
                                <span className="font-semibold">
                                    {formatNumber(channelInfo.subscriberCount)}
                                </span>
                                <span className="text-slate-400 text-xs">subscribers</span>
                            </Badge>

                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 px-3 py-1"
                            >
                                <Video className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-semibold">
                                    {formatNumber(channelInfo.videoCount)}
                                </span>
                                <span className="text-slate-400 text-xs">videos</span>
                            </Badge>

                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 px-3 py-1"
                            >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-semibold">
                                    {formatNumber(channelInfo.viewCount)}
                                </span>
                                <span className="text-slate-400 text-xs">views</span>
                            </Badge>

                            {channelInfo.country && (
                                <Badge
                                    variant="outline"
                                    className="flex items-center gap-1 px-3 py-1"
                                >
                                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{channelInfo.country}</span>
                                </Badge>
                            )}

                            <Badge
                                variant="outline"
                                className="flex items-center gap-1 px-3 py-1"
                            >
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs">
                                    Joined {formatDate(channelInfo.publishedAt)}
                                </span>
                            </Badge>
                        </div>

                        {/* Description (About) */}
                        {description && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase">
                                    About
                                </h3>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                                    {displayDescription}
                                </p>
                                {shouldTruncate && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowFullDescription(!showFullDescription)}
                                        className="h-6 px-2 text-xs text-violet-400"
                                    >
                                        {showFullDescription ? (
                                            <>
                                                <ChevronUp className="w-3 h-3 mr-1" /> Show less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-3 h-3 mr-1" /> Show more
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Keywords */}
                        {channelInfo.keywords && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                                    Channel Keywords
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                    {channelInfo.keywords}
                                </p>
                            </div>
                        )}

                        {/* Email */}
                        {channelInfo.email && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                                    📧 Contact Email
                                </h3>
                                <a
                                    href={`mailto:${channelInfo.email}`}
                                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                                >
                                    {channelInfo.email}
                                </a>
                            </div>
                        )}

                        {/* Links from description */}
                        {channelInfo.links && channelInfo.links.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                                    🔗 Links
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {channelInfo.links.slice(0, 5).map((link, index) => {
                                        // Extract domain for display
                                        let displayText = link;
                                        try {
                                            const url = new URL(link);
                                            displayText = url.hostname.replace("www.", "");
                                        } catch {
                                            displayText = link.slice(0, 30);
                                        }
                                        return (
                                            <a
                                                key={index}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {displayText}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
