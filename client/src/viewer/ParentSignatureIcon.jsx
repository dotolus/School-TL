export function ParentSignatureIcon() {
  return (
    <span className="reminder-badge" role="img" aria-label="יש צורך באישור הורים" title="יש צורך באישור הורים">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 3H15L19 7V19C19 20.1 18.1 21 17 21H6C4.9 21 4 20.1 4 19V5C4 3.9 4.9 3 6 3Z"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M15 3V7H19" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path
          d="M6.5 17.5C7.5 16 8.5 17.5 9.3 16.5C10.1 15.5 10.5 17 11.5 16"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
