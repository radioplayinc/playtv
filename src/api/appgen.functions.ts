import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Platform = "roku" | "tvos" | "androidtv" | "firetv" | "reactnative" | "tizen";

interface GenFile { path: string; contents: string }
interface GenResult {
  platform: Platform;
  files: GenFile[];
  walkthrough: string[];
  features: string[];
  estimatedBuildTime: string;
  requiredAssets: string[];
}

function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ─── ROKU ──────────────────────────────────────────────────────────────────

function rokuResult(v: Record<string, string>): GenResult {
  return {
    platform: "roku",
    files: [
      { path: "FEED_URL.txt", contents: `${v.appUrl}/api/public/roku-feed?tenant=${v.slug}` },
      {
        path: "deployment.json",
        contents: JSON.stringify({ name: v.tenantName, feedUrl: `${v.appUrl}/api/public/roku-feed?tenant=${v.slug}`, version: "1.0.0", minFirmwareVersion: "6.0", posterUrl: `${v.appUrl}/img/channel-poster-540x405.png`, splashUrl: `${v.appUrl}/img/splash-1280x720.png` }, null, 2),
      },
      { path: "README.md", contents: `# ${v.tenantName} — Roku Channel\n\n## Quick Start\n1. Sign in at developer.roku.com\n2. My Channels → Add Channel → Direct Publisher\n3. Paste the feed URL from FEED_URL.txt\n4. Upload poster (540×405) and splash (1280×720)\n5. Submit for certification (5-7 business days)\n\n## Required Assets\n- Channel Poster: 540×405 PNG\n- Splash Screen: 1280×720 PNG\n- Screenshots: 720×480 PNG (min 3)\n- App Icon: 290×218 PNG\n` },
    ],
    walkthrough: ["Create a free account at developer.roku.com", "Go to My Channels → Add Channel → Direct Publisher", "Paste the feed URL from FEED_URL.txt", "Upload channel poster (540×405) and splash screen (1280×720)", "Add at least 3 screenshots (720×480)", "Fill in channel name, description, and support URL", "Validate your feed at Roku's Feed Validator tool", "Fix any validation errors before submitting", "Submit for certification review", "Approval typically takes 5-7 business days"],
    features: ["Direct Publisher feed with automatic content sync", "D-pad navigation optimized", "HLS streaming support", "4K / HDR content ready", "Roku voice search integration", "Captions & subtitles support"],
    estimatedBuildTime: "10 minutes",
    requiredAssets: ["Channel Poster (540×405 PNG)", "Splash Screen (1280×720 PNG)", "Screenshots (720×480 PNG, min 3)", "App Icon (290×218 PNG)"],
  };
}

// ─── APPLE TV (tvOS) ────────────────────────────────────────────────────────

