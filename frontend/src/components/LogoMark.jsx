export default function LogoMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="15.5" stroke="var(--color-ink)" strokeWidth="1" />
      <path
        d="M10 20.5V11.5C10 11.5 12 9.5 16 9.5C20 9.5 22 11.5 22 11.5V20.5C22 20.5 20 22.5 16 22.5C12 22.5 10 20.5 10 20.5Z"
        stroke="var(--color-ink)"
        strokeWidth="1.1"
      />
      <line x1="13" y1="13" x2="19" y2="13" stroke="var(--color-ink)" strokeWidth="1" />
      <line x1="13" y1="16" x2="19" y2="16" stroke="var(--color-ink)" strokeWidth="1" />
      <line x1="13" y1="19" x2="17" y2="19" stroke="var(--color-ink)" strokeWidth="1" />
    </svg>
  );
}
