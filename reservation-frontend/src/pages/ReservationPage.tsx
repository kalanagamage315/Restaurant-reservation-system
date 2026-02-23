import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getRestaurantById } from "../api/restaurants.api";
import { createReservation } from "../api/reservations.api";
import type { Restaurant } from "../types/api";
import { isValidPhone } from "../utils/validators";

const DAY_OF_WEEK = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

function fmt12(hhmm: string | null | undefined) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Validate a datetime-local value against a restaurant's open days & hours.
 *  Returns an error string, or null when valid. */
function validateAgainstHours(dtLocal: string, r: Restaurant): string | null {
  if (!dtLocal) return null;
  const date = new Date(dtLocal);
  if (Number.isNaN(date.getTime())) return "Invalid date/time.";

  // Day check
  if (r.openDays && r.openDays.length > 0) {
    const dayName = DAY_OF_WEEK[date.getDay()]; // 0=Sunday
    if (!r.openDays.includes(dayName)) {
      const readable = r.openDays.map((d) => DAY_LABELS[d] ?? d).join(", ");
      return `This restaurant is only open on: ${readable}.`;
    }
  }

  // Time check
  if (r.openTime && r.closeTime) {
    const [oh, om] = r.openTime.split(":").map(Number);
    const [ch, cm] = r.closeTime.split(":").map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    const selectedMins = date.getHours() * 60 + date.getMinutes();

    if (selectedMins < openMins || selectedMins >= closeMins) {
      return `This restaurant is open ${fmt12(r.openTime)} – ${fmt12(r.closeTime)} only.`;
    }
  }

  return null;
}

export default function ReservationPage() {
  const { id: restaurantId } = useParams();
  const nav = useNavigate();

  const [guests, setGuests] = useState<number>(2);
  const [dtLocal, setDtLocal] = useState<string>(""); // YYYY-MM-DDTHH:mm
  const [contactPhone, setContactPhone] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const restaurantQ = useQuery<Restaurant>({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurantById(restaurantId!),
    enabled: !!restaurantId,
  });

  const r = restaurantQ.data;

  // Live validation against open hours/days
  const hoursError = useMemo(
    () => (r && dtLocal ? validateAgainstHours(dtLocal, r) : null),
    [dtLocal, r],
  );

  const reservedAtIso = useMemo(() => {
    if (!dtLocal) return "";
    const d = new Date(dtLocal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [dtLocal]);

  const phoneTrim = contactPhone.trim();
  const phoneOk = isValidPhone(phoneTrim);

  const canSubmit = !!reservedAtIso && guests >= 1 && phoneOk && !hoursError;

  const createM = useMutation({
    mutationFn: () =>
      createReservation({
        restaurantId: restaurantId!,
        guests,
        reservedAt: reservedAtIso,
        contactPhone: phoneTrim,
      }),
    onSuccess: () => nav("/my-reservations"),
    onError: (e: any) => setErr(e?.response?.data?.message ?? "Reservation failed"),
  });

  if (!restaurantId) return <p style={{ color: "crimson" }}>Invalid restaurant</p>;
  if (restaurantQ.isLoading) return <p>Loading restaurant…</p>;
  if (restaurantQ.isError) return <p style={{ color: "crimson" }}>Failed to load restaurant</p>;
  if (!r) return <p style={{ color: "crimson" }}>Restaurant not found</p>;

  const openDaysReadable = r.openDays?.length
    ? r.openDays.map((d) => DAY_LABELS[d] ?? d).join(", ")
    : null;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
      <h2>Place a Reservation</h2>

      {/* Restaurant info card */}
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "grid",
          gap: 4,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>{r.name}</h3>
        {r.address && <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>📍 {r.address}</p>}
        {r.phone && (
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
            📞 <a href={`tel:${r.phone}`} style={{ textDecoration: "none", color: "inherit" }}>{r.phone}</a>
          </p>
        )}
        {openDaysReadable && (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>🗓 {openDaysReadable}</p>
        )}
        {r.openTime && r.closeTime && (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>
            🕐 {fmt12(r.openTime)} – {fmt12(r.closeTime)}
          </p>
        )}
      </div>

      {/* Form */}
      <label style={{ display: "grid", gap: 6 }}>
        Number of guests
        <input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Date &amp; Time
        <input
          type="datetime-local"
          value={dtLocal}
          onChange={(e) => { setDtLocal(e.target.value); setErr(null); }}
        />
        {hoursError && (
          <span style={{ color: "#fbbf24", fontSize: 12 }}>⚠ {hoursError}</span>
        )}
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Contact Phone (required)
        <input
          type="tel"
          placeholder="07XXXXXXXX"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        {!!phoneTrim && !phoneOk && (
          <span style={{ color: "crimson", fontSize: 12 }}>
            Phone must be 10 digits and start with 0.
          </span>
        )}
      </label>

      <button
        disabled={!canSubmit || createM.isPending}
        onClick={() => {
          setErr(null);
          if (!phoneOk) { setErr("Please enter a valid phone number (10 digits, starts with 0)."); return; }
          if (hoursError) { setErr(hoursError); return; }
          createM.mutate();
        }}
      >
        {createM.isPending ? "Placing…" : "Reserve"}
      </button>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <p style={{ fontSize: 12, opacity: 0.6 }}>
        After placing, you will be redirected to <b>My Reservations</b>.
      </p>
    </div>
  );
}