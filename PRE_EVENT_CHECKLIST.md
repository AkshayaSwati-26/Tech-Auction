# Pre-Event Checklist

Print this or keep it open on the organizer laptop the morning of the event.

## 10+ minutes before doors open

- [ ] Wake the backend: `curl https://your-backend-url/health` → should return `{"ok":true}`
      immediately. If it's slow (free-tier sleep), hit it again a minute later to confirm
      it's warm before relying on it.
- [ ] Open `/admin` on the organizer laptop, log in with the access code.
- [ ] Open `/display` on the projector laptop, full-screen it (`F11`).
- [ ] **Make one test sale**: reveal a lot, start it, record a result for a throwaway team,
      confirm the display updates within a second or two.
- [ ] **Correct that test sale** (Admin → History → Correct) so the real event starts clean,
      or use Settings → Reset Event Data if you'd rather wipe everything and reseed.
- [ ] Refresh `/admin` and `/display` once each — confirm both come back correctly (full
      state re-fetch on load, not just socket replay).
- [ ] Turn the display laptop's Wi-Fi off, wait 15 seconds, turn it back on. Confirm `/display`
      shows the "Connection lost" banner while offline and clears it automatically on
      reconnect, with no stale/wrong data left on screen.
- [ ] Export a backup (Settings → Diagnostics → Backup Now) and save it somewhere safe.
- [ ] Confirm the real team list and lot inventory are loaded (not demo data) — Admin → Teams
      / Lots.
- [ ] Decide and lock in: Pay-as-bid vs Uniform price, winners-per-lot, bid mode
      (Settings → Auction Rules / Multi-Winner Auction).

## During the event

- [ ] Keep the organizer laptop's Wi-Fi/wired connection stable — it's doing the authenticated
      writes; a drop just means a few seconds of "Reconnecting…" before it catches back up.
- [ ] If a second organizer joins with their own laptop, the sidebar will show "N admins
      connected" — that's expected and safe (every mutation still goes through the same
      backend, one commit at a time).
- [ ] If a sale looks wrong on `/display`, use **History → Correct** (reverses the exact
      sale/result, keeps the original row for audit) rather than trying to "undo" by selling
      again.
- [ ] Keep a paper backup of winning team + lot + price as a last-resort fallback — called out
      in the original design, still good advice.

## If something breaks

- Backend down / restarting: both `/admin` and `/display` reconnect automatically and refetch
  full state — nothing is lost (every sale commits to the database before anything broadcasts).
  Just wait a few seconds and confirm the connection pill goes green again.
- Display laptop needs a reboot: reopen `/display`, it rehydrates from the server immediately.
- Totally lost: restore from the last Backup Now export (ask whoever has deployment access to
  reseed from it) and keep running from the paper backup in the meantime.

## After the event

- [ ] Export a final backup (Settings → Diagnostics → Backup Now).
- [ ] Export sales.csv and wallets.csv (Admin → History / Teams → Export CSV) for records.
