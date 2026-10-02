"use client";

import {
  Armchair,
  Check,
  Clock3,
  Coffee,
  Grid2X2,
  Lamp,
  MapPin,
  MoreHorizontal,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { Button, Progress, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

type ReviewTag = {
  id: string;
  name: string;
  icon: string | null;
};

type Props = {
  tags: ReviewTag[];
  selectedTags: string[];
  generating: boolean;

  onBack: () => void;
  onToggle: (tagId: string) => void;
  onGenerate: () => void;
};

const iconMap: Record<string, LucideIcon> = {
  food: Utensils,
  coffee: Coffee,
  user: UserRound,
  ambience: Lamp,
  sparkles: Sparkles,
  tag: Tag,
  location: MapPin,
  grid: Grid2X2,
  clock: Clock3,
  team: Users,
  chair: Armchair,
  more: MoreHorizontal,
};

export function ReviewTagStep({
  tags,
  selectedTags,
  generating,
  onBack,
  onToggle,
  onGenerate,
}: Props) {
  const maxSelected = 3;

  return (
    <section className="flex min-h-[680px] flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="!px-0 !text-base"
        >
          Back
        </Button>

        <Typography.Text type="secondary">
          2 of 4
        </Typography.Text>
      </div>

      {/* PROGRESS */}
      <Progress
        percent={50}
        showInfo={false}
        strokeColor="#176b5b"
        trailColor="#eeeeee"
        className="!mt-4"
      />

      {/* TITLE */}
      <div className="mt-7 text-center">
        <Typography.Title
          level={2}
          style={{
            marginBottom: 8,
          }}
        >
          What stood out?
        </Typography.Title>

        <Typography.Paragraph
          type="secondary"
          style={{
            maxWidth: 340,
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        >
          Choose 1–3 things that stood out. We&apos;ll use them to generate
          review suggestions that match your experience.
        </Typography.Paragraph>
      </div>

      {/* TAG GRID */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {tags.map((tag) => {
          const selected = selectedTags.includes(tag.id);

          const disabled =
            !selected && selectedTags.length >= maxSelected;

          const Icon =
            (tag.icon && iconMap[tag.icon]) ||
            MoreHorizontal;

          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled || generating}
              onClick={() => onToggle(tag.id)}
              className={[
                "relative flex min-h-[92px] flex-col",
                "items-center justify-center gap-2",
                "rounded-2xl border",
                "px-2 py-3",
                "transition-all duration-150",
                "focus:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-[#176b5b]",
                selected
                  ? "border-[#176b5b] bg-[#edf7f3] text-[#124f44]"
                  : "border-[#e3e3e3] bg-white text-[#1b2f2b]",
                disabled
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer active:scale-[0.97]",
              ].join(" ")}
            >
              {/* CHECK BADGE */}
              {selected && (
                <span
                  className="
                    absolute right-2 top-2
                    flex h-5 w-5
                    items-center justify-center
                    rounded-full
                    bg-[#176b5b]
                    text-white
                  "
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              )}

              <Icon
                size={25}
                strokeWidth={1.8}
              />

              <span
                className="
                  text-center
                  text-[13px]
                  font-medium
                  leading-tight
                "
              >
                {tag.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* COUNT */}
      <div className="mt-5 text-center">
        <Typography.Text type="secondary">
          {selectedTags.length} of 3 selected
        </Typography.Text>
      </div>

      {/* PUSH BUTTON TO BOTTOM */}
      <div className="flex-1" />

      {/* CTA */}
      <Button
        type="primary"
        size="large"
        block
        loading={generating}
        disabled={
          selectedTags.length === 0 ||
          generating
        }
        onClick={onGenerate}
        className="!mt-8 !h-14 !rounded-2xl !text-base !font-semibold"
      >
        Generate Review Suggestions →
      </Button>

      <Typography.Paragraph
        type="secondary"
        className="!mb-0 !mt-5 text-center"
        style={{ fontSize: 12 }}
      >
        Nothing is posted automatically.
      </Typography.Paragraph>
    </section>
  );
}