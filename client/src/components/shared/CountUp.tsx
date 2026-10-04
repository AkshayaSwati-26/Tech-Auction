import { useEffect, useState } from "react";

/** Animates from 0 to `value` over `duration` ms, starting after `delay` ms. */
export default function CountUp({
  value,
  duration = 900,
  delay = 0,
  format,
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const progress = Math.min(1, (t - start) / duration);
        setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return <span className="tabular-nums">{format ? format(display) : display}</span>;
}
