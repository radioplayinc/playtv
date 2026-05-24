import { useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { generateHeavyDutyAppPackages } from "@/api/appgen-heavy-duty.functions";
import { toast } from "sonner";
import {
  Tv,
  Smartphone,
  Apple,
  Monitor,
  Cast,
  Download,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  Code,
  Zap,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlatformInfo {
  id: string;
  label: string;
  icon: any;
  description: string;
  complexity: "easy" | "medium" | "hard";
  buildTime: string;
  requiredAssets: string[];
  features: string[];
  category: "tv" | "mobile" | "hybrid";
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "roku",
    label: "Roku",
    icon: Tv,
    description: "Direct Publisher channel for Roku TVs and devices",
    complexity: "easy",
    buildTime: "10 min",
    requiredAssets: ["Channel Poster (540x405)", "Splash (1280x720)", "Screenshots (720x480)"],
    features: ["Direct Publisher", "Auto-sync", "D-pad navigation", "4K ready"],
    category: "tv",
  },
  {
    id: "tvos",
    label: "Apple TV",
    icon: Apple,
    description: "Native tvOS application for Apple TV 4K",
    complexity: "hard",
    buildTime: "30 min",
    requiredAssets: ["App Icons (1280x768, 400x240)", "Launch Screen (1920x1080)"],
    features: ["Native SwiftUI", "Siri Remote", "AirPlay", "4K/HDR"],
    category: "tv",
  },
  {
    id: "androidtv",
    label: "Android TV",
    icon: Cast,
    description: "Android TV application for smart TVs",
    complexity: "medium",
    buildTime: "25 min",
    requiredAssets: ["App Icon (108x108 dp)", "Banner (1024x500)", "Screenshots (1920x1080)"],
    features: ["Leanback", "D-pad nav", "ExoPlayer", "Fire TV compatible"],
    category: "tv",
  },
  {
    id: "tizen",
    label: "Samsung TV",
    icon: Monitor,
    description: "Samsung Smart TV application using Tizen",
    complexity: "medium",
    buildTime: "20 min",
    requiredAssets: ["App Icon (110x110, 200x200)", "Banner (1920x1080)"],
    features: ["Tizen Web", "Remote keys", "Voice search", "SmartThings"],
    category: "tv",
  },
  {
    id: "reactnative",
    label: "iOS & Android",
    icon: Smartphone,
    description: "Cross-platform mobile app (iOS + Android)",
    complexity: "hard",
    buildTime: "35 min",
    requiredAssets: ["App Icon (1024x1024)", "Splash Screen (1242x2436)"],
    features: ["Cross-platform", "Native perf", "OTA updates", "Push notifs"],
    category: "mobile",
  },
];

export function AppConverterHeavyDuty({ tenantId }: { tenantId: string }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["roku"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [completedResults, setCompletedResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("platforms");

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]
    );
  };

  const selectAll = () => {
    setSelectedPlatforms(PLATFORMS.map((p) => p.id));
  };

  const clearSelection = () => {
    setSelectedPlatforms([]);
  };

  const generate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setCompletedResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress((p) => Math.min(p + 10, 90));
      }, 300);

      const res = await generateHeavyDutyAppPackages({
        data: {
          token: session.access_token,
          tenantId,
          platforms: selectedPlatforms as any,
        },
      });

      clearInterval(progressInterval);

      if (!res.ok) throw new Error(res.error);

      // Create zip with all packages
      const zip = new JSZip();
      for (const r of res.results) {
        const folder = zip.folder(r.platform)!;
        for (const f of r.files) {
          folder.file(f.path, f.contents);
        }

        // Add comprehensive walkthrough
        const walkthrough = [
          `# ${r.platform.toUpperCase()} - Complete Build & Deployment Guide`,
          "",
          "## Overview",
          ...r.walkthrough.map((s, i) => `${i + 1}. ${s}`),
          "",
          "## Features Included",
          ...r.features.map((f) => `- ${f}`),
          "",
          "## Required Assets",
          ...r.requiredAssets.map((a) => `- ${a}`),
          "",
          "## Estimated Time",
          `Build: ${r.estimatedBuildTime}`,
          "",
          "## Support",
          "For issues, contact support@yourcompany.com",
        ].join("\n");

        folder.file("COMPLETE_GUIDE.md", walkthrough);
      }

      // Add master README
      const masterReadme = `# {{tenantName}} - Multi-Platform App Packages

## 📱 What You Have

${selectedPlatforms
  .map((p) => {
    const platform = PLATFORMS.find((x) => x.id === p);
    return `- **${platform?.label}** (${platform?.buildTime}) - ${platform?.description}`;
  })
  .join("\n")}

## 🚀 Quick Start

Each platform folder contains:
1. Complete source code
2. Configuration files
3. Deployment guide
4. Asset requirements checklist

## 📋 Next Steps

1. Navigate to the platform folder you want to deploy
2. Read COMPLETE_GUIDE.md for step-by-step instructions
3. Gather required assets
4. Follow build instructions for your platform
5. Test on device before submission

## 💡 Pro Tips

- Start with the platform you're most familiar with
- Use the asset requirements checklist
- Follow submission guides carefully
- Test on actual hardware before publishing
- Keep submission guidelines documentation for reference

## 📞 Support

For questions about specific platforms:
- Roku: developer.roku.com/docs
- Apple TV: developer.apple.com/tvos
- Android TV: developer.android.com/training/tv
- Samsung TV: developer.samsung.com/tv
- React Native: reactnative.dev

---

Generated: ${new Date().toISOString()}
`;

      zip.file("README.md", masterReadme);

      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `multi-platform-apps-${new Date().getTime()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setGenerationProgress(100);
      setCompletedResults(res.results);
      setActiveTab("results");

      toast.success(`✅ Generated ${selectedPlatforms.length} complete app packages!`);
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
      setGenerationProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const tvPlatforms = PLATFORMS.filter((p) => p.category === "tv");
  const mobilePlatforms = PLATFORMS.filter((p) => p.category === "mobile");
  const selectedCount = selectedPlatforms.length;
  const estimatedTotalTime = selectedPlatforms
    .map((id) => PLATFORMS.find((p) => p.id === id)?.buildTime)
    .filter(Boolean)
    .join(" + ");

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">🎯 Platform Builder</TabsTrigger>
          <TabsTrigger value="preview">📋 Details</TabsTrigger>
          <TabsTrigger value="results" disabled={completedResults.length === 0}>
            ✅ Results
          </TabsTrigger>
        </TabsList>

        {/* PLATFORMS TAB */}
        <TabsContent value="platforms" className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold">🚀 Heavy-Duty App Builder</h2>
            <p className="text-muted-foreground">
              Select platforms and generate production-ready, fully-compliant applications in seconds
            </p>
          </div>

          {/* Selection Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Your Selection Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="text-2xl font-bold text-primary">{selectedCount}</div>
                  <div className="text-sm text-muted-foreground">Platforms Selected</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-4">
                  <div className="text-2xl font-bold text-blue-500">{estimatedTotalTime || "0 min"}</div>
                  <div className="text-sm text-muted-foreground">Total Build Time</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-4">
                  <div className="text-2xl font-bold text-green-500">
                    {selectedPlatforms.filter((p) => PLATFORMS.find((x) => x.id === p)?.complexity === "easy").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Easy Platforms</div>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-4">
                  <div className="text-2xl font-bold text-yellow-500">{selectedPlatforms.length * 5}</div>
                  <div className="text-sm text-muted-foreground">Source Files</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TV Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">📺 TV Platforms</h3>
              <span className="text-xs text-muted-foreground">
                {tvPlatforms.filter((p) => selectedPlatforms.includes(p.id)).length} / {tvPlatforms.length} selected
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {tvPlatforms.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`group rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <h4 className="font-bold">{p.label}</h4>
                          <Badge
                            variant={
                              p.complexity === "easy"
                                ? "default"
                                : p.complexity === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }>
                            {p.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <div
                        className={`mt-1 rounded-full border-2 w-6 h-6 flex items-center justify-center transition-all ${
                          isSelected ? "border-primary bg-primary" : "border-border"
                        }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">📱 Mobile Platforms</h3>
              <span className="text-xs text-muted-foreground">
                {mobilePlatforms.filter((p) => selectedPlatforms.includes(p.id)).length} / {mobilePlatforms.length}
                selected
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mobilePlatforms.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`group rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <h4 className="font-bold">{p.label}</h4>
                          <Badge
                            variant={
                              p.complexity === "easy"
                                ? "default"
                                : p.complexity === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }>
                            {p.complexity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <div
                        className={`mt-1 rounded-full border-2 w-6 h-6 flex items-center justify-center transition-all ${
                          isSelected ? "border-primary bg-primary" : "border-border"
                        }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t pt-6">
            <Button variant="outline" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" onClick={clearSelection}>
              Clear
            </Button>
            <Button
              onClick={generate}
              disabled={isGenerating || selectedCount === 0}
              className="ml-auto gap-2"
              size="lg">
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating ({Math.round(generationProgress)}%)
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate {selectedCount} App{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>

          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Building Your Apps...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={generationProgress} className="h-2" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Analyzing platform requirements</p>
                  <p>✓ Generating source code</p>
                  <p>{generationProgress >= 40 && "✓"} Creating configuration files</p>
                  <p>{generationProgress >= 70 && "✓"} Preparing deployment guides</p>
                  <p>{generationProgress >= 90 && "✓"} Packaging for download</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold">📋 Platform Details</h2>
            <p className="text-muted-foreground">What you get with each platform</p>
          </div>

          <div className="grid gap-4">
            {PLATFORMS.filter((p) => selectedPlatforms.includes(p.id)).map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <p.icon className="h-6 w-6" />
                      <div>
                        <CardTitle>{p.label}</CardTitle>
                        <CardDescription>{p.description}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        p.complexity === "easy"
                          ? "default"
                          : p.complexity === "medium"
                            ? "secondary"
                            : "destructive"
                      }>
                      {p.complexity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4" />
                        Build Time
                      </div>
                      <p className="text-sm text-muted-foreground">{p.buildTime}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <Code className="h-4 w-4" />
                        Source Files
                      </div>
                      <p className="text-sm text-muted-foreground">3-5 complete files</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Zap className="h-4 w-4" />
                      Features
                    </div>
                    <ul className="grid gap-2 text-sm sm:grid-cols-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <FileText className="h-4 w-4" />
                      Required Assets
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {p.requiredAssets.map((a) => (
                        <li key={a}>→ {a}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}

            {selectedPlatforms.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-10">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Select platforms to see details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* RESULTS TAB */}
        <TabsContent value="results" className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold">✅ Generation Complete!</h2>
            <p className="text-muted-foreground">Your app packages are ready for deployment</p>
          </div>

          <div className="grid gap-4">
            {completedResults.map((result) => (
              <Card key={result.platform}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {result.platform.toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="mb-2 font-semibold">📋 Walkthrough Steps:</h4>
                    <ol className="space-y-1 text-sm">
                      {result.walkthrough.slice(0, 5).map((step: string, i: number) => (
                        <li key={i}>
                          {i + 1}. {step}
                        </li>
                      ))}
                      {result.walkthrough.length > 5 && (
                        <li className="text-muted-foreground">+{result.walkthrough.length - 5} more steps...</li>
                      )}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">🎉 Ready to Deploy!</p>
                <p className="text-muted-foreground">
                  All app packages have been generated and downloaded. Each includes complete source code,
                  configuration files, and step-by-step deployment guides.
                </p>
                <p className="text-muted-foreground">Next step: Follow the COMPLETE_GUIDE.md in each platform folder.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
