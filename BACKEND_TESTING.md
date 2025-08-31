# Backend Testing Guide

## 1. Start the Backend Server

Run this command in your terminal:

```bash
bun run backend/server.ts
```

Or if you prefer Node.js:

```bash
npx tsx backend/server.ts
```

You should see output like:
```
🚀 Backend server starting on port 3000
✅ Backend server running at http://localhost:3000
📡 tRPC endpoint: http://localhost:3000/api/trpc
🏥 Health check: http://localhost:3000/api
```

## 2. Test Backend Connection

### Option A: Use the Test Page
1. Navigate to `/backend-test` in your app
2. Tap "Test Hi Endpoint" to test basic connectivity
3. Tap "Test Food Analysis" to test the AI integration

### Option B: Manual Testing
Open your browser and visit:
- Health check: http://localhost:3000/api
- Should return: `{"status":"ok","message":"API is running"}`

## 3. Update Backend URL for Production

When you deploy your backend to production:

1. Update `.env` file:
```env
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-production-backend-url.com
```

2. Common deployment options:
   - **Vercel**: Deploy the `backend` folder as a serverless function
   - **Railway**: Connect your GitHub repo and deploy
   - **Render**: Deploy as a web service
   - **Heroku**: Deploy using Git

## 4. Environment Variables

Make sure these are set in your production environment:
- `ANTHROPIC_API_KEY`: Your Anthropic API key (keep this secret!)
- `PORT`: The port your server should run on (usually set by hosting provider)

## 5. Troubleshooting

### Connection Refused Error
- Make sure the backend server is running
- Check that the URL in `.env` matches your server

### API Key Errors
- Verify `ANTHROPIC_API_KEY` is set in your environment
- Make sure the API key is valid and has sufficient credits

### CORS Issues
- The backend already includes CORS headers
- If you still have issues, check your hosting provider's settings

## 6. Security Notes

✅ **Good**: API key is only in backend environment
❌ **Bad**: Never put API keys in client code or commit them to git

The current setup keeps your Anthropic API key secure on the backend only.