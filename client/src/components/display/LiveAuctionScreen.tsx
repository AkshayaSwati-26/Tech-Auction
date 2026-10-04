import LotLayout from "./ui/LotLayout";
import type { BidMode, Lot } from "../../lib/types";

export default function LiveAuctionScreen({ lot, bidMode, winners, uniform }: { lot: Lot; bidMode: BidMode; winners: number; uniform: boolean }) {
  return <LotLayout lot={lot} mode="live" winners={winners} bidMode={bidMode} uniform={uniform} />;
}
