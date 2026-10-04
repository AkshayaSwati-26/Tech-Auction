import { create } from "zustand";

export type Quality = "high" | "medium" | "low";

function readStored(): Quality {
  try {
    // An embedded preview (e.g. the admin's mini audience-display preview) always
    // renders at low tier so it doesn't run a second full 3D scene on the operator's laptop.
    if (new URLSearchParams(window.location.search).get("preview") === "1") return "low";
    const v = localStorage.getItem("tech-auction-quality");
    if (v === "high" || v === "medium" || v === "low") return v;
  } catch {
    /* ignore: private browsing / blocked storage */
  }
  return "high";
}

interface QualityState {
  quality: Quality;
  setQuality: (q: Quality) => void;
}

export const useQualityStore = create<QualityState>((set) => ({
  quality: readStored(),
  setQuality: (q) => {
    try {
      localStorage.setItem("tech-auction-quality", q);
    } catch {
      /* per-viewer convenience only; fine if it doesn't persist */
    }
    set({ quality: q });
  },
}));
