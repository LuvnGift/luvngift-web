'use client';

export function FooterChatButton() {
  return (
    <button
      className="text-left hover:text-foreground transition-colors"
      onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}
    >
      Live Chat
    </button>
  );
}
