/**
 * Inline validation message for a single form field.
 *
 * Renders nothing when there's no error, so it can sit unconditionally under
 * every input. `role="alert"` announces the message when it appears — a colour
 * change alone isn't perceivable to a screen reader.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}
