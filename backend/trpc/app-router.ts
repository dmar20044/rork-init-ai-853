import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import analyzeFoodRoute from "./routes/food/analyze/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  food: createTRPCRouter({
    analyze: analyzeFoodRoute,
  }),
});

export type AppRouter = typeof appRouter;