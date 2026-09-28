import tailwindcss from "@tailwindcss/vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro(),
    viteReact(),
    sentryTanstackStart({
      silent: !process.env["SENTRY_AUTH_TOKEN"],
      sourcemaps: { disable: process.env["SENTRY_AUTH_TOKEN"] ? false : "disable-upload" },
    }),
  ],
});
