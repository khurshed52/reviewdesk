"use client";



import { useEffect, useRef, useState } from "react";

import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";

import { ReviewTagIcon } from "./tag-icon";
import { WelcomeScreen } from "./welcome-screen";
import buttonStyles from "./flow-button.module.css";

import {

  App,

  Alert,

  Avatar,

  Button,

  Card,

  Input,

  Progress,

  Spin,

  Typography,

} from "antd";

import {

  ArrowLeftOutlined,

  CheckCircleFilled,

  CopyOutlined,

  SafetyOutlined,


} from "@ant-design/icons";

import {

  confirmReviewPostedAction,
  saveRatingAction,

  saveTagsAction,

  generateReviewsAction,

  selectReviewAction,

  continueToGoogleAction,

} from "@/actions/review.actions";



type ReviewTag = {

  id: string;

  name: string;

  icon: string | null;

};





const experiences = [

  {

    label: "Excellent",

    rating: 5,

    description: "Loved it! Amazing experience.",

    color: "#16b869",

  },

  {

    label: "Good",

    rating: 4,

    description: "A positive experience.",

    color: "#68d66c",

  },

  {

    label: "Okay",

    rating: 3,

    description: "It was average.",

    color: "#f8d94e",

  },

  { label: "Poor", rating: 2, description: "Some issues.", color: "#ff9d38" },

  {

    label: "Very poor",

    rating: 1,

    description: "Not a good experience.",

    color: "#f04444",

  },

];



function ExperienceFace({ rating, color }: { rating: number; color: string }) {

  return (

    <svg

      aria-hidden="true"

      width="36"

      height="36"

      viewBox="0 0 36 36"

      style={{ flexShrink: 0 }}

    >

      <circle cx="18" cy="18" r="17" fill={color} />

      <ellipse cx="12" cy="13" rx="1.6" ry="2" fill="#163b31" />

      <ellipse cx="24" cy="13" rx="1.6" ry="2" fill="#163b31" />

      {rating >= 4 ? (

        <path

          d={rating === 5 ? "M10 20 Q18 32 26 20 Z" : "M11 21 Q18 29 25 21"}

          fill={rating === 5 ? "#fff" : "none"}

          stroke="#163b31"

          strokeWidth="1.8"

          strokeLinecap="round"

        />

      ) : (

        <path

          d={rating === 3 ? "M12 23 H24" : "M11 25 Q18 16 25 25"}

          fill="none"

          stroke="#163b31"

          strokeWidth="2"

          strokeLinecap="round"

        />

      )}

      {rating === 1 && (

        <path

          d="M9 8 L14 10 M22 10 L27 8"

          stroke="#163b31"

          strokeWidth="1.5"

          strokeLinecap="round"

        />

      )}

    </svg>

  );

}

type Step = 1 | 2 | 3 | 4 | 5;

const headings = {

  1: "How was your experience?",

  2: "What stood out?",

  3: "Here are some review suggestions for you",

  4: "Edit your review",

  5: "Opening Google",

};

const choiceStyle = (selected: boolean) => ({

  height: "auto",

  minHeight: 60,

  padding: "16px",

  borderRadius: 16,

  whiteSpace: "normal" as const,

  textAlign: "left" as const,

  justifyContent: "flex-start",

  borderColor: selected ? "#176b5b" : "#dce5e2",

  background: selected ? "#eaf4ef" : "#fff",

  color: "#183e35",

  boxShadow: selected ? "0 0 0 1px #176b5b" : "0 2px 8px #183e3505",

});



async function copyText(text: string): Promise<boolean> {

  try {

    return await Promise.race([

      navigator.clipboard.writeText(text).then(() => true),

      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),

    ]);

  } catch {

    return false;

  }

}



