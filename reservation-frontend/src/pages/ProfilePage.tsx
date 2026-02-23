import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { changeMyPassword, getMyProfile, updateMyProfile } from "../api/profile.api";
import { useAuth } from "../auth/AuthContext";
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
  passwordRuleHint,
} from "../utils/validators";

export default function ProfilePage() {
  const { updateUser } = useAuth();

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Required only when the user is changing their email address.
  const [currentPwForEmail, setCurrentPwForEmail] = useState("");

  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  // password section
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOkMsg, setPwOkMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;

    setFullName(p.fullName ?? "");
    setEmail(p.email ?? "");
    setPhoneNumber(p.phoneNumber ?? "");
    setCurrentPwForEmail("");
  }, [profileQ.data]);

  const fullNameTrim = fullName.trim();
  const emailTrim = email.trim();
  const phoneTrim = phoneNumber.trim();

  const nameOk = useMemo(() => {
    if (!fullNameTrim) return true; // allow empty name
    return isValidName(fullNameTrim);
  }, [fullNameTrim]);

  const emailOk = useMemo(() => isValidEmail(emailTrim), [emailTrim]);

  // Phone is optional — allow blank or a valid formatted number.
  const phoneOk = useMemo(() => {
    if (!phoneTrim) return true;
    return isValidPhone(phoneTrim);
  }, [phoneTrim]);

  // Tracks whether the user has edited the email field.
  const emailChanged = useMemo(() => {
    const p = profileQ.data;
    if (!p) return false;
    return (p.email ?? "").trim().toLowerCase() !== emailTrim.toLowerCase();
  }, [profileQ.data, emailTrim]);

  // Tracks whether any profile field differs from the server value.
  const changed = useMemo(() => {
    const p = profileQ.data;
    if (!p) return false;

    const pName = (p.fullName ?? "").trim();
    const pEmail = (p.email ?? "").trim();
    const pPhone = (p.phoneNumber ?? "").trim();

    return pName !== fullNameTrim || pEmail !== emailTrim || pPhone !== phoneTrim;
  }, [profileQ.data, fullNameTrim, emailTrim, phoneTrim]);

  const canSave = useMemo(() => {
    if (!changed) return false;
    if (!emailOk || !phoneOk || !nameOk) return false;

    // Changing email requires the current password for server-side verification.
    if (emailChanged && !currentPwForEmail.trim()) return false;

    return true;
  }, [changed, emailOk, phoneOk, nameOk, emailChanged, currentPwForEmail]);

  const saveM = useMutation({
    mutationFn: () =>
      updateMyProfile({
        fullName: fullNameTrim ? fullNameTrim : null,
        email: emailTrim,
        phoneNumber: phoneTrim ? phoneTrim : null,
        currentPassword: emailChanged ? currentPwForEmail : undefined,
      } as any),
    onSuccess: (u: any) => {
      setSaveErr(null);
      setSaveOk("Profile updated.");

      // Sync updated profile data into the auth context and localStorage.
      updateUser({
        fullName: u.fullName ?? undefined,
        email: u.email,
        phoneNumber: u.phoneNumber ?? undefined,
        roles: u.roles,
        restaurantId: u.restaurantId ?? undefined,
      } as any);

      setCurrentPwForEmail("");
    },
    onError: (e: any) => {
      setSaveOk(null);
      setSaveErr(e?.response?.data?.message ?? e?.message ?? "Update failed");
    },
  });

  const pwValid = useMemo(() => {
    if (!currentPw.trim() || !newPw || !newPw2) return false;
    if (newPw !== newPw2) return false;
    return isValidPassword(newPw);
  }, [currentPw, newPw, newPw2]);

  const pwM = useMutation({
    mutationFn: () =>
      changeMyPassword({
        currentPassword: currentPw,
        newPassword: newPw,
      }),
    onSuccess: () => {
      setPwErr(null);
      setPwOkMsg("Password updated.");
      setCurrentPw("");
      setNewPw("");
      setNewPw2("");
    },
    onError: (e: any) => {
      setPwOkMsg(null);
      setPwErr(e?.response?.data?.message ?? e?.message ?? "Password change failed");
    },
  });

  if (profileQ.isLoading) return <p>Loading profile...</p>;
  if (profileQ.isError) return <p style={{ color: "crimson" }}>Failed to load profile</p>;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>
      <h2>My Profile</h2>

      {/* Profile info */}
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Profile Details</h3>

        <label style={{ display: "grid", gap: 6 }}>
          Full Name (optional)
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaveErr(null);
              setSaveOk(null);
            }}
          />
          {!nameOk && (
            <span style={{ color: "crimson", fontSize: 12 }}>
              Name can contain letters and spaces only.
            </span>
          )}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSaveErr(null);
              setSaveOk(null);
            }}
          />
          {!emailOk && <span style={{ color: "crimson", fontSize: 12 }}>Enter a valid email.</span>}
        </label>

        {/* Show the current-password field only when the user is changing their email */}
        {emailChanged && (
          <label style={{ display: "grid", gap: 6 }}>
            Current Password (required to change email)
            <input
              type="password"
              value={currentPwForEmail}
              onChange={(e) => {
                setCurrentPwForEmail(e.target.value);
                setSaveErr(null);
                setSaveOk(null);
              }}
              placeholder="Enter current password"
            />
          </label>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          Phone Number (optional)
          <input
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              setSaveErr(null);
              setSaveOk(null);
            }}
            placeholder="0XXXXXXXXX"
          />
          {!!phoneTrim && !phoneOk && (
            <span style={{ color: "crimson", fontSize: 12 }}>
              Phone must be 10 digits and start with 0.
            </span>
          )}
        </label>

        <button
          disabled={!canSave || saveM.isPending}
          onClick={() => {
            setSaveErr(null);
            setSaveOk(null);
            saveM.mutate();
          }}
          style={{ width: 160 }}
        >
          {saveM.isPending ? "Saving..." : "Save Changes"}
        </button>

        {saveErr && <p style={{ color: "crimson", margin: 0 }}>{saveErr}</p>}
        {saveOk && <p style={{ color: "green", margin: 0 }}>{saveOk}</p>}
      </div>

      {/* Password */}
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Change Password</h3>

        <label style={{ display: "grid", gap: 6 }}>
          Current Password
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          New Password
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <span style={{ fontSize: 12, opacity: 0.7 }}>{passwordRuleHint()}</span>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Confirm New Password
          <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
          {newPw && newPw2 && newPw !== newPw2 && (
            <span style={{ color: "crimson", fontSize: 12 }}>Passwords do not match.</span>
          )}
          {newPw && !isValidPassword(newPw) && (
            <span style={{ color: "crimson", fontSize: 12 }}>New password is too weak.</span>
          )}
        </label>

        <button
          disabled={!pwValid || pwM.isPending}
          onClick={() => {
            setPwErr(null);
            setPwOkMsg(null);
            pwM.mutate();
          }}
          style={{ width: 180 }}
        >
          {pwM.isPending ? "Updating..." : "Update Password"}
        </button>

        {pwErr && <p style={{ color: "crimson", margin: 0 }}>{pwErr}</p>}
        {pwOkMsg && <p style={{ color: "green", margin: 0 }}>{pwOkMsg}</p>}
      </div>
    </div>
  );
}