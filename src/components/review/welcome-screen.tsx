"use client";

import buttonStyles from "./flow-button.module.css";
import type { RefObject } from "react";
import { Avatar, Button, Card, Typography } from "antd";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function WelcomeScreen({
  business,
  location,
  logoUrl,
  headingRef,
  onStart,
}: {
  business: string;
  location: string;
  logoUrl: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
}) {
  return (
    <main className="public-shell" style={{ padding: 16 }}>
      <Card
        className="public-card"
        style={{
          maxWidth: 420,
          borderRadius: 30,
          overflow: "hidden",
          border: "1px solid #ffffff30",
          backgroundColor: "#14352c",
          backgroundImage:
            'linear-gradient(180deg, rgba(7, 17, 14, .28) 0%, rgba(7, 17, 14, .48) 38%, rgba(7, 17, 14, .28) 70%, rgba(7, 17, 14, .76) 100%), url("/images/review-welcome-cafe.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 20px 60px #102a2426",
        }}
        styles={{
          body: {
            minHeight: "clamp(640px, calc(100svh - 32px), 820px)",
            padding: "40px 24px 26px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <header>
          {logoUrl && (
            <Avatar
              src={logoUrl}
              size={56}
              shape="square"
              style={{ background: "transparent", marginBottom: 12 }}
            />
          )}
          <Typography.Text
            style={{
              display: "block",
              color: "#fff",
              fontSize: 25,
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "5px",
              lineHeight: 1.4,
              textShadow: "0 2px 10px #0006",
            }}
          >
            {business}
          </Typography.Text>
          <Typography.Text
            style={{
              display: "block",
              color: "#ffffffcf",
              fontSize: 12,
              marginTop: 8,
              letterSpacing: ".7px",
            }}
          >
            {location}
          </Typography.Text>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            textAlign: "left",
            padding: "64px 0 76px",
          }}
        >
          <Typography.Title
            ref={headingRef}
            tabIndex={-1}
            level={1}
            style={{
              color: "#fff",
              fontSize: "clamp(32px, 8.5vw, 38px)",
              lineHeight: 1.14,
              fontWeight: 600,
              letterSpacing: "-1.1px",
              margin: "0 0 16px",
              outline: "none",
              textShadow: "0 2px 16px #0005",
            }}
          >
            How was your
            <br />
            experience?
          </Typography.Title>
          <Typography.Paragraph
            style={{
              color: "#fffffff0",
              fontSize: 18,
              lineHeight: 1.5,
              maxWidth: 290,
              margin: 0,
              textShadow: "0 1px 10px #0008",
            }}
          >
            Your feedback helps us improve and helps others discover great
            places.
          </Typography.Paragraph>
        </div>

        <div>
          <Button
            type="primary"
            block
            size="large"
            onClick={onStart}
            className={buttonStyles.primary}
          >
            Share Your Experience{" "}
            <ArrowRight
              aria-hidden="true"
              size={20}
              style={{ flexShrink: 0 }}
            />
          </Button>
          <Typography.Paragraph
            style={{
              color: "#ffffffe0",
              fontSize: 13,
              margin: "18px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <ShieldCheck size={16} aria-hidden="true" /> Takes less than a
            minute
          </Typography.Paragraph>
        </div>
      </Card>
    </main>
  );
}