export function ReviewForm({

  slug,

  business,

  location,

  logoUrl,

  tags,

}: {

  slug: string;

  business: string;

  location: string;

  logoUrl: string | null;

  tags: { id: string; name: string; icon: string | null }[];

}) {

  const { message } = App.useApp();

  const [welcome, setWelcome] = useState(true);
const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [awaitingGoogleReturn, setAwaitingGoogleReturn] = useState(false);
  const [postingConfirmed, setPostingConfirmed] = useState(false);
  const [returnedFromGoogle, setReturnedFromGoogle] = useState(false);
  const googleReturnArmed = useRef(false);
  const becameHiddenAfterGoogle = useRef(false);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!googleReturnArmed.current) return;
      if (document.visibilityState === "hidden") {
        becameHiddenAfterGoogle.current = true;
      } else if (document.visibilityState === "visible" && becameHiddenAfterGoogle.current) {
        googleReturnArmed.current = false;
        becameHiddenAfterGoogle.current = false;
        setAwaitingGoogleReturn(false);
        setReturnedFromGoogle(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  function launchGoogleReview() {
    if (!googleReviewUrl || pending.current) return;
    clearError();
    becameHiddenAfterGoogle.current = false;
    googleReturnArmed.current = true;
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

  function notYet() {
    if (pending.current) return;
    clearError();
    googleReturnArmed.current = false;
    becameHiddenAfterGoogle.current = false;
    setAwaitingGoogleReturn(false);
    setReturnedFromGoogle(false);
  }
  const [step, setStep] = useState<Step>(1);

  const [rating, setRating] = useState(0);

  const [savedRating, setSavedRating] = useState(0);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [savedTagsKey, setSavedTagsKey] = useState("");

  const [reviews, setReviews] = useState<string[]>([]);

  const [selectedReview, setSelectedReview] = useState<string>();

  const [reviewText, setReviewText] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string>();

  const [transient, setTransient] = useState(false);

  const [copied, setCopied] = useState(false);

  const pending = useRef(false);

  const heading = useRef<HTMLHeadingElement>(null);



  useEffect(() => {

    heading.current?.focus({ preventScroll: true });

    window.scrollTo({ top: 0, behavior: "instant" });

  }, [step, welcome]);



  function clearError() {

    setError(undefined);

    setTransient(false);

  }

  function moveTo(next: Step) {

    if (pending.current) return;

    clearError();

    setStep(next);

  }

  function clearSuggestions() {

    setReviews([]);

    setSelectedReview(undefined);

    setReviewText("");

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



  async function next() {

    if (!rating) return;

    await run(async () => {

      const result = await saveRatingAction({ slug, rating });

      if (!result.success) {

        setError(result.error);

        return;

      }

      if (savedRating !== rating) {

        clearSuggestions();

        setSavedTagsKey("");

      }

      setSavedRating(rating);

      setStep(2);

    }, "Could not save your rating. Please try again.");

  }



  async function generate(regenerate = false) {

    if (!selectedTags.length) return;

    await run(async () => {

      if (!regenerate) {

        const result = await saveTagsAction({ slug, selectedTags });

        if (!result.success) {

          setError(result.error);

          return;

        }

        const key = [...selectedTags].sort().join(",");

        if (key !== savedTagsKey) clearSuggestions();

        setSavedTagsKey(key);

      }

      const result = await generateReviewsAction({ slug, regenerate });

      if (!result.success) {

        setTransient(result.transient);

        setError(result.error);

        return;

      }

      setReviews(result.reviews);

      // Preserve selection and edits when returning to unchanged cached suggestions.

      if (

        regenerate ||

        !selectedReview ||

        !result.reviews.includes(selectedReview)

      ) {

        setSelectedReview(undefined);

        setReviewText("");

      }

      setStep(3);

    }, "Could not generate review suggestions. Please try again.");

  }



  async function continueWithReview() {

    if (!selectedReview) return;

    await run(async () => {

      const result = await selectReviewAction({

        slug,

        reviewText: selectedReview,

      });

      if (!result.success) {

        setError(result.error);

        return;

      }

      setStep(4);

    }, "Could not save your review selection. Please try again.");

  }



  async function copyReview() {

    if (!reviewText.trim()) {

      setError("Please enter your review.");

      return;

    }

    await run(async () => {

      if (await copyText(reviewText.trim()))

        void message.success("Review copied. Paste it on Google.");

      else setError("Could not copy. You can still continue to Google.");

    }, "Could not copy. You can still continue to Google.");

  }



 async function openGoogle() {
  if (!reviewText.trim()) {
    setError("Please enter your review.");
    return;
  }

  await run(async () => {
    const result = await continueToGoogleAction({
      slug,
      reviewText,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    const didCopy = await copyText(result.reviewText);

    setCopied(didCopy);
    setGoogleReviewUrl(result.googleReviewUrl);
    setStep(5);
  }, "Could not save your review. Please try again.");
}



  if (welcome) {
    return (
      <WelcomeScreen
        business={business}
        location={location}
        logoUrl={logoUrl}
        headingRef={heading}
        onStart={() => setWelcome(false)}
      />
    );
  }


  return (

    <main className="public-shell">

      <Card

        className="public-card"

        style={{

          borderRadius: 24,

          boxShadow: "0 12px 40px #183e3510",

          ...(step === 1 || step === 2 ? { maxWidth: 420 } : {}),

        }}

        styles={{

          body: {

            padding: step === 1 || step === 2 ? "20px 20px 24px" : "28px 24px",

            ...(step === 2

              ? ({

                  display: "flex",

                  flexDirection: "column",

                  minHeight: "min(760px, calc(100dvh - 48px))",

                } as const)

              : {}),

          },

        }}

      >

        {step > 1 && step < 5 && (

          <div className={step === 2 ? "mb-3" : "mb-5"}>

            <div className="flex items-center justify-between">

              <Button

                type="text"

                aria-label="Back"

                icon={

                  step === 2 ? (

                    <ArrowLeft size={18} aria-hidden="true" />

                  ) : (

                    <ArrowLeftOutlined />

                  )

                }

                disabled={busy}

                onClick={() => moveTo((step - 1) as Step)}

                style={{

                  visibility: step === 1 ? "hidden" : "visible",

                  minHeight: 44,

                }}

              >

                Back

              </Button>

              <Typography.Text type="secondary">{step} of 4</Typography.Text>

            </div>

            <Progress

              percent={(step / 4) * 100}

              showInfo={false}

              strokeColor="#176b5b"

              size="small"

            />

          </div>

        )}



        {step === 1 && (

          <div

            style={{

              position: "relative",

              padding: "4px 44px 0",

              marginBottom: 20,

              minHeight: 58,

            }}

          >

            <Button

              type="text"

              aria-label="Back to welcome"

              icon={<ArrowLeftOutlined />}

              disabled={busy}

              onClick={() => setWelcome(true)}

              style={{

                position: "absolute",

                left: -8,

                top: 0,

                width: 44,

                height: 44,

              }}

            />

            {logoUrl && (

              <Avatar

                size={32}

                src={logoUrl}

                shape="square"

                style={{ background: "transparent", marginBottom: 6 }}

              />

            )}

            <Typography.Text

              style={{

                display: "block",

                fontSize: 14,

                letterSpacing: "2px",

                textTransform: "uppercase",

                color: "#52665e",

              }}

            >

              {business}

            </Typography.Text>

            <Typography.Text type="secondary" style={{ fontSize: 11 }}>

              {location} · <span>1 of 4</span>

            </Typography.Text>

          </div>

        )}

        {!(step === 5 && (returnedFromGoogle || postingConfirmed)) && (<Typography.Title

          level={2}

          ref={heading}

          tabIndex={-1}

          style={{

            marginTop: 0,

            fontSize: step === 1 ? 23 : 26,

            lineHeight: step === 1 ? 1.2 : undefined,

            letterSpacing: step === 1 ? "-0.6px" : undefined,

            marginBottom: step === 1 ? 8 : undefined,

            outline: "none",

          }}

        >

          {step === 1 ? (

            <>

              How was your experience

              <br />

              at {business}?

            </>

          ) : (

            headings[step]

          )}

        </Typography.Title>)}



        {step === 1 && (

          <>

            <Typography.Paragraph

              style={{

                color: "#52605a",

                fontSize: 14,

                lineHeight: 1.5,

                marginBottom: 14,

              }}

            >

              This helps us create the perfect

              <br />

              review for you.

            </Typography.Paragraph>

            <div

              className="flex flex-col gap-2"

              role="group"

              aria-label="Experience level"

            >

              {experiences.map((experience) => (

                <Button

                  key={experience.rating}

                  aria-label={experience.label}

                  block

                  aria-pressed={rating === experience.rating}

                  disabled={busy}

                  onClick={() => {

                    setRating(experience.rating);

                    clearError();

                  }}

                  style={{

                    ...choiceStyle(rating === experience.rating),

                    minHeight: 66,

                    padding: "10px 16px",

                    borderRadius: 14,

                    gap: 16,

                    background:

                      rating === experience.rating ? "#eaf4ef" : "#f8f9f8",

                    borderColor:

                      rating === experience.rating ? "#176b5b" : "#ecefed",

                    boxShadow:

                      rating === experience.rating

                        ? "0 0 0 1px #176b5b"

                        : "0 1px 3px #183e3504",

                  }}

                >

                  <ExperienceFace

                    rating={experience.rating}

                    color={experience.color}

                  />

                  <span style={{ flex: 1, display: "block" }}>

                    <span

                      style={{

                        display: "block",

                        fontSize: 16,

                        fontWeight: 600,

                        lineHeight: 1.35,

                      }}

                    >

                      {experience.label}

                    </span>

                    <span

                      style={{

                        display: "block",

                        fontSize: 13,

                        color: "#52605a",

                        fontWeight: 400,

                        lineHeight: 1.4,

                        marginTop: 2,

                      }}

                    >

                      {experience.description}

                    </span>

                  </span>

                  {rating === experience.rating && (

                    <CheckCircleFilled aria-hidden="true" />

                  )}

                </Button>

              ))}

            </div>

          </>

        )}



        {step === 2 && (
          <>
            <Typography.Paragraph
              type="secondary"
              style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}
            >
              Choose 1–3 things that stood out. We’ll use them to generate
              review suggestions that match your experience.
            </Typography.Paragraph>

            <div
              className="grid grid-cols-3 gap-3"
              role="group"
              aria-label="Experience tags"
            >
              {tags.map((tag) => {
                const selected = selectedTags.includes(tag.id);
                const disabled = busy || (!selected && selectedTags.length >= 3);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-label={tag.name}
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => {
                      clearError();
                      setSelectedTags((current) =>
                        current.includes(tag.id)
                          ? current.filter((id) => id !== tag.id)
                          : current.length < 3
                            ? [...current, tag.id]
                            : current,
                      );
                    }}
                    className={[
                      "relative flex min-h-[96px] w-full flex-col items-center justify-center gap-2",
                      "rounded-2xl border px-2 py-3 text-center transition-all duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#176b5b] focus-visible:ring-offset-2",
                      selected
                        ? "border-[#176b5b] bg-[#edf6f1] text-[#176b5b] shadow-[0_0_0_1px_#176b5b]"
                        : "border-[#e7ebe9] bg-[#fafbfa] text-[#34463f] shadow-[0_1px_3px_#183e3504]",
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer active:scale-[0.98]",
                    ].join(" ")}
                  >
                    {selected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#176b5b] text-white"
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}

                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center",
                        selected ? "text-[#176b5b]" : "text-[#34463f]",
                      ].join(" ")}
                    >
                      <ReviewTagIcon icon={tag.icon} />
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        lineHeight: 1.2,
                        fontWeight: selected ? 600 : 500,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {tag.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <Typography.Paragraph
              type="secondary"
              style={{
                fontSize: 12,
                marginTop: 12,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {selectedTags.length} of 3 selected
            </Typography.Paragraph>

            {!tags.length && (
              <Typography.Paragraph type="secondary">
                No review options are available for this business yet.
              </Typography.Paragraph>
            )}
          </>
        )}

      {step === 3 && (
  <>
    <Typography.Paragraph
      type="secondary"
      style={{
        fontSize: 14,
        lineHeight: 1.5,
        marginBottom: 18,
      }}
    >
      Feel free to edit or choose one.
    </Typography.Paragraph>

    <div
      className="flex flex-col gap-3"
      role="group"
      aria-label="Review suggestions"
    >
      {reviews.map((review, index) => {
        const selected = selectedReview === review;

        return (
          <button
            key={`${review}-${index}`}
            type="button"
            aria-pressed={selected}
            disabled={busy}
            onClick={() => {
              clearError();

              if (selectedReview !== review) {
                setReviewText(review);
              }

              setSelectedReview(review);
            }}
            style={{
              width: "100%",
              position: "relative",
              textAlign: "left",
              borderRadius: 16,
              border: selected
                ? "2px solid #176b5b"
                : "1px solid #e3e8e5",
              background: selected ? "#edf6f1" : "#fff",
              padding: "14px 46px 14px 16px",
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              boxShadow: selected
                ? "0 0 0 1px rgba(23,107,91,0.08)"
                : "0 1px 4px rgba(24,62,53,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#243a34",
                marginBottom: 4,
              }}
            >
              Option {index + 1}
            </div>

            <div
              aria-label={`${rating} out of 5 experience rating`}
              style={{
                display: "flex",
                gap: 2,
                marginBottom: 10,
                color: "#f6b800",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              {Array.from({ length: 5 }).map((_, starIndex) => (
                <span
                  key={starIndex}
                  style={{
                    color: starIndex < rating ? "#f6b800" : "#d7dcda",
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "#34463f",
                overflowWrap: "anywhere",
              }}
            >
              {review}
            </div>

            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 18,
                right: 16,
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: selected
                  ? "6px solid #176b5b"
                  : "2px solid #cdd5d1",
                background: "#fff",
              }}
            />
          </button>
        );
      })}
    </div>

    <Button
      className="mt-4"
      type="link"
      disabled={busy}
      aria-label="Regenerate options"
      onClick={() => void generate(true)}
    >
      Regenerate options
    </Button>
  </>
)}


{step === 4 && (
  <div className="text-left">
    <Typography.Paragraph
      type="secondary"
      style={{
        fontSize: 14,
        lineHeight: 1.5,
        marginBottom: 18,
      }}
    >
      Make any changes you like.
    </Typography.Paragraph>

    <Input.TextArea
      aria-label="Your review"
      value={reviewText}
      onChange={(event) => setReviewText(event.target.value)}
      autoSize={{ minRows: 6, maxRows: 9 }}
      maxLength={500}
      showCount
      disabled={busy}
      style={{
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        lineHeight: 1.6,
      }}
    />

    <div
      className="mt-6 flex items-start gap-3 rounded-2xl"
      style={{
        background: "#eef6ff",
        padding: "16px",
        color: "#315d9b",
      }}
    >
      <CopyOutlined
        style={{
          fontSize: 22,
          marginTop: 2,
          color: "#315d9b",
        }}
      />

      <Typography.Text
        style={{
          color: "#315d9b",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        We’ll copy this review to your clipboard and take you to Google.
      </Typography.Text>
    </div>
  </div>
)}


     {step === 5 && postingConfirmed && (
       <section className="flex min-h-[400px] flex-col items-center justify-center text-center">
         <Check size={48} color="#176b5b" aria-hidden="true" />
         <Typography.Title level={2} className="mt-5">Thank you!</Typography.Title>
         <Typography.Paragraph>Thanks for sharing your experience.</Typography.Paragraph>
         <Typography.Paragraph type="secondary">Your feedback helps this business and other customers.</Typography.Paragraph>
       </section>
     )}
     {step === 5 && returnedFromGoogle && !postingConfirmed && (
       <section className="flex min-h-[520px] flex-col items-center justify-center text-center">
         <Typography.Title level={2}>Did you finish posting your review?</Typography.Title>
         <Typography.Paragraph type="secondary">Your feedback really helps.</Typography.Paragraph>
         <Button type="primary" block className={buttonStyles.primary} loading={busy} disabled={busy} aria-label="Yes, done" onClick={() => void finishReview()}>Yes, done</Button>
         <Button block size="large" className="mt-3" style={{ borderRadius: 999, minHeight: 52 }} disabled={busy} onClick={notYet}>Not yet</Button>
         <Button type="link" className="mt-3" disabled={busy} onClick={launchGoogleReview}>Open Google Review Again</Button>
       </section>
     )}

     {step === 5 && !returnedFromGoogle && !postingConfirmed && (
  <div
    role="status"
    className="flex min-h-[520px] flex-col items-center justify-center text-center"
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "#e8f7ef",
        display: "grid",
        placeItems: "center",
        marginBottom: 24,
      }}
    >
      <Check
        size={38}
        strokeWidth={2.5}
        color="#16a866"
        aria-hidden="true"
      />
    </div>

    <Typography.Title
      level={2}
      style={{
        marginBottom: 10,
      }}
    >
      {copied ? "Review copied!" : "Review ready"}
    </Typography.Title>

    <Typography.Paragraph
      type="secondary"
      style={{
        maxWidth: 310,
        fontSize: 15,
        lineHeight: 1.6,
        marginBottom: 28,
      }}
    >
      {copied
        ? "Your review is ready to paste into Google."
        : "We couldn’t copy automatically, but your review is ready for Google."}
    </Typography.Paragraph>

    <div
      style={{
        width: "100%",
        borderRadius: 16,
        background: "#eef6ff",
        padding: "16px",
        marginBottom: 24,
        textAlign: "left",
      }}
    >
      <Typography.Text
        style={{
          color: "#315d9b",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        On the next screen, paste your review into Google and select your star
        rating.
      </Typography.Text>
    </div>

    {!copied && (
      <Typography.Paragraph
        copyable
        style={{
          width: "100%",
          padding: 14,
          border: "1px solid #e2e8e5",
          borderRadius: 14,
          textAlign: "left",
          marginBottom: 20,
        }}
      >
        {reviewText.trim()}
      </Typography.Paragraph>
    )}

    <Button
      type="primary"
      size="large"
      block
      disabled={!googleReviewUrl}
      className={buttonStyles.primary}
      onClick={launchGoogleReview}
    >
      Open Google Review <ArrowRight aria-hidden="true" size={20} style={{ flexShrink: 0 }} />
    </Button>
    {awaitingGoogleReturn && <Typography.Paragraph type="secondary" className="mt-4">Return to this tab when you’re finished on Google.</Typography.Paragraph>}
  </div>
)}



        {error &&

          (transient ? (

            <Typography.Paragraph

              role="status"

              type="secondary"

              className="mt-5"

            >

              AI is busy right now. Please try again.

            </Typography.Paragraph>

          ) : (

            <Alert

              className="mt-5"

              type="error"

              showIcon={step !== 2}

              title={error}

            />

          ))}



        {step < 5 && (

          <Button

            className={`${buttonStyles.primary} ${step === 2 ? "" : "mt-6"}`}

            type="primary"

            size="large"

            block

            style={{

              ...(step === 2 ? { marginTop: "auto" } : {}),

            }}

            loading={step === 2 ? false : busy}

            icon={

              step === 2 && busy ? (

                <LoaderCircle

                  size={18}

                  className="animate-spin"

                  aria-hidden="true"

                />

              ) : undefined

            }

            disabled={

              busy ||

              (step === 1 && !rating) ||

              (step === 2 && !selectedTags.length) ||

              (step === 3 && !selectedReview)

            }

            aria-label={

              step === 1

                ? "Next"

                : step === 2

                  ? "Generate Review Suggestions"

                  : step === 3

                    ? "Continue"

                    : "Continue to Google"

            }

            onClick={() => {

              if (step === 1) void next();

              else if (step === 2) void generate();

              else if (step === 3) void continueWithReview();

              else void openGoogle();

            }}

          >

            {step === 1

              ? "Next"

              : step === 2

                ? "Generate Review Suggestions"

                : step === 3

                  ? "Continue"

                  : "Continue to Google"}
            {!busy && <ArrowRight aria-hidden="true" size={20} style={{ flexShrink: 0 }} />}
          </Button>

        )}



        {step < 5 && (

          <Typography.Paragraph

            type="secondary"

            style={{

              fontSize: 12,

              marginTop: step === 2 ? 12 : 24,

              marginBottom: 0,

            }}

          >

            {step === 2 ? (

              <ShieldCheck

                size={13}

                style={{ display: "inline", verticalAlign: "middle" }}

                aria-hidden="true"

              />

            ) : (

              <SafetyOutlined />

            )}{" "}

            Nothing is posted automatically.

          </Typography.Paragraph>

        )}

      </Card>

    </main>

  );

}
