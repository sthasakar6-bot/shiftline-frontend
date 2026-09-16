// Matches .chat-composer textarea's max-height in App.css.
const MAX_HEIGHT_PX = 160;

// Grows a chat composer's textarea to fit its content up to a cap, and
// only switches on the scrollbar once content actually exceeds that cap --
// at rest, overflow stays hidden so a short box doesn't render an empty
// scroll track (with its up/down arrow buttons) for content that isn't
// actually scrollable yet.
export function autoResizeTextarea(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
}
