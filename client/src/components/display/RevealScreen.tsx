import LotLayout from "./ui/LotLayout";
import type { Lot } from "../../lib/types";

export default function RevealScreen({ lot, winners, uniform }: { lot: Lot; winners: number; uniform: boolean }) {
  return <LotLayout lot={lot} mode="reveal" winners={winners} uniform={uniform} />;
}
