import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Platform = "roku" | "tvos" | "androidtv" | "reactnative" | "tizen";

interface GenFile { path: string; contents: string }
interface GenResult { platform: Platform; files: GenFile[]; walkthrough: string[] }

function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

const TIZEN_CONFIG = `<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets"
  xmlns:tizen="http://tizen.org/ns/widgets"
  id="http://{{slug}}.radioplayinc.com/tv" version="1.0.0">
  <tizen:application id="{{slug}}TV.App" package="{{slug}}TV"
    required_version="6.0"/>
  <content src="index.html"/>
  <feature name="http://tizen.org/feature/screen.size.all"/>
  <icon src="icon.png"/>
  <name>{{tenantName}}</name>
  <tizen:profile name="tv"/>
</widget>`;

const TIZEN_INDEX = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>{{tenantName}}</title><style>body{margin:0;background:#000}</style>
</head><body>
<script>
  // Samsung TVs render the existing responsive web app full-screen.
  location.replace("{{appUrl}}/app?tenant={{slug}}&platform=tizen");
<\/script>
</body></html>`;

function rokuResult(v: Record<string, string>): GenResult {
  return {
    platform: "roku",
    files: [{
      path: "FEED_URL.txt",
      contents: `${v.appUrl}/api/public/roku-feed?tenant=${v.slug}`,
    }],
    walkthrough: [
      "Create a free account at developer.roku.com.",
      "Manage My Channels -> Add Channel -> Direct Publisher.",
      `Paste the feed URL from FEED_URL.txt.`,
      "Upload channel poster (540x405) and splash from your brand assets.",
      "Fix any Feed Validator errors, then Submit for certification.",
      "Approval is typically a few business days.",
    ],
  };
}

const RN_APP = `import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />
      <WebView
        source={{ uri: "{{appUrl}}/app?tenant={{slug}}&platform=rn" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={{ backgroundColor: "#000" }}
      />
    </SafeAreaView>
  );
}`;

const RN_PKG = `{
  "name": "{{slug}}-app",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "expo start", "ios": "expo run:ios", "android": "expo run:android" },
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-webview": "13.8.6"
  }
}`;

const TVOS_APP = `import SwiftUI
import AVKit

@main struct {{slugCap}}App: App {
  var body: some Scene {
    WindowGroup { ContentView() }
  }
}

struct ContentView: View {
  let feedURL = URL(string: "{{appUrl}}/api/public/roku-feed?tenant={{slug}}")!
  @State private var titles: [Title] = []
  var body: some View {
    NavigationView {
      ScrollView {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 260))]) {
          ForEach(titles) { t in
            NavigationLink(destination: PlayerView(url: t.url)) {
              AsyncImage(url: URL(string: t.thumbnail))
            }
          }
        }
      }.task { await load() }
    }
  }
  func load() async {
    // Fetches the same Roku-spec feed and maps movies[] -> Title
  }
}`;

const ANDROIDTV_MAIN = `package com.{{slug}}.tv

import android.os.Bundle
import androidx.fragment.app.FragmentActivity

class MainActivity : FragmentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)
    // BrowseSupportFragment loads {{appUrl}}/api/public/roku-feed?tenant={{slug}}
    // ExoPlayer plays the HLS url of the selected card.
  }
}`;

export const generateAppPackages = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string().min(1),
      tenantId: z.string().uuid(),
      platforms: z.array(z.enum([
        "roku", "tvos", "androidtv", "reactnative", "tizen",
      ])).min(1),
    }).parse(d))
  .handler(async ({ data }) => {
    const { data: t } = await supabaseAdmin
      .from("tenants").select("*").eq("id", data.tenantId).maybeSingle();
    if (!t) return { ok: false as const, error: "Tenant not found" };

    const appUrl = process.env.VITE_APP_URL ?? "https://playtv.radioplayinc.com";
    const v = {
      slug: t.slug,
      slugCap: t.slug.charAt(0).toUpperCase() + t.slug.slice(1),
      tenantName: t.name,
      appUrl,
      primary: t.primary_color,
    };

    const results: GenResult[] = [];
    for (const p of data.platforms) {
      if (p === "roku") results.push(rokuResult(v));
      if (p === "tizen") results.push({
        platform: "tizen",
        files: [
          { path: "config.xml", contents: fill(TIZEN_CONFIG, v) },
          { path: "index.html", contents: fill(TIZEN_INDEX, v) },
        ],
        walkthrough: [
          "Install Tizen Studio + the TV extension.",
          "Import this folder as a Tizen Web project.",
          "Build -> create a .wgt package.",
          "Submit the .wgt at seller.samsungapps.com (Samsung TV Seller Office).",
        ],
      });
      if (p === "reactnative") results.push({
        platform: "reactnative",
        files: [
          { path: "App.tsx", contents: fill(RN_APP, v) },
          { path: "package.json", contents: fill(RN_PKG, v) },
        ],
        walkthrough: [
          "npm install, then npx expo prebuild.",
          "iOS: open ios/ in Xcode, set bundle id, Archive -> App Store Connect.",
          "Android: ./gradlew bundleRelease -> upload .aab to Play Console.",
          "Fill store listings; review is ~1-3 days (Apple) / hours (Google).",
        ],
      });
      if (p === "tvos") results.push({
        platform: "tvos",
        files: [{ path: `${v.slugCap}App.swift`, contents: fill(TVOS_APP, v) }],
        walkthrough: [
          "Open in Xcode as a tvOS App target.",
          "Set the team + bundle id, add your App Store icon set.",
          "Archive -> distribute to App Store Connect (tvOS).",
        ],
      });
      if (p === "androidtv") results.push({
        platform: "androidtv",
        files: [{ path: "MainActivity.kt", contents: fill(ANDROIDTV_MAIN, v) }],
        walkthrough: [
          "Open in Android Studio with the Leanback template.",
          "Build a signed .aab.",
          "Play Console -> create an Android TV app -> upload.",
        ],
      });
    }
    return { ok: true as const, results };
  });
