import type { ReactNode } from "react";

/** Small glass status pill with an optional pulsing dot. */
export default function Pill({ children, dot = false }: { children: ReactNode; dot?: boolean }) {
  return (
    <span className="d-pill">
      {dot && <span className="d-pill__dot" />}
      {children}
    </span>
  );
}
