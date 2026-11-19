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

/**
 * A signed-in customer's open conversation, so it survives a reload or a new
 * visit. It used to be dropped on every page load, which meant an agent's reply
 * to someone who had left could only ever reach them by email.
 *
 * Only a pointer: the session id is no credential (reading it needs the
 * account's cookie). Tied to the user id so a shared browser never offers one
 * person's conversation to another.
 */
const USER_KEY = 'luvngift.userChat';

export function readUserChat(userId: string): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string; userId?: string };
    return parsed?.userId === userId && parsed.sessionId ? parsed.sessionId : null;
  } catch {
    return null;
  }
}

export function writeUserChat(userId: string, sessionId: string): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify({ userId, sessionId }));
  } catch {
    /* blocked storage: the chat works, it just will not be resumed */
  }
}

export function clearUserChat(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* nothing to do */
  }
}
