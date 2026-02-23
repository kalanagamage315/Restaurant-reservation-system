// src/utils/validators.ts

// Phone: exactly 10 digits starting with 0 (Sri Lanka local format).
export const isValidPhone = (v: string) => /^0\d{9}$/.test(v.trim());

// Email: basic RFC-compatible pattern sufficient for frontend validation.
export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// Name: letters and single spaces only — no digits or special characters.
export const isValidName = (v: string) =>
  /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(v.trim());
// allows "Sankha Perera", disallows leading/trailing/multiple spaces

// Password: enforces minimum strength requirements.
// - at least 8 chars
// - at least 1 uppercase
// - at least 1 lowercase
// - at least 1 digit
// - at least 1 special character
export const isValidPassword = (v: string) =>
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(v);

// Optional: show friendly message
export function passwordRuleHint() {
  return "Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character.";
}
