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
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] tRPC request to:`, url);
        console.log(`[${timestamp}] tRPC request options:`, {
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
          
          console.log(`[${timestamp}] tRPC response status:`, response.status);
          console.log(`[${timestamp}] tRPC response headers:`, Object.fromEntries(response.headers.entries()));
          
          // Check if response is HTML (error page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error(`[${timestamp}] Received HTML instead of JSON:`, htmlText.substring(0, 500));
            throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
          }
          
          // Log successful responses for debugging
          if (response.ok) {
            console.log(`[${timestamp}] tRPC request successful`);
          } else {
            console.error(`[${timestamp}] tRPC request failed with status:`, response.status);
          }
          
          return response;
        } catch (error) {
          console.error(`[${timestamp}] tRPC fetch error:`, {
            message: error instanceof Error ? error.message : 'Unknown error',
            url,
            method: options?.method,
            error
          });
          throw error;
        }
      },
    }),
  ],
});