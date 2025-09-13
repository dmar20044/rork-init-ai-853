# Backend Deployment Instructions

## The Problem
Your backend is not working in the Rork mobile app because the current backend URL in your `.env` file is either:
1. A preview deployment that has expired
2. Not properly deployed to production
3. Incorrectly configured

## Current Status
- Backend URL: `https://your-app-name.vercel.app` (placeholder)
- This needs to be updated with your actual Vercel deployment URL

## How to Fix

### Step 1: Deploy to Vercel Production
1. Go to [vercel.com](https://vercel.com) and sign in
2. Connect your GitHub repository
3. Deploy your project to get a production URL like `https://your-actual-app-name.vercel.app`

### Step 2: Update Environment Variable
1. Update your `.env` file:
   ```
   EXPO_PUBLIC_RORK_API_BASE_URL=https://your-actual-app-name.vercel.app
   ```
2. Replace `your-actual-app-name` with your real Vercel project name

### Step 3: Test the Connection
1. Go to `/debug` in your app
2. Run "Run All Tests" to check connectivity
3. All tests should pass if the backend is working

## Alternative: Use Local Development
If you want to test locally:
1. Run your backend locally (usually on port 3000)
2. Use ngrok or similar to expose it publicly
3. Update the URL in `.env` to your ngrok URL

## Debugging Tips
- Check the debug screen (`/debug`) for detailed error messages
- Look at the console logs for network errors
- Verify your Vercel deployment is actually running
- Make sure CORS is properly configured (it should be)

## Environment Variables on Vercel
Don't forget to set any required environment variables on Vercel:
- `ANTHROPIC_API_KEY` (if using Anthropic directly)
- Any other backend-specific variables

## Testing
Once deployed, test these endpoints:
- `https://your-app.vercel.app/api` - Should return basic API info
- `https://your-app.vercel.app/api/debug` - Should return debug info
- `https://your-app.vercel.app/api/trpc/example.hi` - tRPC endpoint

The debug screen in your app will test all of these automatically.