const TVOS_SWIFT = `import SwiftUI
import AVKit

@main
struct {{slugCap}}TVApp: App {
  var body: some Scene { WindowGroup { ContentView() } }
}

struct StreamTitle: Identifiable, Codable {
  let id: String; let name: String; let description: String
  let posterUrl: String; let streamUrl: String
}

struct ContentView: View {
  @State private var titles: [StreamTitle] = []
  @State private var isLoading = true

  var body: some View {
    NavigationView {
      ZStack {
        Color.black.ignoresSafeArea()
        if isLoading { ProgressView("Loading…").foregroundColor(.white) }
        else {
          ScrollView {
            VStack(alignment: .leading, spacing: 30) {
              Text("{{tenantName}}")
                .font(.system(size: 36, weight: .bold)).foregroundColor(.white)
                .padding(.horizontal, 48).padding(.top, 24)
              LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 24)], spacing: 24) {
                ForEach(titles) { title in
                  NavigationLink(destination: PlayerView(title: title)) {
                    TitleCard(title: title)
                  }.buttonStyle(CardButtonStyle())
                }
              }.padding(.horizontal, 48)
            }
          }
        }
      }
    }.task { await loadContent() }
  }

  private func loadContent() async {
    guard let url = URL(string: "{{appUrl}}/api/public/roku-feed?tenant={{slug}}") else { isLoading = false; return }
    do { let (_, _) = try await URLSession.shared.data(from: url) } catch {}
    // TODO: parse JSON feed → assign to titles
    isLoading = false
  }
}

struct TitleCard: View {
  let title: StreamTitle
  var body: some View {
    ZStack(alignment: .bottomLeading) {
      AsyncImage(url: URL(string: title.posterUrl)) { phase in
        switch phase {
        case .success(let img): img.resizable().scaledToFill()
        default: Rectangle().foregroundColor(.gray.opacity(0.3))
        }
      }.frame(height: 400).clipped()
      LinearGradient(colors: [.clear, .black.opacity(0.85)], startPoint: .center, endPoint: .bottom)
      VStack(alignment: .leading, spacing: 6) {
        Text(title.name).font(.system(size: 20, weight: .bold)).foregroundColor(.white).lineLimit(2)
        Text(title.description).font(.system(size: 15)).foregroundColor(.white.opacity(0.7)).lineLimit(2)
      }.padding(20)
    }.cornerRadius(14)
  }
}

struct PlayerView: View {
  let title: StreamTitle
  @State private var player: AVPlayer?
  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      if let player = player { VideoPlayer(player: player).ignoresSafeArea().onAppear { player.play() } }
      else { ProgressView().foregroundColor(.white) }
    }
    .onAppear { if let url = URL(string: title.streamUrl) { player = AVPlayer(url: url) } }
    .onDisappear { player?.pause() }
  }
}

struct CardButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.scaleEffect(configuration.isPressed ? 0.97 : 1.0)
      .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
  }
}`;

const TVOS_PODFILE = `platform :tvos, '14.0'
target '{{slugCap}}TV' do
  use_frameworks!
  pod 'SDWebImage', '~> 5.13'
  pod 'Alamofire',  '~> 5.6'
end`;

const TVOS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>{{tenantName}}</string>
  <key>CFBundleIdentifier</key><string>com.{{slug}}.tvos</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>UIRequiredDeviceCapabilities</key><array><string>tvos</string></array>
  <key>NSLocalNetworkUsageDescription</key><string>{{tenantName}} uses local network for streaming.</string>
</dict></plist>`;

function tvosResult(v: Record<string, string>): GenResult {
  return {
    platform: "tvos",
    files: [
      { path: `${v.slugCap}TVApp.swift`, contents: fill(TVOS_SWIFT, v) },
      { path: "Podfile",                contents: fill(TVOS_PODFILE, v) },
      { path: "Info.plist",             contents: fill(TVOS_PLIST, v) },
    ],
    walkthrough: ["Install Xcode from the App Store (macOS required)", "Install CocoaPods: sudo gem install cocoapods", "Run: pod install inside this project folder", "Open the generated .xcworkspace in Xcode", "Set Bundle ID to com.yourcompany.{{slug}}.tvos", "Select your Apple Developer team under Signing", "Add tvOS app icons — layered (1280×768) and small (400×240)", "Build & run on the tvOS Simulator", "Test on a physical Apple TV if available", "Archive: Product → Archive", "Upload via Xcode Organizer to App Store Connect (tvOS tab)", "Complete metadata, screenshots, and rating questionnaire", "Submit for Apple review — typically 1-3 business days"],
    features: ["Full native SwiftUI interface", "Siri Remote gesture navigation", "Focus engine with animated cards", "AVPlayer with native controls", "AirPlay streaming support", "4K / HDR ready"],
    estimatedBuildTime: "30 minutes",
    requiredAssets: ["App Icon Layered (1280×768 PNG)", "App Icon Small (400×240 PNG)", "Launch Screen (1920×1080 PNG)", "Screenshots (1920×1080 PNG, min 3)"],
  };
}

// ─── ANDROID TV / FIRE TV ───────────────────────────────────────────────────

const ANDROIDTV_MAIN_KT = `package com.{{slug}}.tv

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.widget.*

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, MainBrowseFragment()).commitNow()
        }
    }
}

