import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
  passwordRuleHint,
} from "../utils/validators";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  // optional: keep phone only digits (still allows empty)
  const onPhoneChange = (v: string) => {
    const digitsOnly = v.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(digitsOnly);
  };

  const canSubmit = useMemo(() => !busy, [busy]);

  function validateAll() {
    const e: Record<string, string> = {};

    const name = fullName.trim();
    const em = email.trim();
    const ph = phoneNumber.trim();

    if (!name) e.fullName = "Full name is required";
    else if (!isValidName(name)) e.fullName = "Name can contain only letters and spaces";

    if (!em) e.email = "Email is required";
    else if (!isValidEmail(em)) e.email = "Please enter a valid email (example: name@gmail.com)";

    if (!ph) e.phoneNumber = "Phone number is required";
    else if (!isValidPhone(ph)) e.phoneNumber = "Phone must be 10 digits and start with 0 (e.g., 0771234567)";

    if (!password.trim()) e.password = "Password is required";
    else if (!isValidPassword(password)) e.password = passwordRuleHint();

    if (!confirmPassword.trim()) e.confirmPassword = "Confirm password is required";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";

    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit() {
    setErr(null);

    const ok = validateAll();
    if (!ok) return;

    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 460 }}>
      <h2>Register</h2>

      {/* Full Name */}
      <label style={{ display: "grid", gap: 6 }}>
        Full Name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => {
            // light validation on blur
            const v = fullName.trim();
            setFieldErr((prev) => ({
              ...prev,
              fullName: !v
                ? "Full name is required"
                : !isValidName(v)
                  ? "Name can contain only letters and spaces"
                  : "",
            }));
          }}
          placeholder="Sankha Perera"
          autoComplete="name"
        />
        {!!fieldErr.fullName && <small style={{ color: "crimson" }}>{fieldErr.fullName}</small>}
      </label>

      {/* Email */}
      <label style={{ display: "grid", gap: 6 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => {
            const v = email.trim();
            setFieldErr((prev) => ({
              ...prev,
              email: !v ? "Email is required" : !isValidEmail(v) ? "Please enter a valid email" : "",
            }));
          }}
          placeholder="name@example.com"
          autoComplete="email"
        />
        {!!fieldErr.email && <small style={{ color: "crimson" }}>{fieldErr.email}</small>}
      </label>

      {/* Phone */}
      <label style={{ display: "grid", gap: 6 }}>
        Phone Number
        <input
          value={phoneNumber}
          onChange={(e) => onPhoneChange(e.target.value)}
          onBlur={() => {
            const v = phoneNumber.trim();
            setFieldErr((prev) => ({
              ...prev,
              phoneNumber: !v
                ? "Phone number is required"
                : !isValidPhone(v)
                  ? "Phone must be 10 digits and start with 0"
                  : "",
            }));
          }}
          placeholder="0771234567"
          inputMode="numeric"
          maxLength={10}
        />
        {!!fieldErr.phoneNumber && <small style={{ color: "crimson" }}>{fieldErr.phoneNumber}</small>}
      </label>

      {/* Password */}
      <label style={{ display: "grid", gap: 6 }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => {
            setFieldErr((prev) => ({
              ...prev,
              password: !password.trim()
                ? "Password is required"
                : !isValidPassword(password)
                  ? passwordRuleHint()
                  : "",
            }));
          }}
          placeholder="********"
          autoComplete="new-password"
        />
        {!!fieldErr.password && <small style={{ color: "crimson" }}>{fieldErr.password}</small>}
      </label>

      {/* Confirm Password */}
      <label style={{ display: "grid", gap: 6 }}>
        Confirm Password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => {
            setFieldErr((prev) => ({
              ...prev,
              confirmPassword: !confirmPassword.trim()
                ? "Confirm password is required"
                : password !== confirmPassword
                  ? "Passwords do not match"
                  : "",
            }));
          }}
          placeholder="********"
          autoComplete="new-password"
        />
        {!!fieldErr.confirmPassword && (
          <small style={{ color: "crimson" }}>{fieldErr.confirmPassword}</small>
        )}
      </label>

      <button disabled={!canSubmit} onClick={onSubmit}>
        {busy ? "Creating..." : "Create account"}
      </button>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <p style={{ margin: 0 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
