type LogoCsRoomProps = {
  size?: number;
  className?: string;
};

export default function LogoCsRoom({ size = 26, className }: LogoCsRoomProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="CS Room"
      className={className}
    >
      <defs>
        <linearGradient id="csroom-fold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ebe4d2" />
          <stop offset="1" stopColor="#fbecd0" />
        </linearGradient>
      </defs>
      <path d="M6 4 Q4 4 4 6 L4 34 Q4 36 6 36 L26 36 L36 26 L36 6 Q36 4 34 4 Z" fill="#1f4e79" />
      <path d="M36 26 L26 26 Q26 36 26 36 Z" fill="url(#csroom-fold)" />
      <path d="M26 26 L36 26" stroke="#1f4e79" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
      <path d="M26 26 L26 36" stroke="#1f4e79" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
      <rect x="9" y="22" width="14" height="1.2" rx="0.6" fill="#e85d3f" />
      <text x="9" y="20" fontFamily="Newsreader, Georgia, serif" fontWeight="700" fontSize="14" letterSpacing="-0.02em" fill="#fdfaf2">CS</text>
    </svg>
  );
}
