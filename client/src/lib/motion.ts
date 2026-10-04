// Shared motion system (see STYLE_GUIDE.md "Motion").
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Springs are for card pops only. */
export const POP_SPRING = { type: "spring" as const, stiffness: 170, damping: 18 };
export const STAGGER = 0.09;
export const DURATION = 0.7;
