import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL in your .env file"
    );
  }
  
  if (baseUrl.includes('your-app-name')) {
    throw new Error(
      "Please update EXPO_PUBLIC_RORK_API_BASE_URL with your actual Vercel deployment URL"
    );
  }
  
  console.log('Using backend URL:', baseUrl);
  return baseUrl;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        console.log('🔄 tRPC request to:', url);
        console.log('📋 Request details:', {
          method: options?.method,
          headers: options?.headers,
          bodyLength: options?.body ? String(options.body).length : 0,
          timestamp: new Date().toISOString()
        });
        
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
          });
          
          console.log('📡 tRPC response status:', response.status, response.statusText);
          console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
          
          // Check if response is HTML (error page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('❌ Received HTML instead of JSON (first 500 chars):', htmlText.substring(0, 500));
            throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. This usually means the backend URL is incorrect or the server is down.`);
          }
          
          if (!response.ok) {
            const errorText = await response.clone().text();
            console.error('❌ HTTP Error Response:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText.substring(0, 500)
            });
          }
          
          return response;
        } catch (error) {
          console.error('❌ tRPC fetch error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            url,
            method: options?.method,
            timestamp: new Date().toISOString()
          });
          
          // Provide more helpful error messages
          if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(`Network error: Cannot connect to backend at ${url}. Please check if the backend URL is correct and the server is running.`);
          }
          
          throw error;
        }
      },
    }),
  ],
});