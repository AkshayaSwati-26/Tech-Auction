import {
  Radar,
  Cctv,
  Plane,
  BrainCircuit,
  Cpu,
  RadioTower,
  Smartphone,
  Megaphone,
  ToggleRight,
  BatteryCharging,
  LayoutDashboard,
  ShieldCheck,
  Box,
  type LucideIcon,
} from "lucide-react";

export interface Motif {
  label: string;
  icon: LucideIcon;
  /** Icon tint in the admin lists. One accent for every technology. */
  primary: string;
}

const ACCENT = "#A78BFA";

/** Keyed by the lot's iconKey (stored in the `motif` column). */
export const MOTIFS: Record<string, Motif> = {
  sensors: { label: "Smart Sensors", icon: Radar, primary: ACCENT },
  cameras: { label: "Smart Cameras", icon: Cctv, primary: ACCENT },
  drone: { label: "Drone", icon: Plane, primary: ACCENT },
  prediction: { label: "Prediction Engine", icon: BrainCircuit, primary: ACCENT },
  edge: { label: "Edge Processing", icon: Cpu, primary: ACCENT },
  network: { label: "Communication Network", icon: RadioTower, primary: ACCENT },
  mobile: { label: "Mobile App & Alerts", icon: Smartphone, primary: ACCENT },
  signage: { label: "Public Address & Signage", icon: Megaphone, primary: ACCENT },
  switching: { label: "Switching & Gate Control", icon: ToggleRight, primary: ACCENT },
  battery: { label: "Battery & Backup Power", icon: BatteryCharging, primary: ACCENT },
  dashboard: { label: "Command Dashboard", icon: LayoutDashboard, primary: ACCENT },
  shield: { label: "Cybersecurity Shield", icon: ShieldCheck, primary: ACCENT },
  generic: { label: "Technology", icon: Box, primary: ACCENT },
};

export function getMotif(key: string): Motif {
  return MOTIFS[key] ?? MOTIFS.generic;
}
