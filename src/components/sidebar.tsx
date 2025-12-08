"use client";

import * as React from "react";
import {
    Key,
    Search,
    Globe,
    Languages,
    Zap,
    Users,
    Eye,
    Hash,
    Calendar,
    Menu,
    X,
    RotateCcw,
    Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import type { Region, Language } from "@/types/video";
import { cn } from "@/lib/utils";

// Comprehensive regions list with flags
const REGIONS: { value: Region | ""; label: string; group: string }[] = [
    // Global
    { value: "", label: "🌍 Global (All)", group: "Global" },

    // Americas
    { value: "US", label: "🇺🇸 United States", group: "Americas" },
    { value: "CA", label: "🇨🇦 Canada", group: "Americas" },
    { value: "MX", label: "🇲🇽 Mexico", group: "Americas" },
    { value: "BR", label: "🇧🇷 Brazil", group: "Americas" },
    { value: "AR", label: "🇦🇷 Argentina", group: "Americas" },
    { value: "CO", label: "🇨🇴 Colombia", group: "Americas" },
    { value: "CL", label: "🇨🇱 Chile", group: "Americas" },

    // Europe
    { value: "GB", label: "🇬🇧 United Kingdom", group: "Europe" },
    { value: "DE", label: "🇩🇪 Germany", group: "Europe" },
    { value: "FR", label: "🇫🇷 France", group: "Europe" },
    { value: "ES", label: "🇪🇸 Spain", group: "Europe" },
    { value: "IT", label: "🇮🇹 Italy", group: "Europe" },
    { value: "NL", label: "🇳🇱 Netherlands", group: "Europe" },
    { value: "PL", label: "🇵🇱 Poland", group: "Europe" },
    { value: "RU", label: "🇷🇺 Russia", group: "Europe" },
    { value: "TR", label: "🇹🇷 Turkey", group: "Europe" },

    // Asia Pacific
    { value: "IN", label: "🇮🇳 India", group: "Asia" },
    { value: "JP", label: "🇯🇵 Japan", group: "Asia" },
    { value: "KR", label: "🇰🇷 South Korea", group: "Asia" },
    { value: "ID", label: "🇮🇩 Indonesia", group: "Asia" },
    { value: "PH", label: "🇵🇭 Philippines", group: "Asia" },
    { value: "TH", label: "🇹🇭 Thailand", group: "Asia" },
    { value: "VN", label: "🇻🇳 Vietnam", group: "Asia" },
    { value: "MY", label: "🇲🇾 Malaysia", group: "Asia" },
    { value: "SG", label: "🇸🇬 Singapore", group: "Asia" },
    { value: "PK", label: "🇵🇰 Pakistan", group: "Asia" },
    { value: "BD", label: "🇧🇩 Bangladesh", group: "Asia" },
    { value: "AU", label: "🇦🇺 Australia", group: "Asia" },

    // Middle East & Africa
    { value: "SA", label: "🇸🇦 Saudi Arabia", group: "MENA" },
    { value: "AE", label: "🇦🇪 UAE", group: "MENA" },
    { value: "EG", label: "🇪🇬 Egypt", group: "MENA" },
    { value: "NG", label: "🇳🇬 Nigeria", group: "MENA" },
    { value: "ZA", label: "🇿🇦 South Africa", group: "MENA" },
];

// Comprehensive languages list
const LANGUAGES: { value: Language | ""; label: string; group: string }[] = [
    // Any
    { value: "", label: "🌐 Any Language", group: "All" },

    // Major Global Languages
    { value: "en", label: "🇺🇸 English", group: "Global" },
    { value: "es", label: "🇪🇸 Español (Spanish)", group: "Global" },
    { value: "pt", label: "🇧🇷 Português (Portuguese)", group: "Global" },
    { value: "fr", label: "🇫🇷 Français (French)", group: "Global" },
    { value: "de", label: "🇩🇪 Deutsch (German)", group: "Global" },
    { value: "it", label: "🇮🇹 Italiano (Italian)", group: "Global" },
    { value: "ru", label: "🇷🇺 Русский (Russian)", group: "Global" },
    { value: "ar", label: "🇸🇦 العربية (Arabic)", group: "Global" },
    { value: "zh", label: "🇨🇳 中文 (Chinese)", group: "Global" },
    { value: "ja", label: "🇯🇵 日本語 (Japanese)", group: "Global" },
    { value: "ko", label: "🇰🇷 한국어 (Korean)", group: "Global" },

    // Indian Languages
    { value: "hi", label: "🇮🇳 हिंदी (Hindi)", group: "Indian" },
    { value: "bn", label: "🇮🇳 বাংলা (Bengali)", group: "Indian" },
    { value: "ta", label: "🇮🇳 தமிழ் (Tamil)", group: "Indian" },
    { value: "te", label: "🇮🇳 తెలుగు (Telugu)", group: "Indian" },
    { value: "mr", label: "🇮🇳 मराठी (Marathi)", group: "Indian" },
    { value: "gu", label: "🇮🇳 ગુજરાતી (Gujarati)", group: "Indian" },
    { value: "kn", label: "🇮🇳 ಕನ್ನಡ (Kannada)", group: "Indian" },
    { value: "ml", label: "🇮🇳 മലയാളം (Malayalam)", group: "Indian" },
    { value: "pa", label: "🇮🇳 ਪੰਜਾਬੀ (Punjabi)", group: "Indian" },
    { value: "ur", label: "🇵🇰 اردو (Urdu)", group: "Indian" },

    // Southeast Asian
    { value: "id", label: "🇮🇩 Bahasa Indonesia", group: "SEA" },
    { value: "ms", label: "🇲🇾 Bahasa Melayu", group: "SEA" },
    { value: "tl", label: "🇵🇭 Filipino/Tagalog", group: "SEA" },
    { value: "th", label: "🇹🇭 ไทย (Thai)", group: "SEA" },
    { value: "vi", label: "🇻🇳 Tiếng Việt (Vietnamese)", group: "SEA" },

    // European
    { value: "nl", label: "🇳🇱 Nederlands (Dutch)", group: "European" },
    { value: "pl", label: "🇵🇱 Polski (Polish)", group: "European" },
    { value: "uk", label: "🇺🇦 Українська (Ukrainian)", group: "European" },
    { value: "tr", label: "🇹🇷 Türkçe (Turkish)", group: "European" },
    { value: "fa", label: "🇮🇷 فارسی (Persian)", group: "European" },
];

// Slider presets for quick selection
const SUBSCRIBER_PRESETS = [
    { label: "Any", value: 0 },
    { label: "100+", value: 100 },
    { label: "1K+", value: 1000 },
    { label: "10K+", value: 10000 },
    { label: "100K+", value: 100000 },
    { label: "1M+", value: 1000000 },
];

const VIEW_PRESETS = [
    { label: "Any", value: 0 },
    { label: "100+", value: 100 },
    { label: "1K+", value: 1000 },
    { label: "10K+", value: 10000 },
    { label: "100K+", value: 100000 },
    { label: "1M+", value: 1000000 },
];

function formatNumber(num: number): string {
    if (num === 0) return "Any";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
}

// Convert slider value (0-100) to actual value using logarithmic scale
function sliderToValue(sliderValue: number, max: number): number {
    if (sliderValue === 0) return 0;
    // Logarithmic scale: slider 0-100 maps to 0-max
    const logMax = Math.log10(max);
    const result = Math.pow(10, (sliderValue / 100) * logMax);
    // Round to nice numbers
    if (result < 100) return Math.round(result / 10) * 10;
    if (result < 1000) return Math.round(result / 100) * 100;
    if (result < 10000) return Math.round(result / 1000) * 1000;
    if (result < 100000) return Math.round(result / 10000) * 10000;
    return Math.round(result / 100000) * 100000;
}

// Convert actual value to slider value (0-100)
function valueToSlider(value: number, max: number): number {
    if (value === 0) return 0;
    const logMax = Math.log10(max);
    const logValue = Math.log10(Math.max(1, value));
    return Math.min(100, (logValue / logMax) * 100);
}

// Mobile menu button component
export function MobileMenuButton({
    isOpen,
    onClick,
}: {
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            variant="outline"
            size="icon"
            onClick={onClick}
            className="fixed top-4 left-4 z-50 lg:hidden"
            aria-label={isOpen ? "Close menu" : "Open menu"}
        >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
    );
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const { apiKey, setApiKey, filters, setFilters } = useAppStore();
    const [tempApiKey, setTempApiKey] = React.useState(apiKey);
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const handleSaveApiKey = () => {
        setApiKey(tempApiKey);
        setDialogOpen(false);
    };

    const handleResetFilters = () => {
        setFilters({
            region: "",
            language: "",
            facelessMode: false,
            minSubscribers: 0,
            minViews: 0,
            resultsLimit: 25,
            publishedAfter: null,
            videoDuration: "all",
        });
    };

    // Slider values (0-100 scale for logarithmic mapping)
    const subscriberSlider = valueToSlider(filters.minSubscribers, 10000000);
    const viewsSlider = valueToSlider(filters.minViews, 100000000);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    // Base styles (mobile-first)
                    "fixed lg:sticky top-0 left-0 z-50 lg:z-auto",
                    "w-80 h-screen lg:h-auto lg:min-h-screen",
                    "bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-xl",
                    "border-r border-slate-700/50",
                    "p-5 flex flex-col gap-4",
                    "transform transition-transform duration-300 ease-in-out",
                    "overflow-y-auto",
                    // Mobile: slide in/out
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Search className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">YouTube Spyglass</h1>
                        <p className="text-xs text-slate-400">Competitor Analysis</p>
                    </div>
                    {/* Close button for mobile */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* API Key Configuration */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant={apiKey ? "outline" : "default"}
                            className="w-full justify-start"
                        >
                            <Key className="w-4 h-4" />
                            <span className="truncate">
                                {apiKey ? "API Key Configured ✓" : "Configure API Key"}
                            </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>YouTube Data API Key</DialogTitle>
                            <DialogDescription>
                                Enter your YouTube Data API v3 key. It will be stored locally in
                                your browser.
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            type="password"
                            placeholder="AIzaSy..."
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                        />
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveApiKey} className="w-full sm:w-auto">
                                Save Key
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Filters Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        Filters
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs text-slate-400 hover:text-white h-7 px-2"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                </div>

                {/* Filters */}
                <div className="space-y-4 flex-1">
                    {/* Region */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Region
                        </label>
                        <Select
                            value={filters.region || "global"}
                            onValueChange={(value) =>
                                setFilters({ region: (value === "global" ? "" : value) as Region })
                            }
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {REGIONS.map((region) => (
                                    <SelectItem
                                        key={region.value || "global"}
                                        value={region.value || "global"}
                                    >
                                        {region.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Language */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Languages className="w-4 h-4" />
                            Language
                        </label>
                        <Select
                            value={filters.language || "any"}
                            onValueChange={(value) =>
                                setFilters({ language: (value === "any" ? "" : value) as Language })
                            }
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {LANGUAGES.map((lang) => (
                                    <SelectItem
                                        key={lang.value || "any"}
                                        value={lang.value || "any"}
                                    >
                                        {lang.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Faceless Mode */}
                    <div className="flex items-center justify-between py-1">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            Faceless Mode
                        </label>
                        <Switch
                            checked={filters.facelessMode}
                            onCheckedChange={(checked) => setFilters({ facelessMode: checked })}
                        />
                    </div>

                    {/* Min Subscribers - Logarithmic slider */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Min Subscribers
                            </span>
                            <span className="text-violet-400 font-medium text-xs">
                                {formatNumber(filters.minSubscribers)}
                            </span>
                        </label>
                        <Slider
                            value={[subscriberSlider]}
                            onValueChange={([value]) =>
                                setFilters({ minSubscribers: sliderToValue(value, 10000000) })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-1">
                            {SUBSCRIBER_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setFilters({ minSubscribers: preset.value })}
                                    className={cn(
                                        "px-2 py-0.5 text-xs rounded-md transition-colors",
                                        filters.minSubscribers === preset.value
                                            ? "bg-violet-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Min Views - Logarithmic slider */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Min Views
                            </span>
                            <span className="text-violet-400 font-medium text-xs">
                                {formatNumber(filters.minViews)}
                            </span>
                        </label>
                        <Slider
                            value={[viewsSlider]}
                            onValueChange={([value]) =>
                                setFilters({ minViews: sliderToValue(value, 100000000) })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-1">
                            {VIEW_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setFilters({ minViews: preset.value })}
                                    className={cn(
                                        "px-2 py-0.5 text-xs rounded-md transition-colors",
                                        filters.minViews === preset.value
                                            ? "bg-violet-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Video Duration */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Video Type
                        </label>
                        <Select
                            value={filters.videoDuration || "all"}
                            onValueChange={(value) =>
                                setFilters({ videoDuration: value as "all" | "short" | "long" })
                            }
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Videos</SelectItem>
                                <SelectItem value="short">Shorts (&lt; 60s)</SelectItem>
                                <SelectItem value="long">Long Form (&gt; 60s)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Results Limit */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                Results Limit
                            </span>
                            <span className="text-violet-400 font-medium text-xs">
                                {filters.resultsLimit}
                            </span>
                        </label>
                        <Slider
                            value={[filters.resultsLimit]}
                            onValueChange={([value]) => setFilters({ resultsLimit: value })}
                            min={5}
                            max={50}
                            step={5}
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>5</span>
                            <span>25</span>
                            <span>50</span>
                        </div>
                    </div>

                    {/* Published After */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Published After
                        </label>
                        <Input
                            type="date"
                            value={filters.publishedAfter || ""}
                            onChange={(e) =>
                                setFilters({ publishedAfter: e.target.value || null })
                            }
                            className="h-9"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 text-center">
                        BYOK Security • Data stored locally
                    </p>
                </div>
            </aside>
        </>
    );
}
