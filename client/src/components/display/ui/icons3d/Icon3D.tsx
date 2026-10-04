import IconStage, { type IconTier } from "./stage";
import { ICONS_3D as ICONS_A } from "./icons";
import { ICONS_3D_B } from "./icons2";
import { ICONS_3D_FLOW } from "./icons3";
import { ICONS_3D_BUILD } from "./icons4";

const ICONS_3D = { ...ICONS_A, ...ICONS_3D_B, ...ICONS_3D_FLOW, ...ICONS_3D_BUILD };

export const HAS_3D = (iconKey: string) => iconKey in ICONS_3D;

/** Mounts only the active icon; the canvas and its materials are disposed when it unmounts. */
export default function Icon3D({
  iconKey,
  tier,
  assemble,
  disc,
  active,
  startAt,
  light,
  sway,
}: {
  iconKey: string;
  tier: IconTier;
  assemble: boolean;
  disc?: boolean;
  active?: boolean;
  startAt?: number;
  light?: boolean;
  sway?: number;
}) {
  const Icon = ICONS_3D[iconKey];
  if (!Icon) return null;
  return (
    <IconStage tier={tier} assemble={assemble} disc={disc} active={active} startAt={startAt} light={light} sway={sway ?? (disc === false ? 0.34 : undefined)}>
      <Icon />
    </IconStage>
  );
}
