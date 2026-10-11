export function FoodIcon() {
  return (
    <span className="reminder-badge" role="img" aria-label="יש להביא אוכל" title="יש להביא אוכל">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* lunchbox */}
        <path
          d="M4 10C4 8.3 5.3 7 7 7H17C18.7 7 20 8.3 20 10V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V10Z"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M9 7V5.5C9 4.7 9.7 4 10.5 4H13.5C14.3 4 15 4.7 15 5.5V7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M4 13H20" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    </span>
  );
}
