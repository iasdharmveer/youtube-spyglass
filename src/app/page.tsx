"use client";

import * as React from "react";
import { Sidebar, MobileMenuButton } from "@/components/sidebar";
import { SearchTabs } from "@/components/search-tabs";
import { ResultsTable } from "@/components/results-table";
import { ChannelInfoCard } from "@/components/channel-info-card";
import { useAppStore } from "@/store/app-store";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { isLoading } = useAppStore();

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar when clicking outside on mobile
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          <p className="text-slate-400">Loading YouTube Spyglass...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-grid-pattern">
      {/* Mobile Menu Button */}
      <MobileMenuButton
        isOpen={sidebarOpen}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 overflow-auto min-h-screen">
        {/* Header - adjusted for mobile menu button */}
        <header className="space-y-2 pt-12 lg:pt-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            YouTube{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Spyglass
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            Discover viral content, analyze competitors, and find faceless video opportunities.
          </p>
        </header>

        {/* Search Section */}
        <SearchTabs />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-slate-800/80 rounded-xl border border-slate-700 animate-pulse-glow">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span className="text-sm sm:text-base text-slate-300">Analyzing videos...</span>
            </div>
          </div>
        )}

        {/* Channel Info Card - shown for Video Link and Channel Handle searches */}
        <ChannelInfoCard />

        {/* Results Section */}
        <ResultsTable />

        {/* Footer */}
        <footer className="text-center py-4 text-xs sm:text-sm text-slate-500 border-t border-slate-800">
          <p>
            YouTube Spyglass • Built for content creators • Data powered by YouTube Data API v3
          </p>
        </footer>
      </main>
    </div>
  );
}
