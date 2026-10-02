"use client";
import { AppProvider } from "@/providers/app-provider";
import { ErrorState } from "@/components/common/states";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <ErrorState reset={reset} />
        </AppProvider>
      </body>
    </html>
  );
}
