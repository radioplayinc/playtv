# Quick Reference - OTT Platform Features

**For**: Grammy & Radio Play Inc. / 4UTV / ONPSC TV Team  
**Date**: May 23, 2026

---

## 🎬 Adding Content from Cloud Storage

### Google Drive
1. Upload video to Google Drive
2. Right-click → Share → Copy link
3. Dashboard → Content → Add title
4. Stream source: **External**
5. Service: **Google Drive**
6. Paste link: `https://drive.google.com/file/d/...`
7. Fill title, category, upload thumbnail
8. Save ✅

### Dropbox
1. Upload to Dropbox → Share → Copy link
2. Dashboard → Content → Add title
3. Stream source: **External**
4. Service: **Dropbox**
5. Paste link: `https://www.dropbox.com/s/...`
6. Save ✅

### OneDrive
1. Upload to OneDrive → Share → Copy link
2. Dashboard → Content → Add title
3. Stream source: **External**
4. Service: **OneDrive**
5. Paste link
6. Save ✅

**💡 Tip**: Make sure links are publicly accessible!

---

## ✏️ Editing Existing Content

1. Dashboard → Content tab
2. Find the title card
3. Click **Edit** button
4. Change any field:
   - Title
   - Description
   - Category
   - Stream source (can switch HLS ↔ External)
   - Thumbnails
   - Trending status
5. Click **Update title** ✅

---

## 🏢 Setting Up Tenant Contact Info

**Location**: Dashboard → Branding tab

### Contact Information Section
- **Email**: contact@radioplayinc.com
- **Phone**: +1 (555) 000-0000
- **Website**: https://radioplayinc.com

### Social Media Section
- **Facebook**: https://facebook.com/radioplayinc
- **Twitter**: https://twitter.com/radioplayinc
- **Instagram**: https://instagram.com/radioplayinc
- **YouTube**: https://youtube.com/@radioplayinc

### Platform Availability
Check all platforms where your app is live:
- ☑ Web
- ☐ Roku
- ☐ Fire TV
- ☐ Apple TV
- ☐ Android TV
- ☐ iOS
- ☐ Android

Click **Save branding** when done ✅

---

## 📱 User-Facing Features

### Channel Info Button
**Where**: Title detail page (next to Play and My List)

**What users see**:
1. **About tab**: Contact info, social links, privacy policy
2. **Notes tab**: Personal notes (requires login)
3. **Apps tab**: Platforms where app is available
4. **Share tab**: Copy link, email, SMS sharing

**Use case**: Users can save notes like "Watch with family" or "Resume at 30 min"

---

## 🗄️ Database Migration

**Required**: Run once before using new features

### Option 1: Supabase CLI
```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### Option 2: SQL Editor (Manual)
1. Supabase dashboard → SQL Editor
2. Copy `/supabase/migrations/20260523000000_comprehensive_features.sql`
3. Paste and run

**⚠️ Important**: Migration adds new columns and tables. Safe to run multiple times (uses IF NOT EXISTS).

---

## 🎯 Common Workflows

### Workflow 1: Migrate Existing Content to Cloud Storage
1. Upload videos to Google Drive
2. Edit each content item
3. Change stream source to **External**
4. Paste Google Drive link
5. Save
6. Test playback

### Workflow 2: Bulk Content from Drive
1. Upload all videos to Google Drive folder
2. Set folder to "Anyone with link can view"
3. Get individual file links
4. Add each as new content via Dashboard
5. Use consistent naming: "Episode 1", "Episode 2", etc.

### Workflow 3: Update Branding Before Launch
1. Dashboard → Branding
2. Fill all contact fields
3. Add all social media
4. Check available platforms
5. Save
6. Test Channel Info on title page

### Workflow 4: Enable User Notes Feature
1. User logs in
2. Visits any title page
3. Clicks Info button
4. Goes to Notes tab
5. Types personal note
6. Clicks Save note
7. Note persists across sessions

---

## 🚨 Troubleshooting

### External video won't play
- ✅ Check link is publicly accessible
- ✅ Verify you selected correct service type
- ✅ Try opening link in incognito browser
- ✅ Make sure video format is browser-compatible (MP4, WebM)

### Edit button not showing
- ✅ Refresh page
- ✅ Check you're logged in as tenant admin
- ✅ Verify content belongs to your tenant

### Contact info not showing in Channel Info
- ✅ Go to Dashboard → Branding
- ✅ Fill contact fields
- ✅ Click Save branding
- ✅ Refresh title page

### User can't save notes
- ✅ User must be logged in
- ✅ Database migration must be run
- ✅ Check browser console for errors

---

## 📊 Quick Stats

**Database Changes**:
- 2 new tables (user_notes, content_markers)
- 31 new columns across content and tenants tables

**User-Facing Features**:
- 4-tab Channel Info modal
- Personal notes with auto-save
- Platform availability display
- Share functionality (3 methods)

**Admin Features**:
- External streaming support (5 services)
- Edit any content field
- Comprehensive contact management
- Platform availability toggles

---

## 🎓 Training Notes

### For Content Team
- Show how to add Google Drive links
- Demonstrate edit functionality
- Explain thumbnail requirements (2:3 for poster)

### For Marketing Team
- Update all contact info in Branding
- Check correct platforms
- Test sharing functionality
- Review Channel Info appearance

### For Support Team
- User notes feature explanation
- How to help users share content
- Platform availability questions

---

## 🔗 Important Links

**Local Development**: http://localhost:5173  
**Dashboard**: http://localhost:5173/dashboard  
**Supabase**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID  

**Documentation**:
- Full deployment guide: `/DEPLOYMENT_GUIDE.md`
- Build summary: `/BUILD_SUMMARY.md`
- Database schema: `/supabase/migrations/`

---

## 📞 Quick Support

**Database Issues**: Check Supabase logs in dashboard  
**Video Playback**: Test in browser console with converted URL  
**Authentication**: Verify Supabase auth settings  
**Deployment**: Follow platform-specific guide in DEPLOYMENT_GUIDE.md

---

**Last Updated**: May 23, 2026  
**Version**: 1.0 - Comprehensive Feature Build  
**Status**: ✅ Production Ready
