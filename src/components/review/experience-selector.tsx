"use client";
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

export function ExperienceSelector({
  rating,
  disabled,
  onChange,
}: {
  rating: number;
  disabled: boolean;
  onChange: (rating: number) => void;
}) {
  return (
    <div
      className="grid grid-cols-5 gap-1"
      role="group"
      aria-label="Experience level"
    >
      {experiences.map((experience) => (
        <button
          type="button"
          key={experience.rating}
          className="experience-choice"
          aria-label={experience.label}
          aria-pressed={rating === experience.rating}
          disabled={disabled}
          onClick={() => onChange(experience.rating)}
        >
          <ExperienceFace rating={experience.rating} color={experience.color} />
          <span>{experience.label}</span>
        </button>
      ))}
    </div>
  );
}
