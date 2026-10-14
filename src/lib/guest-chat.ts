/**
 * The guest's chat credential, kept in the browser.
 *
 * A visitor with no account owns their conversation by holding this key — the
 * API stores only its SHA-256 hash, so it cannot be recovered or looked up. If
 * the browser loses it, that conversation is gone for good and a new one
 * starts. That is the correct trade: the alternative is a server-side identity
 * for every anonymous visitor, which is a tracking mechanism we do not want.
 *
 * `localStorage` throws in a private window with site data blocked, so every
 * access is guarded and failure degrades to "no stored session" rather than
 * breaking the widget.
 */

const KEY = 'luvngift.guestChat';

export interface GuestChatSession {
  sessionId: string;
  guestKey: string;
}

export function readGuestChat(): GuestChatSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestChatSession>;
    if (!parsed?.sessionId || !parsed?.guestKey) return null;
    return { sessionId: parsed.sessionId, guestKey: parsed.guestKey };
  } catch {
    return null;
  }
}

export function writeGuestChat(session: GuestChatSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private browsing or blocked storage. The conversation still works for
    // this page view; it just will not survive a reload.
  }
}

export function clearGuestChat(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
