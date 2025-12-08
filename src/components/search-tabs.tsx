"use client";

import * as React from "react";
import { Search, Link, AtSign, Loader2, AlertCircle, Sparkles, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import {
    searchYouTube,
    buildAnalyzedVideos,
    extractVideoId,
    extractChannelHandle,
    getVideoDetails,
    getChannelDetails,
    getChannelVideos,
    resolveChannelHandle,
    getErrorMessage,
    validateApiKey,
    fetchTranscriptsForVideos,
} from "@/lib/youtube-client";
import { FACELESS_SEARCH_SUFFIXES } from "@/lib/scoring";
import type { SearchMode, AnalyzedVideo, ChannelInfo } from "@/types/video";
import { CompetitorList } from "@/components/competitor-list";

export function SearchTabs() {
    const {
        apiKey,
        searchMode,
        setSearchMode,
        filters,
        setResults,
        setChannelInfo,
        isLoading,
        setIsLoading,
        error,
        setError,
    } = useAppStore();

    const [keywordInput, setKeywordInput] = React.useState("");
    const [videoLinkInput, setVideoLinkInput] = React.useState("");
    const [channelHandleInput, setChannelHandleInput] = React.useState("");
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
    const [competitorInfos, setCompetitorInfos] = React.useState<ChannelInfo[]>([]);

    const handleTabChange = (value: string) => {
        setSearchMode(value as SearchMode);
        setError(null);
        setSuccessMessage(null);
    };

    // Clear success message after 5 seconds
    React.useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // MODE A: Keyword (Viral Discovery)
    const handleKeywordSearch = async () => {
        if (!apiKey) {
            setError("Please configure your YouTube API key first");
            return;
        }
        if (!validateApiKey(apiKey)) {
            setError("Invalid API key format. Keys should start with 'AIza'");
            return;
        }
        if (!keywordInput.trim()) {
            setError("Please enter a keyword to search");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            let query = keywordInput.trim();

            // If Faceless Mode is ON, augment the query
            if (filters.facelessMode) {
                const suffix =
                    FACELESS_SEARCH_SUFFIXES[
                    Math.floor(Math.random() * FACELESS_SEARCH_SUFFIXES.length)
                    ];
                query = `${query} ${suffix}`;
            }
            // Clear channel info for keyword search (no specific channel)
            setChannelInfo(null);
            setCompetitorInfos([]);

            // Search videos
            const searchResults = await searchYouTube({
                apiKey,
                query,
                maxResults: filters.resultsLimit,
                regionCode: filters.region || undefined,
                relevanceLanguage: filters.language || undefined,
                order: "viewCount",
                type: "video",
                publishedAfter: filters.publishedAfter
                    ? new Date(filters.publishedAfter).toISOString()
                    : undefined,
            });

            // Build full analyzed videos
            const videos = await buildAnalyzedVideos(apiKey, searchResults, {
                minViews: filters.minViews,
                minSubscribers: filters.minSubscribers,
                videoDuration: filters.videoDuration,
            });

            // Sort by faceless score if mode is on
            if (filters.facelessMode) {
                videos.sort((a, b) => b.faceless_score - a.faceless_score);
            }

            // Set initial results without transcripts
            setResults(videos);
            setSuccessMessage(`Found ${videos.length} videos. Fetching transcripts...`);

            // Auto-fetch transcripts in background
            const videosWithTranscripts = await fetchTranscriptsForVideos(videos);
            setResults(videosWithTranscripts);
            setSuccessMessage(`Loaded ${videos.length} videos with transcripts`);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    // MODE B: Video Link (Channel X-Ray)
    const handleVideoLinkSearch = async () => {
        if (!apiKey) {
            setError("Please configure your YouTube API key first");
            return;
        }
        if (!validateApiKey(apiKey)) {
            setError("Invalid API key format. Keys should start with 'AIza'");
            return;
        }

        const videoId = extractVideoId(videoLinkInput);
        if (!videoId) {
            setError("Please enter a valid YouTube video URL");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Get video details to find channel ID
            const videoDetails = await getVideoDetails(apiKey, [videoId]);
            if (videoDetails.length === 0) {
                throw new Error("Video not found");
            }

            const channelId = videoDetails[0].channelId;

            // Fetch full channel details for display
            const channelDetails = await getChannelDetails(apiKey, [channelId]);
            if (channelDetails.length > 0) {
                const ch = channelDetails[0];
                const info: ChannelInfo = {
                    channelId: ch.channelId,
                    title: ch.title,
                    description: ch.description,
                    customUrl: ch.customUrl || "",
                    thumbnailUrl: ch.thumbnails?.high || ch.thumbnails?.medium || "",
                    bannerUrl: ch.bannerUrl || "",
                    subscriberCount: ch.subscriberCount,
                    videoCount: ch.videoCount,
                    viewCount: ch.viewCount,
                    publishedAt: ch.publishedAt,
                    country: ch.country || "",
                    keywords: ch.keywords || "",
                    email: ch.email || "",
                    links: ch.links || [],
                };
                setChannelInfo(info);
            }
            setCompetitorInfos([]); // Clear competitors for this mode

            const channelName = channelDetails.length > 0 ? channelDetails[0].title : "Channel";

            // Get channel's top videos
            const channelVideos = await getChannelVideos(
                apiKey,
                channelId,
                filters.resultsLimit,
                "viewCount",
                filters.publishedAfter
                    ? new Date(filters.publishedAfter).toISOString()
                    : undefined
            );

            // Build full analyzed videos
            const videos = await buildAnalyzedVideos(apiKey, channelVideos, {
                minViews: filters.minViews,
                minSubscribers: filters.minSubscribers,
                videoDuration: filters.videoDuration,
            });

            // Sort by faceless score if mode is on
            if (filters.facelessMode) {
                videos.sort((a, b) => b.faceless_score - a.faceless_score);
            } else {
                videos.sort((a, b) => b.views - a.views);
            }

            // Set initial results without transcripts
            setResults(videos);
            setSuccessMessage(`Found ${videos.length} videos from "${channelName}". Fetching transcripts...`);

            // Auto-fetch transcripts in background
            const videosWithTranscripts = await fetchTranscriptsForVideos(videos);
            setResults(videosWithTranscripts);
            setSuccessMessage(`Loaded ${videos.length} videos from "${channelName}" with transcripts`);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    // MODE C: Channel Handle (Competitor Hunt) - Find similar channels and their viral videos
    const handleChannelHandleSearch = async () => {
        if (!apiKey) {
            setError("Please configure your YouTube API key first");
            return;
        }
        if (!validateApiKey(apiKey)) {
            setError("Invalid API key format. Keys should start with 'AIza'");
            return;
        }

        const handle =
            extractChannelHandle(channelHandleInput) ||
            channelHandleInput.replace("@", "").trim();
        if (!handle) {
            setError("Please enter a valid channel handle (e.g., @MKBHD)");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Step 1: Resolve handle to channel ID
            const channelId = await resolveChannelHandle(apiKey, handle);
            if (!channelId) {
                throw new Error("Channel not found. Please check the handle and try again.");
            }

            // Step 2: Get channel details including keywords for niche discovery
            const channelDetails = await getChannelDetails(apiKey, [channelId]);
            if (channelDetails.length === 0) {
                throw new Error("Could not fetch channel details");
            }

            const channel = channelDetails[0];
            const searchQuery = channel.keywords || channel.title || handle;

            // Set channel info for display above results
            const info: ChannelInfo = {
                channelId: channel.channelId,
                title: channel.title,
                description: channel.description,
                customUrl: channel.customUrl || "",
                thumbnailUrl: channel.thumbnails?.high || channel.thumbnails?.medium || "",
                bannerUrl: channel.bannerUrl || "",
                subscriberCount: channel.subscriberCount,
                videoCount: channel.videoCount,
                viewCount: channel.viewCount,
                publishedAt: channel.publishedAt,
                country: channel.country || "",
                keywords: channel.keywords || "",
                email: channel.email || "",
                links: channel.links || [],
            };
            setChannelInfo(info);

            setSuccessMessage(`Getting popular videos from "${channel.title}"...`);

            // Step 3: First, get videos from the INPUT channel (the channel user searched for)
            // Fetch half of the results limit from the input channel
            const inputChannelLimit = Math.ceil(filters.resultsLimit / 2);
            const inputChannelVideos = await getChannelVideos(
                apiKey,
                channelId,
                inputChannelLimit,
                "viewCount",
                filters.publishedAfter
                    ? new Date(filters.publishedAfter).toISOString()
                    : undefined
            );

            // Build analyzed videos from input channel
            const inputVideos = await buildAnalyzedVideos(apiKey, inputChannelVideos, {
                minViews: filters.minViews,
                minSubscribers: filters.minSubscribers,
                videoDuration: filters.videoDuration,
            });

            setSuccessMessage(`Found ${inputVideos.length} videos from "${channel.title}". Finding competitors...`);

            // Step 4: Search for similar/competitor channels using keywords
            const similarChannels = await searchYouTube({
                apiKey,
                query: searchQuery,
                maxResults: 10, // Find up to 10 similar channels
                type: "channel",
                regionCode: filters.region || undefined,
                relevanceLanguage: filters.language || undefined,
            });

            // Filter out the input channel from similar channels
            const competitorChannels = similarChannels.filter(
                (ch) => ch.channelId !== channelId
            );

            // Fetch full details for found competitors to display stats/email
            try {
                const competitorIds = competitorChannels.map((c) => c.channelId);
                if (competitorIds.length > 0) {
                    const competitorDetails = await getChannelDetails(apiKey, competitorIds);

                    const infos: ChannelInfo[] = competitorDetails.map((ch) => ({
                        channelId: ch.channelId,
                        title: ch.title,
                        description: ch.description,
                        customUrl: ch.customUrl || "",
                        thumbnailUrl: ch.thumbnails?.high || ch.thumbnails?.medium || "",
                        bannerUrl: ch.bannerUrl || "",
                        subscriberCount: ch.subscriberCount,
                        videoCount: ch.videoCount,
                        viewCount: ch.viewCount,
                        publishedAt: ch.publishedAt,
                        country: ch.country || "",
                        keywords: ch.keywords || "",
                        email: ch.email || "",
                        links: ch.links || [],
                    }));
                    // Sort by subscribers
                    infos.sort((a, b) => b.subscriberCount - a.subscriberCount);
                    setCompetitorInfos(infos);
                } else {
                    setCompetitorInfos([]);
                }
            } catch (err) {
                console.warn("Failed to fetch competitor details:", err);
            }

            // Step 5: Calculate how many videos to fetch per competitor channel
            // Reserve half the results limit for the input channel
            const remainingLimit = Math.max(10, filters.resultsLimit - inputVideos.length);
            const videosPerChannel = Math.max(3, Math.ceil(remainingLimit / Math.max(1, competitorChannels.length)));

            setSuccessMessage(`Found ${competitorChannels.length} competitor channels. Getting their viral videos...`);

            // Step 6: Get viral videos from each competitor channel
            const allVideos: AnalyzedVideo[] = [...inputVideos];
            const channelNames: string[] = [channel.title]; // Include input channel name

            for (const competitorChannel of competitorChannels) {
                try {
                    const channelVideos = await getChannelVideos(
                        apiKey,
                        competitorChannel.channelId,
                        videosPerChannel,
                        "viewCount", // Sort by most viral
                        filters.publishedAfter
                            ? new Date(filters.publishedAfter).toISOString()
                            : undefined
                    );

                    if (channelVideos.length > 0) {
                        const videos = await buildAnalyzedVideos(apiKey, channelVideos, {
                            minViews: filters.minViews,
                            minSubscribers: filters.minSubscribers,
                            videoDuration: filters.videoDuration,
                        });

                        allVideos.push(...videos);
                        if (videos.length > 0) {
                            channelNames.push(competitorChannel.title);
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to fetch videos from ${competitorChannel.title}:`, err);
                    // Continue with other channels
                }
            }

            if (allVideos.length === 0) {
                throw new Error("No viral videos found matching your filters");
            }

            // Step 7: Sort all videos by views (most viral first) or faceless score
            if (filters.facelessMode) {
                allVideos.sort((a, b) => b.faceless_score - a.faceless_score);
            } else {
                allVideos.sort((a, b) => b.views - a.views);
            }

            // Step 8: Limit results
            const limitedResults = allVideos.slice(0, filters.resultsLimit);

            // Set initial results without transcripts
            setResults(limitedResults);
            setSuccessMessage(
                `Found ${limitedResults.length} viral videos (${inputVideos.length} from "${channel.title}", ${limitedResults.length - inputVideos.length} from ${competitorChannels.length} competitors). Fetching transcripts...`
            );

            // Auto-fetch transcripts in background
            const videosWithTranscripts = await fetchTranscriptsForVideos(limitedResults);
            setResults(videosWithTranscripts);
            setSuccessMessage(
                `Loaded ${limitedResults.length} videos from ${channelNames.length} channels: ${channelNames.slice(0, 3).join(", ")}${channelNames.length > 3 ? ` +${channelNames.length - 3} more` : ""}`
            );
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    Smart Search
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Choose a search mode to discover viral content and competitors
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={searchMode} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger
                            value="keyword"
                            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <Search className="w-4 h-4" />
                            <span className="hidden xs:inline">Keyword</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="video-link"
                            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <Link className="w-4 h-4" />
                            <span className="hidden xs:inline">Video</span>
                            <span className="hidden sm:inline"> Link</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="channel-handle"
                            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                        >
                            <AtSign className="w-4 h-4" />
                            <span className="hidden xs:inline">Channel</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Success Display */}
                    {successMessage && !error && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{successMessage}</span>
                        </div>
                    )}

                    {/* MODE A: Keyword Search */}
                    <TabsContent value="keyword" className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-slate-400">
                                <span className="font-medium text-violet-400">Viral Discovery:</span>{" "}
                                Search for high-performing videos by keyword. Enable Faceless Mode to
                                find automation-friendly content.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Enter keyword (e.g., 'AI tools')"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleKeywordSearch()}
                                    disabled={isLoading}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleKeywordSearch}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                    Search
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MODE B: Video Link */}
                    <TabsContent value="video-link" className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-slate-400">
                                <span className="font-medium text-violet-400">Channel X-Ray:</span>{" "}
                                Paste a video URL to analyze that channel&apos;s top-performing
                                content.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Paste YouTube video URL"
                                    value={videoLinkInput}
                                    onChange={(e) => setVideoLinkInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleVideoLinkSearch()}
                                    disabled={isLoading}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleVideoLinkSearch}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                    Analyze
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MODE C: Channel Handle Search */}
                    <TabsContent value="channel-handle" className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Enter channel handle (e.g. @MKBHD)"
                                    value={channelHandleInput}
                                    onChange={(e) => setChannelHandleInput(e.target.value)}
                                    className="pl-9"
                                    onKeyDown={(e) => e.key === "Enter" && handleChannelHandleSearch()}
                                />
                            </div>
                            <Button onClick={handleChannelHandleSearch} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Hunt Competitors
                                    </>
                                )}
                            </Button>
                        </div>
                        {/* Display Competitor List if available */}
                        <CompetitorList competitors={competitorInfos} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
