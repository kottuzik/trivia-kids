// Decorative flat-vector scene for the home screen: sky, clouds, hills and a smiling star.
export function HomeIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 200"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="home-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFEFFF" />
          <stop offset="1" stopColor="#F8FDFF" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" rx="24" fill="url(#home-sky)" />

      {/* Clouds */}
      <g fill="#FFFFFF">
        <ellipse cx="62" cy="44" rx="30" ry="13" />
        <ellipse cx="80" cy="36" rx="18" ry="14" />
        <ellipse cx="258" cy="58" rx="26" ry="11" />
        <ellipse cx="272" cy="51" rx="15" ry="12" />
      </g>

      {/* Doodles */}
      <path d="M232 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFB3D9" />
      <path d="M40 92l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5z" fill="#D6C8FF" />
      <path
        d="M270 98c6-8 12 4 18-4s12 4 18-4"
        fill="none"
        stroke="#A7C7FF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M16 140c5-7 10 3 15-4"
        fill="none"
        stroke="#FFB3D9"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Hills */}
      <path d="M0 150c50-40 110-40 170-8s110 20 150-6v40a24 24 0 0 1-24 24H24A24 24 0 0 1 0 176z" fill="#B8E3A0" />
      <path d="M0 172c60-26 130-26 190-4s100 10 130-4v12a24 24 0 0 1-24 24H24A24 24 0 0 1 0 176z" fill="#8FD07A" />

      {/* Plants */}
      <g fill="#3DBB8F">
        <path d="M36 176c-6-16-2-28 4-34 2 12 0 24-4 34z" />
        <path d="M44 176c0-14 6-22 14-26-2 10-6 20-14 26z" />
        <path d="M282 178c-4-14 0-24 6-30 1 10-1 20-6 30z" />
        <path d="M290 178c1-12 7-19 14-22-2 9-6 17-14 22z" />
      </g>

      {/* Smiling star */}
      <g transform="translate(160 112)">
        <ellipse cx="0" cy="58" rx="40" ry="6" fill="#2B2B2B" opacity="0.08" />
        <path
          d="M0-58l15.5 32.5 35.5 4.6-26 24.5 6.6 35.2L0 21.7-31.6 38.8l6.6-35.2-26-24.5 35.5-4.6z"
          fill="#FFD25E"
          stroke="#F2B53A"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <ellipse cx="-11" cy="-6" rx="3.6" ry="5" fill="#2B2B2B" />
        <ellipse cx="11" cy="-6" rx="3.6" ry="5" fill="#2B2B2B" />
        <ellipse cx="-20" cy="5" rx="5" ry="3" fill="#FFB3D9" />
        <ellipse cx="20" cy="5" rx="5" ry="3" fill="#FFB3D9" />
        <path d="M-8 6q8 8 16 0" fill="none" stroke="#2B2B2B" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
