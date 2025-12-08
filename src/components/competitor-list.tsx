"use client";

import * as React from "react";
import Image from "next/image";
import {
    Users,
    Eye,
    Video,
    ExternalLink,
    Mail,
    Globe,
    Calendar,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChannelInfo } from "@/types/video";

// Helper for formatting numbers (e.g., 1.2M, 100K)
function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
}

interface CompetitorListProps {
    competitors: ChannelInfo[];
}

export function CompetitorList({ competitors }: CompetitorListProps) {
    if (!competitors || competitors.length === 0) return null;

    return (
        <Card className="w-full bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Competitor Intelligence
                    <Badge variant="secondary" className="ml-2 text-xs">
                        {competitors.length} Found
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="flex w-max space-x-4 p-1">
                        {competitors.map((channel) => (
                            <div
                                key={channel.channelId}
                                className="w-[280px] shrink-0 rounded-lg border border-slate-700/50 bg-slate-900/80 p-4 hover:border-violet-500/30 transition-colors"
                            >
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="relative w-10 h-10 shrink-0">
                                        <Image
                                            src={channel.thumbnailUrl || "/placeholder-user.jpg"}
                                            alt={channel.title}
                                            fill
                                            className="rounded-full object-cover border border-slate-700"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm text-white truncate" title={channel.title}>
                                            {channel.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <span>{formatNumber(channel.subscriberCount)} subs</span>
                                            <span>•</span>
                                            <span>{formatNumber(channel.videoCount)} vids</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Link / Email Badges */}
                                <div className="space-y-2">
                                    {/* Email */}
                                    {channel.email && (
                                        <a
                                            href={`mailto:${channel.email}`}
                                            className="flex items-center gap-2 text-xs text-violet-300 hover:text-violet-200 bg-violet-500/10 px-2 py-1.5 rounded transition-colors w-full"
                                        >
                                            <Mail className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{channel.email}</span>
                                        </a>
                                    )}

                                    {/* Links (First 2 only) */}
                                    {channel.links && channel.links.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {channel.links.slice(0, 3).map((link, i) => {
                                                let domain = link;
                                                try {
                                                    domain = new URL(link).hostname.replace("www.", "");
                                                } catch {
                                                    domain = "Link";
                                                }
                                                return (
                                                    <a
                                                        key={i}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50"
                                                    >
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                        {domain}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