class MainBrowseFragment : BrowseSupportFragment() {
    override fun onViewCreated(view: android.view.View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        title = "{{tenantName}}"; brandColor = 0xFF1a1a1a.toInt()
        isHeadersTransitionOnBackEnabled = true
        val rowsAdapter = ArrayObjectAdapter(ListRowPresenter())
        val featuredAdapter = ArrayObjectAdapter(CardPresenter())
        val allAdapter = ArrayObjectAdapter(CardPresenter())
        rowsAdapter.add(ListRow(HeaderItem(0, "Featured"), featuredAdapter))
        rowsAdapter.add(ListRow(HeaderItem(1, "All Content"), allAdapter))
        adapter = rowsAdapter
        setOnItemViewClickedListener { _, item, _, _ ->
            if (item is ContentItem) startActivity(PlayerActivity.newIntent(requireContext(), item))
        }
        // TODO: fetch from {{appUrl}}/api/public/roku-feed?tenant={{slug}}
    }
}

data class ContentItem(val id: String, val title: String, val description: String, val posterUrl: String, val streamUrl: String)

class CardPresenter : Presenter() {
    override fun onCreateViewHolder(parent: android.view.ViewGroup): ViewHolder =
        ViewHolder(ImageCardView(parent.context).apply { isFocusable = true; isFocusableInTouchMode = true })
    override fun onBindViewHolder(vh: ViewHolder, item: Any) {
        val c = item as ContentItem; val card = vh.view as ImageCardView
        card.titleText = c.title; card.contentText = c.description; card.setMainImageDimensions(313, 176)
    }
    override fun onUnbindViewHolder(vh: ViewHolder) { (vh.view as ImageCardView).mainImage = null }
}

class PlayerActivity : FragmentActivity() {
    companion object {
        fun newIntent(ctx: Context, item: ContentItem): Intent =
            Intent(ctx, PlayerActivity::class.java).putExtra("id", item.id)
    }
    override fun onCreate(s: Bundle?) { super.onCreate(s); setContentView(R.layout.activity_player) }
}`;

const ANDROIDTV_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.{{slug}}.tv">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-feature android:name="android.software.leanback" android:required="true"/>
    <uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
    <application android:banner="@drawable/tv_banner" android:icon="@mipmap/ic_launcher"
        android:label="{{tenantName}}" android:theme="@style/Theme.Leanback">
        <activity android:name=".MainActivity" android:exported="true" android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
                <category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
            </intent-filter>
        </activity>
        <activity android:name=".PlayerActivity" android:screenOrientation="landscape"/>
    </application>
</manifest>`;

const ANDROIDTV_GRADLE = `plugins { id 'com.android.application'; id 'org.jetbrains.kotlin.android' }
android {
    namespace "com.{{slug}}.tv"; compileSdk 34
    defaultConfig { applicationId "com.{{slug}}.tv"; minSdk 21; targetSdk 34; versionCode 1; versionName "1.0.0" }
    buildTypes { release { minifyEnabled true } }
    compileOptions { sourceCompatibility JavaVersion.VERSION_1_8; targetCompatibility JavaVersion.VERSION_1_8 }
    kotlinOptions { jvmTarget = '1.8' }
}
dependencies {
    implementation 'androidx.leanback:leanback:1.0.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.github.bumptech.glide:glide:4.15.1'
    implementation 'com.google.android.exoplayer:exoplayer:2.19.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}`;

function androidtvResult(v: Record<string, string>): GenResult {
  return {
    platform: "androidtv",
    files: [
      { path: "app/src/main/java/com/{{slug}}/tv/MainActivity.kt", contents: fill(ANDROIDTV_MAIN_KT, v) },
      { path: "app/src/main/AndroidManifest.xml",                   contents: fill(ANDROIDTV_MANIFEST, v) },
      { path: "app/build.gradle",                                    contents: fill(ANDROIDTV_GRADLE, v) },
    ],
    walkthrough: ["Download and install Android Studio", "Create a new project using the Android TV / Leanback template", "Copy MainActivity.kt into your project", "Replace AndroidManifest.xml with the provided file", "Update app/build.gradle with the provided dependencies", "Sync Gradle and resolve any issues", "Create assets: TV Banner (1024×500 PNG), Launcher Icon (108×108 dp)", "Build signed AAB: Build → Generate Signed Bundle", "Test on an Android TV Emulator or physical device", "For Fire TV: Register at developer.amazon.com", "Upload APK to Amazon Appstore → Fire TV category", "For Google Play: Upload AAB to Play Console → Android TV", "Complete store listing, screenshots, and rating", "Submit — Amazon ~48 h, Google Play ~2-4 h"],
    features: ["Leanback BrowseSupportFragment", "Kotlin-first architecture", "ExoPlayer HLS streaming", "D-pad + remote navigation", "Fire TV compatible", "Voice search ready", "4K / HDR ready"],
    estimatedBuildTime: "25 minutes",
    requiredAssets: ["TV Banner (1024×500 PNG)", "Launcher Icon (108×108 dp PNG)", "Screenshots (1920×1080 PNG, min 3)"],
  };
}

