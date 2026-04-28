// Maps Supabase / Postgres errors to safe, user-friendly messages.
// Never expose raw `error.message` (may leak schema, table, or constraint names).

type AnyError = { code?: string; message?: string } | null | undefined;

const CODE_MAP: Record<string, string> = {
  "23505": "This already exists.",
  "23503": "Related record not found.",
  "23502": "Required information is missing.",
  "23514": "Some values are not allowed.",
  "42501": "You don't have permission to do that.",
  "PGRST301": "You don't have permission to do that.",
  "PGRST116": "Item not found.",
};

export function toUserMessage(error: AnyError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  // Log raw error for developers (not visible to end users in production logs UI).
  if (typeof console !== "undefined") console.error("[supabase error]", error);
  if (error.code && CODE_MAP[error.code]) return CODE_MAP[error.code];
  return fallback;
}
