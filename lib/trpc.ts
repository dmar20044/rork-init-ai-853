import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        console.log('tRPC request to:', url);
        console.log('tRPC request options:', {
          method: options?.method,
          headers: options?.headers,
          bodyLength: options?.body ? String(options.body).length : 0
        });
        
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
          });
          
          console.log('tRPC response status:', response.status);
          console.log('tRPC response headers:', Object.fromEntries(response.headers.entries()));
          
          // Check if response is HTML (error page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('Received HTML instead of JSON:', htmlText.substring(0, 500));
            
            // If we get a 404, the backend might not be properly deployed
            // Return a mock response to prevent the app from crashing
            if (response.status === 404) {
              console.log('Backend not found (404), creating mock response');
              const mockResponse = new Response(
                JSON.stringify({
                  id: null,
                  result: {
                    type: 'data',
                    data: {
                      success: false,
                      error: 'Backend service is not available. Please try again later.'
                    }
                  }
                }),
                {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              );
              return mockResponse;
            }
            
            throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
          }
          
          return response;
        } catch (error) {
          console.error('tRPC fetch error:', error);
          
          // If it's a network error or the backend is completely down,
          // return a mock error response to prevent app crashes
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.log('Network error detected, creating mock error response');
            const mockResponse = new Response(
              JSON.stringify({
                id: null,
                result: {
                  type: 'data',
                  data: {
                    success: false,
                    error: 'Network connection failed. Please check your internet connection and try again.'
                  }
                }
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            return mockResponse;
          }
          
          throw error;
        }
      },
    }),
  ],
});