// ─── SAMSUNG TV (Tizen) ─────────────────────────────────────────────────────

const TIZEN_CONFIG_XML = `<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets"
        id="http://{{slug}}.radioplayinc.com/tv" version="1.0.0">
  <tizen:application id="{{slug}}TV" package="{{slug}}TV" required_version="5.5" type="web"/>
  <content src="index.html"/>
  <feature name="http://tizen.org/feature/screen.size.all"/>
  <icon src="icon.png"/>
  <icon src="icon-110.png" width="110" height="110"/>
  <name>{{tenantName}}</name>
  <tizen:profile name="tv"/>
  <tizen:setting screen-orientation="landscape"/>
</widget>`;

const TIZEN_INDEX_HTML = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"><title>{{tenantName}}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#000;color:#fff;font-family:sans-serif;overflow:hidden;width:1920px;height:1080px}
    .splash{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:32px}
    .brand{font-size:64px;font-weight:700;letter-spacing:-1px}
    .spinner{width:56px;height:56px;border:4px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .status{font-size:18px;color:rgba(255,255,255,.5)}
  </style>
</head><body>
  <div class="splash">
    <div class="brand">{{tenantName}}</div>
    <div class="spinner"></div>
    <p class="status">Loading your content…</p>
  </div>
  <script>
    (function(){
      try{tizen.tvinputdevice.registerKey('Return');tizen.tvinputdevice.registerKey('MediaPlayPause');}catch(_){}
      document.addEventListener('keydown',function(e){
        if(e.keyCode===10009){try{tizen.application.getCurrentApplication().exit();}catch(_){history.back();}}
      });
      setTimeout(function(){window.location.replace('{{appUrl}}/app?tenant={{slug}}&platform=tizen');},800);
    })();
  </script>
</body></html>`;

function tizenResult(v: Record<string, string>): GenResult {
  return {
    platform: "tizen",
    files: [
      { path: "config.xml", contents: fill(TIZEN_CONFIG_XML, v) },
      { path: "index.html", contents: fill(TIZEN_INDEX_HTML, v) },
      { path: "README.md",  contents: `# ${v.tenantName} — Samsung TV\n\n## Setup\n1. Install Tizen Studio from developer.samsung.com\n2. Tools → Package Manager → TV SDK 5.5+\n3. New → Tizen Web Project → Blank\n4. Copy config.xml + index.html into project\n5. Add icon.png (200×200) and icon-110.png (110×110)\n6. Right-click → Build → locate .wgt in build/\n\n## Submission\nGo to seller.smarttv.samsung.com → upload .wgt, add screenshots, submit.\nApproval: 7-14 business days.\n` },
    ],
    walkthrough: ["Download Tizen Studio from developer.samsung.com", "Install the TV SDK extension (Tizen 5.5+)", "Create a new Tizen Web Project (Blank template)", "Copy config.xml and index.html to the project root", "Add icon.png (200×200) and icon-110.png (110×110)", "Right-click the project → Build signed package", "Locate the .wgt file in the build/ output directory", "Test on Samsung TV Emulator or physical TV in Developer Mode", "Go to seller.smarttv.samsung.com → Create app", "Upload the .wgt binary file", "Add banner (1920×1080) and screenshots (1280×720, min 3)", "Fill in description, category, and age rating", "Submit — Samsung approval takes 7-14 business days"],
    features: ["Tizen 5.5+ Web framework", "Full-HD 1920×1080 layout", "Remote key event handling", "Voice search (2021+ models)", "Samsung SmartThings compatible"],
    estimatedBuildTime: "20 minutes",
    requiredAssets: ["App Icon 110×110 PNG", "App Icon 200×200 PNG", "Banner 1920×1080 PNG", "Screenshots 1280×720 PNG (min 3)"],
  };
}

