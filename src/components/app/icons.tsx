const P = (d: string) => d;

// Icônes ligne minimalistes (stroke currentColor).
export const ICON_PATHS: Record<string, string[]> = {
  home: [P("M3 10.5 12 3l9 7.5"), P("M5 9.5V21h14V9.5")],
  calendar: [P("M3 8h18"), P("M7 3v4M17 3v4"), P("M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z")],
  wrench: [P("M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.7 2.7-2.3-.6-.6-2.3z")],
  users: [P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"), P("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"), P("M22 21v-2a4 4 0 0 0-3-3.9")],
  pool: [P("M2 15c1.2 0 1.2 1 2.5 1s1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1"), P("M2 19c1.2 0 1.2 1 2.5 1s1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1"), P("M7 15V5a2 2 0 0 1 4 0M15 15V6")],
  check: [P("M9 11l3 3L22 4"), P("M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11")],
  file: [P("M14 3v5h5"), P("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z")],
  receipt: [P("M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1z"), P("M9 8h6M9 12h6")],
  contract: [P("M14 3v5h5"), P("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"), P("M9 13l2 2 4-4")],
  team: [P("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"), P("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"), P("M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8")],
  backup: [P("M21 12a9 9 0 1 1-3-6.7L21 8"), P("M21 3v5h-5")],
  activity: [P("M22 12h-4l-3 9L9 3l-3 9H2")],
  settings: [P("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"), P("M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z")],
  bell: [P("M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"), P("M13.7 21a2 2 0 0 1-3.4 0")],
  logout: [P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"), P("M16 17l5-5-5-5M21 12H9")],
  map: [P("M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"), P("M9 3v15M15 6v15")],
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.home;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
