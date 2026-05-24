# OTT Platform Deployment Guide

Complete guide for deploying your streaming platform to all major platforms.

---

## 📋 Table of Contents

1. [Web Deployment (Vercel/Netlify)](#web-deployment)
2. [Roku Deployment](#roku-deployment)
3. [Fire TV Deployment](#fire-tv-deployment)
4. [Apple TV Deployment](#apple-tv-deployment)
5. [Android TV Deployment](#android-tv-deployment)
6. [iOS Deployment](#ios-deployment)
7. [Android Mobile Deployment](#android-mobile-deployment)
8. [Database Setup (Supabase)](#database-setup)

---

## 🌐 Web Deployment

### Prerequisites
- Supabase project created
- Environment variables configured

### Option 1: Deploy to Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Build your project**
```bash
npm run build
```

3. **Deploy**
```bash
vercel --prod
```

4. **Set environment variables in Vercel dashboard**
- `VITE_APP_URL` - Your production URL
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- `MUX_TOKEN_ID` - (Optional) Mux token ID for video uploads
- `MUX_TOKEN_SECRET` - (Optional) Mux token secret

### Option 2: Deploy to Netlify

1. **Build your project**
```bash
npm run build
```

2. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

3. **Deploy**
```bash
netlify deploy --prod --dir=dist
```

4. **Set environment variables in Netlify dashboard**
(Same as Vercel environment variables above)

---

## 📺 Roku Deployment

### Prerequisites
- Roku Developer Account ([developer.roku.com](https://developer.roku.com))
- Roku device for testing
- BrightScript knowledge (optional, for customization)

### Steps

1. **Enable Developer Mode on Roku Device**
   - Press: Home 3x, Up 2x, Right, Left, Right, Left, Right
   - Set development password

2. **Package Your Channel**
   - Your content feeds should be accessible via HTTPS URLs
   - Create a Direct Publisher feed (JSON format)
   - Example feed structure:
   ```json
   {
     "providerName": "Your Channel Name",
     "lastUpdated": "2026-05-23T00:00:00Z",
     "language": "en",
     "categories": [
       {
         "name": "Featured",
         "playlistName": "featured-playlist",
         "order": "manual",
         "query": "featured"
       }
     ],
     "playlists": [
       {
         "name": "featured-playlist",
         "itemIds": ["video1", "video2"]
       }
     ],
     "videos": [
       {
         "id": "video1",
         "title": "Video Title",
         "content": {
           "duration": 3600,
           "videos": [
             {
               "url": "https://your-cdn.com/video.m3u8",
               "quality": "FHD",
               "videoType": "HLS"
             }
           ]
         },
         "thumbnail": "https://your-cdn.com/thumbnail.jpg"
       }
     ]
   }
   ```

3. **Create Channel in Roku Developer Dashboard**
   - Log in to developer.roku.com
   - Create new Direct Publisher channel
   - Upload channel graphics (icons, splash screens)
   - Add your JSON feed URL

4. **Sideload for Testing**
   - Access Roku device at `http://ROKU_IP:8080`
   - Upload channel package (.zip)
   - Test thoroughly

5. **Submit for Certification**
   - Complete channel information
   - Submit for review
   - Roku review typically takes 1-2 weeks

### Required Graphics
- Channel poster (540x405px)
- Channel icon (290x218px)
- Splash screen HD (1280x720px)
- Splash screen FHD (1920x1080px)

---

## 🔥 Fire TV Deployment

### Prerequisites
- Amazon Developer Account
- Android Studio installed
- Fire TV device for testing

### Steps

1. **Build Android APK**
   
   You'll need to create a React Native or Flutter app wrapper around your web content, OR use a WebView-based approach:

   **Option A: WebView Wrapper (Simpler)**
   ```java
   // MainActivity.java
   WebView webView = new WebView(this);
   webView.getSettings().setJavaScriptEnabled(true);
   webView.loadUrl("https://your-web-app.com");
   setContentView(webView);
   ```

   **Option B: Native App**
   - Use React Native for Fire TV
   - Follow Amazon's Fire TV guidelines
   - Implement proper TV navigation (D-pad support)

2. **Configure for Fire TV**
   - Add Fire TV launcher intent filters to AndroidManifest.xml:
   ```xml
   <intent-filter>
     <action android:name="android.intent.action.MAIN" />
     <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
   </intent-filter>
   ```

3. **Test on Fire TV Device**
   - Enable ADB debugging on Fire TV
   - Connect via ADB: `adb connect FIRE_TV_IP:5555`
   - Install APK: `adb install app-release.apk`

4. **Submit to Amazon Appstore**
   - Log in to Amazon Developer Console
   - Create new app
   - Upload APK
   - Fill in app details (description, screenshots, privacy policy)
   - Submit for review

### Required Assets
- App icon (512x512px)
- Screenshots (1920x1080px, at least 3)
- Banner image (1920x720px)
- Privacy policy URL

---

## 🍎 Apple TV Deployment

### Prerequisites
- Apple Developer Program membership ($99/year)
- macOS with Xcode installed
- Apple TV device for testing

### Steps

1. **Create tvOS App**

   **Option A: Web Wrapper**
   - Create new tvOS app in Xcode
   - Add WKWebView to load your web app
   - Implement focus engine for TV navigation

   **Option B: Native Swift/SwiftUI**
   - Use AVPlayer for video playback
   - Implement TV interface with proper focus management
   - Use URLSession to fetch content from your API

2. **Configure App**
   - Bundle ID: `com.yourcompany.appname`
   - Signing: Use your Apple Developer certificate
   - Capabilities: Background modes (audio) if needed

3. **Test on Apple TV**
   - Connect Apple TV to Xcode via Wi-Fi or USB-C
   - Run app on device
   - Test with Siri Remote

4. **Submit to App Store**
   - Create app in App Store Connect
   - Upload build via Xcode
   - Fill metadata (description, screenshots, privacy policy)
   - Submit for review
   - Apple review typically takes 1-7 days

### Required Assets
- App icon (1280x768px, layered)
- Top Shelf Image (2320x720px)
- Screenshots (1920x1080px, at least 3)

---

## 📱 Android TV Deployment

### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Android Studio
- Android TV device for testing

### Steps

1. **Build Android TV APK**
   - Same process as Fire TV, but optimize for Google Play
   - Add TV banner in AndroidManifest.xml:
   ```xml
   <application
     android:banner="@drawable/banner">
     ...
   </application>
   ```

2. **Configure for Android TV**
   - Ensure `uses-feature` declares TV support:
   ```xml
   <uses-feature
     android:name="android.software.leanback"
     android:required="true" />
   <uses-feature
     android:name="android.hardware.touchscreen"
     android:required="false" />
   ```

3. **Test on Android TV**
   - Use Android emulator or physical device
   - Test D-pad navigation thoroughly

4. **Submit to Google Play**
   - Create app in Google Play Console
   - Upload APK or Android App Bundle (.aab)
   - Fill in store listing
   - Submit for review

### Required Assets
- App icon (512x512px)
- Feature graphic (1024x500px)
- TV banner (1280x720px)
- Screenshots (1920x1080px, at least 2)

---

## 📱 iOS Deployment

### Prerequisites
- Apple Developer Program membership
- macOS with Xcode
- iPhone/iPad for testing

### Steps

1. **Create iOS App**
   - Similar to Apple TV but for iOS target
   - Use UIKit or SwiftUI
   - Implement mobile-optimized UI

2. **Configure App**
   - Set deployment target (iOS 14.0+)
   - Configure signing
   - Add required privacy descriptions in Info.plist

3. **Test on iPhone/iPad**
   - Run on physical device
   - Test all screen sizes
   - Verify video playback

4. **Submit to App Store**
   - Upload to App Store Connect
   - Fill metadata
   - Submit for review

### Required Assets
- App icon (1024x1024px)
- Screenshots for each device size
- Privacy policy URL

---

## 🤖 Android Mobile Deployment

### Prerequisites
- Google Play Developer Account
- Android Studio

### Steps

1. **Build Android APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Sign APK**
   - Generate keystore: `keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000`
   - Sign APK with jarsigner or via Gradle

3. **Test on Android Device**
   ```bash
   adb install app-release.apk
   ```

4. **Submit to Google Play**
   - Upload to Google Play Console
   - Fill store listing
   - Submit for review

---

## 🗄️ Database Setup (Supabase)

### Steps

1. **Create Supabase Project**
   - Sign up at [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref YOUR_PROJECT_ID

   # Push migrations
   supabase db push
   ```

3. **Configure Authentication**
   - Enable Email/Password auth in Supabase dashboard
   - Configure email templates (optional)
   - Set up OAuth providers (optional)

4. **Set Up Storage**
   - Buckets are created automatically by migrations
   - Verify RLS policies are active

5. **Update Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in Supabase credentials

---

## 🚀 Quick Start Checklist

### Before Platform Deployment

- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] Test all features locally
- [ ] Create privacy policy page
- [ ] Create terms of service page
- [ ] Prepare app icons and screenshots
- [ ] Set up analytics (optional)

### For Each Platform

- [ ] Create developer account
- [ ] Prepare required assets
- [ ] Build platform-specific app
- [ ] Test on physical device
- [ ] Fill metadata and descriptions
- [ ] Submit for review
- [ ] Monitor review status

---

## 📞 Support

For platform-specific issues:
- **Roku**: [developer.roku.com/support](https://developer.roku.com/support)
- **Amazon Fire TV**: [developer.amazon.com/support](https://developer.amazon.com/support)
- **Apple**: [developer.apple.com/support](https://developer.apple.com/support)
- **Google Play**: [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)

---

## 📝 Notes

- **Review Times**: Apple (1-7 days), Google Play (1-3 days), Roku (1-2 weeks), Amazon (3-7 days)
- **Fees**: Apple/Google require developer accounts ($99/year and $25 one-time respectively)
- **Updates**: All platforms allow updates, but require re-review
- **Analytics**: Integrate Firebase, Mixpanel, or platform-specific analytics
- **Monetization**: Consider subscription integration (Stripe, RevenueCat) across platforms

---

**Last Updated**: May 23, 2026
