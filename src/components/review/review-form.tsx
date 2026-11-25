"use client";
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Input, Typography } from "antd";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Pencil,
  Quote,
  RotateCw,
  Send,
  Star,
} from "lucide-react";
import { ReviewTagIcon } from "./tag-icon";
import { ExperienceSelector } from "./experience-selector";
import styles from "./review-flow.module.css";
import {
  confirmReviewPostedAction,
  saveRatingAction,
  saveTagsAction,
  generateReviewsAction,
  selectReviewAction,
  continueToGoogleAction,
} from "@/actions/review.actions";

type Screen = "experience" | "review" | "google";
type Props = {
  slug: string;
  business: string;
  category: string;
  location: string;
  logoUrl: string | null;
  tags: { id: string; name: string; icon: string | null }[];
  initialReviewState: "NEW" | "IN_PROGRESS" | "GOOGLE_CLICKED" | "COMPLETED";
  existingGoogleReviewUrl: string | null;
  initialReviewText?: string | null;
};
async function copyText(text: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.clipboard.writeText(text).then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), 1000);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
export function ReviewForm({
  slug,
  business,
  category,
  location,
  logoUrl,
  tags,
  initialReviewState,
  existingGoogleReviewUrl,
  initialReviewText,
}: Props) {
  const [screen, setScreen] = useState<Screen>(
    ["GOOGLE_CLICKED", "COMPLETED"].includes(initialReviewState)
      ? "google"
      : "experience",
  );
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const savedRating = useRef(0);
  const savedTags = useRef("");
  const generatedContext = useRef("");
  const [reviews, setReviews] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewDrafts = useRef<Record<number, string>>({});
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const [reviewText, setReviewText] = useState(initialReviewText ?? "");
  const [editing, setEditing] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    existingGoogleReviewUrl ?? "",
  );
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [transient, setTransient] = useState(false);
  const [awaitingGoogleReturn, setAwaitingGoogleReturn] = useState(false);
  const [returnedFromGoogle, setReturnedFromGoogle] = useState(false);
  const [existingGoogleHandoff, setExistingGoogleHandoff] = useState(
    initialReviewState === "GOOGLE_CLICKED",
  );
  const [postingConfirmed, setPostingConfirmed] = useState(
    initialReviewState === "COMPLETED",
  );
  const googleReturnArmed = useRef(false);
  const becameHiddenAfterGoogle = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen, postingConfirmed, returnedFromGoogle]);
  useEffect(() => {
    function handleVisibilityChange() {
      if (!googleReturnArmed.current) return;
      if (document.visibilityState === "hidden")
        becameHiddenAfterGoogle.current = true;
      else if (
        document.visibilityState === "visible" &&
        becameHiddenAfterGoogle.current
      ) {
        googleReturnArmed.current = false;
        becameHiddenAfterGoogle.current = false;
        setAwaitingGoogleReturn(false);
        setReturnedFromGoogle(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
  function clearError() {
    setError("");
    setTransient(false);
  }
  async function run(task: () => Promise<void>, fallback: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    clearError();
    try {
      await task();
    } catch {
      setError(fallback);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function generate(regenerate = false) {
    if (!rating) return;
    await run(async () => {
      let changed = false;
      if (!regenerate) {
        if (savedRating.current !== rating) {
          const result = await saveRatingAction({ slug, rating });
          if (!result.success) {
            setError(result.error);
            return;
          }
          savedRating.current = rating;
          savedTags.current = "";
          changed = true;
        }
        const key = [...selectedTags].sort().join(",");
        // Save [] too, so removing every highlight clears previous tags.
        const saved = await saveTagsAction({ slug, selectedTags });
        if (!saved.success) {
          setError(saved.error);
          return;
        }
        changed ||= savedTags.current !== key;
        savedTags.current = key;
      }
      const result = await generateReviewsAction({ slug, regenerate });
      if (!result.success) {
        setTransient(result.transient);
        setError(result.error);
        return;
      }
      const context = rating + ":" + [...selectedTags].sort().join(",");
      const unchanged =
        generatedContext.current === context &&
        !changed &&
        !regenerate &&
        reviews.length === result.reviews.length &&
        reviews.every((review, index) => review === result.reviews[index]);
      generatedContext.current = context;
      setReviews(result.reviews);
      if (!unchanged) {
        reviewDrafts.current = {};
        setReviewIndex(0);
        setReviewText(result.reviews[0]);
        setEditing(false);
      }
      setScreen("review");
    }, "Could not create your review. Please try again.");
  }
  function showReview(index: number) {
    if (
      pending.current ||
      index < 0 ||
      index >= reviews.length ||
      index === reviewIndex
    )
      return;
    reviewDrafts.current[reviewIndex] = reviewText;
    clearError();
    setReviewIndex(index);
    setReviewText(reviewDrafts.current[index] ?? reviews[index]);
    setEditing(false);
  }
  function tryAnother() {
    if (pending.current) return;
    clearError();
    if (reviewIndex + 1 < reviews.length) showReview(reviewIndex + 1);
    else void generate(true);
  }
  async function acceptReview() {
    if (!reviewText.trim()) {
      setError("Please enter your review.");
      return;
    }
    await run(async () => {
      // Validate the original suggestion; the atomic handoff then saves edits.
      const selected = await selectReviewAction({
        slug,
        reviewText: reviews[reviewIndex],
      });
      if (!selected.success) {
        setError(selected.error);
        return;
      }
      const result = await continueToGoogleAction({
        slug,
        reviewText: reviewText.trim(),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReviewText(result.reviewText);
      setCopied(await copyText(result.reviewText));
      setGoogleReviewUrl(result.googleReviewUrl);
      setScreen("google");
    }, "Could not save your review. Please try again.");
  }
  function launchGoogleReview() {
    if (!googleReviewUrl || pending.current) return;
    clearError();
    becameHiddenAfterGoogle.current = false;
    googleReturnArmed.current = true;
    setExistingGoogleHandoff(false);
    setReturnedFromGoogle(false);
    setAwaitingGoogleReturn(true);
    // noopener makes window.open return null even on success. Open a blank
    // handle first so we can distinguish blocking, then apply both protections.
    let tab: Window | null = null;
    try {
      tab = window.open("about:blank", "_blank");
      if (!tab) throw new Error("Popup blocked");
      tab.opener = null;
      const policy = tab.document.createElement("meta");
      policy.name = "referrer";
      policy.content = "no-referrer";
      tab.document.head.appendChild(policy);
      tab.location.replace(googleReviewUrl);
    } catch {
      tab?.close();
      googleReturnArmed.current = false;
      becameHiddenAfterGoogle.current = false;
      setAwaitingGoogleReturn(false);
      window.location.assign(googleReviewUrl);
    }
  }
  async function finishReview() {
    await run(async () => {
      const result = await confirmReviewPostedAction({ slug });
      if (!result.success) {
        setError(result.error);
        return;
      }
      googleReturnArmed.current = false;
      becameHiddenAfterGoogle.current = false;
      setAwaitingGoogleReturn(false);
      setPostingConfirmed(true);
    }, "Could not save your confirmation. Please try again.");
  }
  const confirmation = returnedFromGoogle || existingGoogleHandoff;
  const title =
    screen === "experience"
      ? "How was your experience?"
      : screen === "review"
        ? "Here’s a review for you"
        : postingConfirmed
          ? "Thank you!"
          : confirmation
            ? "Did you finish posting your review?"
            : copied
              ? "Review Copied!"
              : "Your review is ready";
  return (
    <main className={styles.shell}>
      <section
        className={[
          styles.card,
          screen === "experience" ? styles.experience : "",
        ].join(" ")}
        aria-busy={busy}
      >
        {screen === "experience" ? (
          <header className={`${styles.hero} ${["cafe", "restaurant"].includes(category.toLowerCase()) ? "" : styles.categoryHero}`}>
            {logoUrl && <Avatar src={logoUrl} size={38} shape="square" />}
            <div className={styles.business}>{business}</div>
            <div className={styles.location}>{location}</div>
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            <p>
              Let us create a quick review
              <br />
              for you to share on Google.
            </p>
          </header>
        ) : (
          <header className={styles.header}>
            {screen === "review" && (
              <Button
                type="text"
                aria-label="Back to experience"
                disabled={busy}
                icon={<ArrowLeft size={20} />}
                onClick={() => {
                  clearError();
                  setScreen("experience");
                }}
              />
            )}
            <div className={styles.brand}>
              <span>
                <Star size={17} fill="currentColor" aria-hidden />
              </span>
              ReviewDesk
            </div>
          </header>
        )}
        <div className={styles.body}>
          {screen === "experience" && (
            <>
              <ExperienceSelector
                rating={rating}
                disabled={busy}
                onChange={(value) => {
                  setRating(value);
                  clearError();
                }}
              />
              <div className={styles.tagsHeading}>
                <strong>What stood out?</strong> <span>(optional)</span>
              </div>
              <div
                className="grid grid-cols-3 gap-2"
                role="group"
                aria-label="Experience tags"
              >
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={styles.tag}
                      aria-label={tag.name}
                      aria-pressed={selected}
                      disabled={busy || (!selected && selectedTags.length >= 3)}
                      onClick={() => {
                        clearError();
                        setSelectedTags((current) =>
                          selected
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id],
                        );
                      }}
                    >
                      <ReviewTagIcon icon={tag.icon} size={17} />
                      <span>{tag.name}</span>
                      {selected && (
                        <span className={styles.check}>
                          <Check size={10} aria-hidden />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className={styles.count}>
                {selectedTags.length} of 3 selected
              </p>
              <Button
                type="primary"
                block
                className={styles.primary}
                loading={busy}
                disabled={!rating || busy}
                onClick={() => void generate()}
              >
                {busy ? "Creating your review…" : "Create My Review"}{" "}
                {!busy && <ArrowRight size={19} aria-hidden />}
              </Button>
            </>
          )}
          {screen === "review" && (
            <>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              <p className={styles.subtitle}>
                We’ve created a short review based on your experience. You can
                use it as is or try another.
              </p>
              <div
                className={styles.review}
                role="region"
                aria-roledescription="carousel"
                aria-label="Review suggestions"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (editing || event.target !== event.currentTarget) return;
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    showReview(reviewIndex + 1);
                  }
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    showReview(reviewIndex - 1);
                  }
                }}
                onPointerDown={(event) => {
                  if (
                    busy ||
                    editing ||
                    !event.isPrimary ||
                    (event.target as HTMLElement).closest(
                      "button, textarea, input",
                    )
                  )
                    return;
                  swipeStart.current = {
                    x: event.clientX,
                    y: event.clientY,
                    id: event.pointerId,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  swipeStart.current = null;
                }}
                onPointerUp={(event) => {
                  const start = swipeStart.current;
                  swipeStart.current = null;
                  if (!start || start.id !== event.pointerId || busy || editing)
                    return;
                  const dx = event.clientX - start.x;
                  const dy = event.clientY - start.y;
                  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5)
                    showReview(reviewIndex + (dx < 0 ? 1 : -1));
                }}
              >
                <Quote size={30} fill="currentColor" aria-hidden />
                {editing ? (
                  <Input.TextArea
                    aria-label="Your review"
                    value={reviewText}
                    maxLength={500}
                    showCount
                    autoSize={{ minRows: 5, maxRows: 10 }}
                    disabled={busy}
                    onChange={(event) => setReviewText(event.target.value)}
                  />
                ) : (
                  <p>{reviewText}</p>
                )}
                <div className={styles.reviewFooter}>
                  <span
                    className={styles.stars}
                    aria-label={rating + " out of 5 experience level"}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={20}
                        aria-hidden
                        fill={index < rating ? "currentColor" : "none"}
                      />
                    ))}
                  </span>
                  <Button
                    type="link"
                    disabled={busy}
                    icon={editing ? <Check size={16} /> : <Pencil size={16} />}
                    onClick={() => {
                      if (editing && !reviewText.trim()) {
                        setError("Please enter your review.");
                        return;
                      }
                      clearError();
                      setEditing(!editing);
                    }}
                  >
                    {editing ? "Done" : "Edit"}
                  </Button>
                </div>
              </div>
              <div
                className={styles.optionDots}
                aria-label={
                  "Suggestion " + (reviewIndex + 1) + " of " + reviews.length
                }
              >
                {reviews.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    aria-label={"Show suggestion " + (index + 1)}
                    aria-current={index === reviewIndex ? "true" : undefined}
                    disabled={busy}
                    onClick={() => showReview(index)}
                  >
                    <span
                      className={index === reviewIndex ? styles.activeDot : ""}
                    />
                  </button>
                ))}
              </div>
              <Button
                type="primary"
                block
                className={styles.primary}
                loading={busy}
                disabled={busy || !reviewText.trim()}
                onClick={() => void acceptReview()}
              >
                Use This Review <ArrowRight size={19} aria-hidden />
              </Button>
              <Button
                block
                className={styles.secondary}
                disabled={busy}
                icon={<RotateCw size={18} />}
                onClick={tryAnother}
              >
                Try Another
              </Button>
            </>
          )}
          {screen === "google" && (
            <>
              {(!confirmation || postingConfirmed) && (
                <div className={styles.success}>
                  <Check size={43} strokeWidth={3} aria-hidden />
                </div>
              )}
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              {postingConfirmed ? (
                <>
                  <p className={styles.subtitle}>
                    Thanks for sharing your experience.
                  </p>
                  <p className={styles.subtitle}>
                    Your feedback helps this business and other customers.
                  </p>
                </>
              ) : confirmation ? (
                <>
                  <p className={styles.subtitle}>Your feedback really helps.</p>
                  <Button
                    type="primary"
                    block
                    className={styles.primary}
                    loading={busy}
                    disabled={busy}
                    onClick={() => void finishReview()}
                  >
                    Yes, done
                  </Button>
                  <Button
                    block
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => {
                      clearError();
                      googleReturnArmed.current = false;
                      becameHiddenAfterGoogle.current = false;
                      setAwaitingGoogleReturn(false);
                      setReturnedFromGoogle(false);
                      setExistingGoogleHandoff(false);
                    }}
                  >
                    Not yet
                  </Button>
                  <Button
                    type="link"
                    disabled={busy || !googleReviewUrl}
                    onClick={launchGoogleReview}
                  >
                    Open Google Review Again
                  </Button>
                </>
              ) : (
                <>
                  <p className={styles.subtitle}>
                    {copied
                      ? "Your review is ready to paste into Google."
                      : "Copy your review below, then paste it into Google."}
                  </p>
                  <ol className={styles.instructions}>
                    <li>
                      <ArrowUpRight size={21} aria-hidden />
                      <span>Tap “Open Google Review”</span>
                    </li>
                    <li>
                      <Star
                        size={21}
                        color="#efb516"
                        fill="#efb516"
                        aria-hidden
                      />
                      <span>Choose your star rating</span>
                    </li>
                    <li>
                      <Copy size={21} aria-hidden />
                      <span>
                        Paste the review
                        <br />
                        <small>(long-press → Paste)</small>
                      </span>
                    </li>
                    <li>
                      <Send size={21} aria-hidden />
                      <span>Post your review</span>
                    </li>
                  </ol>
                  {!copied && reviewText && (
                    <Typography.Paragraph
                      copyable
                      className={styles.manualCopy}
                    >
                      {reviewText}
                    </Typography.Paragraph>
                  )}
                  <Button
                    type="primary"
                    block
                    className={styles.primary}
                    disabled={!googleReviewUrl}
                    onClick={launchGoogleReview}
                  >
                    Open Google Review <ArrowUpRight size={19} aria-hidden />
                  </Button>
                  {awaitingGoogleReturn && (
                    <p className={styles.count}>
                      Return to this tab when you’re finished on Google.
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {error && (
            <p
              className={transient ? styles.notice : styles.error}
              role={transient ? "status" : "alert"}
            >
              {error}
            </p>
          )}
          {screen !== "google" && (
            <p className={styles.disclaimer}>
              Nothing is posted automatically.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
