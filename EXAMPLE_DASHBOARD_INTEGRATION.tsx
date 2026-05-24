// Example: Updated Dashboard with Heavy-Duty App Builder
// File: src/routes/_authenticated/dashboard/index.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { AppConverterHeavyDuty } from "@/components/dashboard/AppConverterHeavyDuty";
import { Settings, Play, Palette, Rocket } from "lucide-react";

export default function DashboardPage() {
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tenantData) {
    return <div className="p-8 text-center">No tenant found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{tenantData.name} Dashboard</h1>
        <p className="text-muted-foreground">
          Manage content, branding, and deploy to multiple platforms
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="content" className="flex gap-2">
            <Play className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex gap-2">
            <Rocket className="h-4 w-4" />
            App Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* CONTENT TAB */}
        <TabsContent value="content" className="space-y-6">
          <ContentTab tenantData={tenantData} />
        </TabsContent>

        {/* BRANDING TAB */}
        <TabsContent value="branding" className="space-y-6">
          <BrandingTab tenantData={tenantData} />
        </TabsContent>

        {/* APP BUILDER TAB - HEAVY DUTY */}
        <TabsContent value="apps" className="space-y-6">
          <div className="max-w-6xl mx-auto">
            <AppConverterHeavyDuty tenantId={tenantData.id} />
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <div className="max-w-2xl">
            <div className="rounded-lg border p-8">
              <h2 className="text-xl font-bold mb-4">Tenant Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="font-semibold">Tenant ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{tenantData.id}</p>
                </div>
                <div>
                  <label className="font-semibold">Slug</label>
                  <p className="text-sm text-muted-foreground">{tenantData.slug}</p>
                </div>
                <div>
                  <label className="font-semibold">Primary Color</label>
                  <div className="mt-2">
                    <div
                      className="w-24 h-24 rounded border"
                      style={{ backgroundColor: tenantData.primary_color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