// ─── REACT NATIVE (iOS + Android) ───────────────────────────────────────────

const RN_APP_TSX = `import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;
type ContentItem = { id: string; title: string; posterUrl: string; description: string };

export default function App() {
  const [screen, setScreen] = useState<'home'|'webview'>('home');
  const [loading, setLoading] = useState(true);
  const [items, setItems]   = useState<ContentItem[]>([]);
  const [tab, setTab]       = useState<'home'|'search'|'list'>('home');

  useEffect(() => { fetchContent(); }, []);
  const fetchContent = useCallback(async () => {
    try { const res = await fetch('{{appUrl}}/api/public/roku-feed?tenant={{slug}}'); } catch (e) { console.warn(e); }
    finally { setLoading(false); }
    // TODO: parse feed JSON → setItems(mapped)
  }, []);

  if (screen === 'webview') return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content"/>
      <WebView source={{uri:'{{appUrl}}/app?tenant={{slug}}&platform=rn'}} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} style={{flex:1}}/>
      <TouchableOpacity style={s.backBar} onPress={() => setScreen('home')}><Text style={s.backLabel}>← Back</Text></TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content"/>
      <View style={s.header}>
        <Text style={s.brand}>{{tenantName}}</Text>
        <TouchableOpacity onPress={() => setScreen('webview')}><Text style={s.webBtn}>Web ↗</Text></TouchableOpacity>
      </View>
      {loading
        ? <View style={s.center}><ActivityIndicator size="large" color="#fff"/></View>
        : <FlatList data={items} keyExtractor={i => i.id} numColumns={2}
            columnWrapperStyle={s.row} contentContainerStyle={s.grid}
            ListEmptyComponent={<View style={s.center}><Text style={s.emptyText}>No content yet — add titles in your dashboard.</Text></View>}
            renderItem={({item}) => (
              <TouchableOpacity style={s.card} activeOpacity={0.8}>
                <Image source={{uri:item.posterUrl}} style={s.poster} resizeMode="cover"/>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            )}/>
      }
      <View style={s.nav}>
        {(['home','search','list'] as const).map(t => (
          <TouchableOpacity key={t} style={s.navItem} onPress={() => setTab(t)}>
            <Text style={[s.navLabel, tab===t && s.navActive]}>{t==='home'?'🏠 Home':t==='search'?'🔍 Search':'❤️ My List'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#000'}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14,backgroundColor:'#111'},
  brand:{fontSize:22,fontWeight:'800',color:'#fff',letterSpacing:-0.5}, webBtn:{fontSize:13,color:'#aaa',fontWeight:'600'},
  center:{flex:1,justifyContent:'center',alignItems:'center',padding:24}, emptyText:{color:'#666',textAlign:'center',fontSize:15,lineHeight:22},
  grid:{padding:12}, row:{justifyContent:'space-between',marginBottom:12}, card:{width:CARD_W},
  poster:{width:CARD_W,height:CARD_W*1.5,borderRadius:10,backgroundColor:'#1a1a1a'},
  cardTitle:{color:'#fff',marginTop:8,fontSize:13,fontWeight:'600',lineHeight:18},
  nav:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#333',backgroundColor:'#111',paddingBottom:Platform.OS==='ios'?8:0},
  navItem:{flex:1,paddingVertical:12,alignItems:'center'}, navLabel:{color:'#666',fontSize:12,fontWeight:'600'}, navActive:{color:'#fff'},
  backBar:{backgroundColor:'#111',padding:12,alignItems:'center'}, backLabel:{color:'#fff',fontSize:14},
});`;

const RN_PACKAGE_JSON = `{
  "name": "{{slug}}-app",
  "version": "1.0.0",
  "private": true,
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start", "ios": "expo run:ios", "android": "expo run:android",
    "build:ios": "eas build --platform ios", "build:android": "eas build --platform android",
    "submit:ios": "eas submit --platform ios", "submit:android": "eas submit --platform android"
  },
  "dependencies": { "expo": "~51.0.0", "expo-splash-screen": "~0.26.4", "expo-status-bar": "~1.12.1", "react": "18.2.0", "react-native": "0.74.0", "react-native-webview": "13.8.6" },
  "devDependencies": { "@babel/core": "^7.24.0", "@types/react": "~18.2.0", "typescript": "^5.1.0" }
}`;

