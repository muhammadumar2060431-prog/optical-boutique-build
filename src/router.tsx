import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import * as Sentry from "@sentry/tanstackstart-react";
import { routeTree } from "./routeTree.gen";

function getTracesSampleRate() {
  const configuredRate = Number(import.meta.env["VITE_SENTRY_TRACES_SAMPLE_RATE"] ?? "0.1");
  return Number.isFinite(configuredRate) && configuredRate >= 0 && configuredRate <= 1
    ? configuredRate
    : 0.1;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (!router.isServer) {
    const dsn = import.meta.env["VITE_SENTRY_DSN"];

    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      environment: import.meta.env["VITE_SENTRY_ENVIRONMENT"] ?? import.meta.env.MODE,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      tracesSampleRate: getTracesSampleRate(),
    });
  }

  return router;
};
