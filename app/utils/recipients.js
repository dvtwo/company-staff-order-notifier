const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmail(email) {
  return SIMPLE_EMAIL_REGEX.test(String(email || "").trim());
}

export function parseRecipientEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .filter((email, index, list) => list.indexOf(email) === index)
    .filter(isValidEmail);
}
