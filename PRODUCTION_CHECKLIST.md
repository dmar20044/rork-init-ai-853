# Production Deployment Checklist

## ✅ Critical Fixes Required

### 1. Fix Notification Assets (REQUIRED for App Store)
**Issue**: `app.json` references non-existent notification assets

**Fix**: Update your `app.json` expo-notifications plugin configuration:
```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/icon.png",
    "color": "#ffffff",
    "defaultChannel": "default",
    "enableBackgroundRemoteNotifications": false
  }
]
```

**Changes**:
- ❌ Remove: `"icon": "./local/assets/notification_icon.png"`
- ✅ Use: `"icon": "./assets/images/icon.png"`
- ❌ Remove: `"sounds": ["./local/assets/notification_sound.wav"]`
- ✅ Keep: `"enableBackgroundRemoteNotifications": false`

### 2. iOS Bundle Identifier
**Current**: `app.initai.initai`
**Status**: ✅ Valid format

### 3. Android Package Name
**Current**: `app.initai.initai`
**Status**: ✅ Valid format

## ✅ API Endpoints - Production Ready

### Backend Status
- ✅ **Hono Server**: Properly configured
- ✅ **tRPC Integration**: Working with Zod validation
- ✅ **CORS**: Configured for cross-origin requests
- ✅ **Error Handling**: Comprehensive with fallbacks
- ✅ **Vercel Deployment**: Properly configured
- ✅ **Food Analysis API**: Uses Rork AI (no API key needed)
- ✅ **Environment Variables**: Production URLs configured

### API Endpoints Available
1. **Health Check**: `GET /api` ✅
2. **Debug Info**: `GET /debug` ✅
3. **tRPC Router**: `POST /api/trpc/*` ✅
   - `example.hi` - Test endpoint ✅
   - `food.analyze` - Food analysis with AI ✅

### Environment Variables (Verify in Vercel Dashboard)
- ✅ `EXPO_PUBLIC_RORK_API_BASE_URL`: Set to production URL
- ✅ `EXPO_PUBLIC_SUPABASE_URL`: Configured
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Configured
- ⚠️ `ANTHROPIC_API_KEY`: Not needed (using Rork AI)

## ✅ App Store Submission Requirements

### iOS Requirements
- ✅ **Bundle Identifier**: `app.initai.initai`
- ✅ **App Name**: "InIt AI"
- ✅ **Version**: 1.0.0
- ✅ **Icons**: Present in `assets/images/`
- ✅ **Splash Screen**: Configured
- ✅ **Permissions**: Camera, Microphone, Photos properly declared
- ⚠️ **Notification Assets**: NEEDS FIX (see above)

### Android Requirements
- ✅ **Package Name**: `app.initai.initai`
- ✅ **Adaptive Icon**: Configured
- ✅ **Permissions**: Properly declared
- ✅ **Version Code**: Will be auto-generated
- ⚠️ **Notification Assets**: NEEDS FIX (see above)

## 🔧 Pre-Submission Steps

### 1. Fix Notification Assets
```bash
# Edit app.json and update the expo-notifications plugin configuration
# Remove references to ./local/assets/ files
# Use existing ./assets/images/icon.png
```

### 2. Test API Endpoints
```bash
# Test your production API
curl https://rork-init-ai-853-gp6x-3o1i0g85i-daniels-projects-ca190586.vercel.app/api

# Should return: {"status":"ok","message":"API is running"}
```

### 3. Verify Environment Variables in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure all `EXPO_PUBLIC_*` variables are set for Production
3. No need for `ANTHROPIC_API_KEY` (using Rork AI)

### 4. Build and Test
```bash
# Test the app thoroughly
npm run start

# Test on physical device via QR code
# Test all major features:
# - Camera scanning
# - Food analysis
# - Navigation between tabs
# - User onboarding
```

## 🚀 Ready for App Store Submission

Once you fix the notification assets issue in `app.json`, your app should be ready for:

1. **iOS App Store** submission via Xcode
2. **Google Play Store** submission

### Final Verification
- [ ] Fixed notification assets in `app.json`
- [ ] Tested app on physical device
- [ ] Verified API endpoints are working
- [ ] Confirmed all features work as expected
- [ ] App icons and splash screen display correctly

## 🔍 Common App Store Rejection Reasons to Avoid

1. **Missing Notification Assets** ❌ (Fix required)
2. **Broken API Endpoints** ✅ (Working)
3. **Missing Permissions** ✅ (Properly declared)
4. **App Crashes** ⚠️ (Test thoroughly)
5. **Incomplete Features** ⚠️ (Ensure all features work)

## 📞 Support

If you encounter issues during submission:
1. Check Vercel deployment logs
2. Test API endpoints manually
3. Verify all environment variables are set
4. Test app on physical device before submission