const RN_APP_JSON = `{
  "expo": {
    "name": "{{tenantName}}", "slug": "{{slug}}-app", "version": "1.0.0", "scheme": "{{slug}}",
    "platforms": ["ios","android"], "orientation": "portrait", "userInterfaceStyle": "dark",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#000000" },
    "ios": { "supportsTabletMode": true, "bundleIdentifier": "com.{{slug}}.app", "buildNumber": "1", "infoPlist": { "NSLocalNetworkUsageDescription": "{{tenantName}} uses local network for streaming." } },
    "android": { "package": "com.{{slug}}.app", "versionCode": 1, "permissions": ["INTERNET","ACCESS_NETWORK_STATE"] },
    "assetBundlePatterns": ["**/*"]
  }
}`;

function reactnativeResult(v: Record<string, string>): GenResult {
  return {
    platform: "reactnative",
    files: [
      { path: "App.tsx",      contents: fill(RN_APP_TSX, v) },
      { path: "package.json", contents: fill(RN_PACKAGE_JSON, v) },
      { path: "app.json",     contents: fill(RN_APP_JSON, v) },
    ],
    walkthrough: ["Install Node.js 18+ from nodejs.org", "Install Expo & EAS CLI: npm install -g expo-cli eas-cli", "Run: npm install", "Add assets/icon.png (1024×1024) and assets/splash.png (1242×2436)", "Test on iOS Simulator: npm run ios (macOS + Xcode required)", "Test on Android Emulator: npm run android", "Log in to Expo: eas login", "Configure EAS: eas build:configure", "iOS build (Apple Dev account $99/yr required): npm run build:ios", "Submit iOS: npm run submit:ios → App Store Connect", "Android build (Google Play $25 one-time): npm run build:android", "Submit Android: npm run submit:android → Play Console", "Complete store listings, screenshots, and age ratings", "iOS review: 1-3 business days", "Android review: 2-4 hours"],
    features: ["Single codebase — iOS & Android", "Expo managed workflow", "Native FlatList grid with lazy images", "In-app WebView fallback", "Bottom tab navigation", "OTA update ready", "Push notifications ready"],
    estimatedBuildTime: "35 minutes",
    requiredAssets: ["App Icon (1024×1024 PNG, no transparency)", "Splash Screen (1242×2436 PNG)", "iOS screenshots (6.7-inch, min 2)", "Android screenshots (1080×1920 PNG, min 2)"],
  };
}

// ─── MAIN EXPORTED SERVER FUNCTION ─────────────────────────────────────────

export const generateAppPackages = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token:     z.string().min(1),
      tenantId:  z.string().uuid(),
      platforms: z.array(z.enum(["roku", "tvos", "androidtv", "firetv", "reactnative", "tizen"])).min(1),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: t } = await supabaseAdmin
      .from("tenants").select("*").eq("id", data.tenantId).maybeSingle();
    if (!t) return { ok: false as const, error: "Tenant not found" };

    const appUrl = process.env.VITE_APP_URL ?? "https://playtv.radioplayinc.com";
    const v: Record<string, string> = {
      slug:       t.slug,
      slugCap:    t.slug.charAt(0).toUpperCase() + t.slug.slice(1),
      tenantName: t.name,
      appUrl,
      primary:    t.primary_color ?? "#FF0000",
    };

    const platformMap: Record<string, () => GenResult> = {
      roku:        () => rokuResult(v),
      tvos:        () => tvosResult(v),
      androidtv:   () => androidtvResult(v),
      firetv:      () => androidtvResult(v),
      reactnative: () => reactnativeResult(v),
      tizen:       () => tizenResult(v),
    };

    const results: GenResult[] = [];
    for (const p of data.platforms) {
      const gen = platformMap[p];
      if (gen) results.push(gen());
    }

    return { ok: true as const, results };
  });
