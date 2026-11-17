export function BrandGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="15.5" r="5.2" fill="#ffffff" />
      <ellipse
        cx="16"
        cy="15.5"
        rx="12.6"
        ry="4.2"
        stroke="#ffffff"
        strokeWidth="2.4"
        fill="none"
        transform="rotate(-22 16 15.5)"
      />
      <circle cx="27.7" cy="10.8" r="1.6" fill="#ffffff" />
    </svg>
  );
}