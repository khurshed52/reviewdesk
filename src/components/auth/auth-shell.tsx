"use client";
import { Card } from "antd";
import { Brand } from "@/components/common/brand";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <Card className="auth-card" styles={{ body: { padding: 32 } }}>
        <div className="mb-8">
          <Brand />
        </div>
        {children}
      </Card>
    </main>
  );
}
