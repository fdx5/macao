import type { Traveler } from "./types";
export default function Avatar({
  person,
  size = 56,
}: {
  person: Traveler;
  size?: number;
}) {
  const a = person.animal;
  const fur =
    a === "fox"
      ? "#c88958"
      : a === "bear"
        ? "#b79a7a"
        : a === "cat"
          ? "#889992"
          : "#f7f3e8";
  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${person.name} ${a} 일러스트`}
    >
      <circle cx="50" cy="50" r="50" fill={person.color} />
      {a === "rabbit" ? (
        <>
          <ellipse
            cx="36"
            cy="31"
            rx="9"
            ry="23"
            fill={fur}
            transform="rotate(-12 36 31)"
          />
          <ellipse
            cx="64"
            cy="31"
            rx="9"
            ry="23"
            fill={fur}
            transform="rotate(12 64 31)"
          />
          <ellipse cx="36" cy="28" rx="4" ry="14" fill="#d9bfb7" />
          <ellipse cx="64" cy="28" rx="4" ry="14" fill="#d9bfb7" />
        </>
      ) : a === "cat" || a === "fox" ? (
        <>
          <path d="M21 50L23 18L45 36M55 36L78 18L79 50" fill={fur} />
          <path d="M27 35L29 25L39 37M62 37L73 25L73 36" fill="#e3c6b3" />
        </>
      ) : (
        <>
          <circle
            cx="26"
            cy="34"
            r="13"
            fill={a === "panda" ? "#4d5450" : fur}
          />
          <circle
            cx="74"
            cy="34"
            r="13"
            fill={a === "panda" ? "#4d5450" : fur}
          />
        </>
      )}
      <ellipse cx="50" cy="58" rx="32" ry="29" fill={fur} />
      {a === "panda" && (
        <>
          <ellipse
            cx="36"
            cy="54"
            rx="9"
            ry="11"
            fill="#4d5450"
            transform="rotate(20 36 54)"
          />
          <ellipse
            cx="64"
            cy="54"
            rx="9"
            ry="11"
            fill="#4d5450"
            transform="rotate(-20 64 54)"
          />
        </>
      )}
      {a === "fox" && (
        <path d="M21 53Q28 86 50 85Q72 86 79 53L50 68Z" fill="#f7f3e8" />
      )}
      <ellipse
        cx="50"
        cy="66"
        rx="14"
        ry="11"
        fill={a === "bear" ? "#dccab5" : "#f7f3e8"}
        opacity=".8"
      />
      <circle
        cx="37"
        cy="54"
        r="2.5"
        fill={a === "panda" ? "#fff" : "#36483f"}
      />
      <circle
        cx="63"
        cy="54"
        r="2.5"
        fill={a === "panda" ? "#fff" : "#36483f"}
      />
      <path d="M46 63Q50 60 54 63L50 67Z" fill="#54534d" />
      <path
        d="M50 67V71M44 71Q50 77 56 71"
        stroke="#54534d"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="29" cy="65" rx="5" ry="2.8" fill="#cd9f91" opacity=".55" />
      <ellipse cx="71" cy="65" rx="5" ry="2.8" fill="#cd9f91" opacity=".55" />
    </svg>
  );
}
