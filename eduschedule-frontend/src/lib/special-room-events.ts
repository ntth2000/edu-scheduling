const EVENT_NAME = "eduschedule:special-rooms-changed";
const CHANNEL_NAME = "eduschedule-special-rooms";

function createChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function emitSpecialRoomsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  const channel = createChannel();
  if (!channel) return;
  channel.postMessage(EVENT_NAME);
  channel.close();
}

export function onSpecialRoomsChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, handler);
  const channel = createChannel();
  const onMessage = (e: MessageEvent) => {
    if (e.data === EVENT_NAME) handler();
  };
  channel?.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    channel?.removeEventListener("message", onMessage);
    channel?.close();
  };
}
