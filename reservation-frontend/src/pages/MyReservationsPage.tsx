import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myReservations, cancelReservation, updateReservation } from "../api/reservations.api";
import { getRestaurantById } from "../api/restaurants.api";
import type { Reservation } from "../types/api";

// ── Status badge colour map ───────────────────────────────────────────────────

const statusColour: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  CONFIRMED: { bg: "rgba(52,211,153,0.15)", text: "#34d399" },
  CANCELLED: { bg: "rgba(156,163,175,0.12)", text: "#9ca3af" },
  REJECTED: { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

// ── Edit form state ───────────────────────────────────────────────────────────

interface EditState {
  reservedAt: string;
  guests: string;
  contactPhone: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyReservationsPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ reservedAt: "", guests: "", contactPhone: "" });
  const [editError, setEditError] = useState<string | null>(null);

  const myQ = useQuery({ queryKey: ["my-reservations"], queryFn: myReservations });

  const restaurantIds = useMemo(() => {
    return Array.from(new Set((myQ.data ?? []).map((r) => r.restaurantId)));
  }, [myQ.data]);

  const restaurantsQ = useQuery({
    queryKey: ["restaurants-by-ids", restaurantIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        restaurantIds.map(async (id) => {
          try { return await getRestaurantById(id); } catch { return null; }
        }),
      );
      const map = new Map<string, { id: string; name: string }>();
      for (const r of results) { if (r?.id) map.set(r.id, r as { id: string; name: string }); }
      return map;
    },
    enabled: restaurantIds.length > 0,
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateReservation>[1] }) =>
      updateReservation(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
      setEditingId(null);
      setEditError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as Error)?.message ?? "Update failed";
      setEditError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const list: Reservation[] = myQ.data ?? [];

  function openEdit(r: Reservation) {
    const dt = new Date(r.reservedAt);
    // to datetime-local input (YYYY-MM-DDTHH:mm)
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setEditForm({ reservedAt: local, guests: String(r.guests), contactPhone: r.contactPhone ?? "" });
    setEditError(null);
    setEditingId(r.id);
  }

  function submitEdit(id: string) {
    const guestsNum = parseInt(editForm.guests, 10);
    if (!editForm.reservedAt) { setEditError("Date/time is required"); return; }
    if (isNaN(guestsNum) || guestsNum < 1) { setEditError("Guests must be at least 1"); return; }

    const payload: Parameters<typeof updateReservation>[1] = {
      reservedAt: new Date(editForm.reservedAt).toISOString(),
      guests: guestsNum,
    };
    if (editForm.contactPhone.trim()) payload.contactPhone = editForm.contactPhone.trim();

    updateM.mutate({ id, payload });
  }

  return (
    <main
      style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px" }}
      aria-label="My Reservations"
    >
      <h1 style={{ color: "#fff", fontWeight: 700, fontSize: 22, marginBottom: 20 }}>
        📋 My Reservations
      </h1>

      {myQ.isLoading && <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</p>}
      {myQ.isError && (
        <p style={{ color: "#f87171" }} role="alert">Failed to load reservations.</p>
      )}
      {!myQ.isLoading && list.length === 0 && (
        <p style={{ color: "rgba(255,255,255,0.5)" }}>You have no reservations yet.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {list.map((r) => {
          const restaurant = restaurantsQ.data?.get(r.restaurantId);
          const colours = statusColour[r.status] ?? { bg: "rgba(255,255,255,0.05)", text: "#fff" };
          const isPending = r.status === "PENDING";
          const isEditing = editingId === r.id;

          return (
            <article
              key={r.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: "16px 18px",
                display: "grid",
                gap: 10,
              }}
            >
              {/* ── Card header ─────────────────────────────────────────── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>
                    🍽️ {restaurant?.name ?? r.restaurantId}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 3 }}>
                    {new Date(r.reservedAt).toLocaleString()} · {r.guests} guest{r.guests !== 1 ? "s" : ""}
                    {r.contactPhone ? ` · 📞 ${r.contactPhone}` : ""}
                  </div>
                  {r.tableId && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      Table assigned
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Status badge */}
                  <span style={{
                    background: colours.bg,
                    color: colours.text,
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {r.status}
                  </span>

                  {/* Edit button — only for PENDING */}
                  {isPending && !isEditing && (
                    <button
                      aria-label="Edit reservation"
                      onClick={() => openEdit(r)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(167,139,250,0.4)",
                        background: "rgba(167,139,250,0.12)",
                        color: "#a78bfa",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}

                  {/* Cancel button — only for PENDING */}
                  {isPending && (
                    <button
                      aria-label="Cancel reservation"
                      disabled={cancelM.isPending}
                      onClick={() => cancelM.mutate(r.id)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(248,113,113,0.3)",
                        background: "rgba(248,113,113,0.10)",
                        color: "#f87171",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: cancelM.isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      {cancelM.isPending ? "Cancelling…" : "✕ Cancel"}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Inline edit form ─────────────────────────────────────── */}
              {isEditing && (
                <section
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(167,139,250,0.25)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "grid",
                    gap: 12,
                  }}
                  aria-label="Edit reservation form"
                >
                  <div style={{ fontWeight: 600, color: "#a78bfa", fontSize: 13 }}>Edit Reservation</div>

                  {editError && (
                    <div role="alert" style={{ color: "#f87171", fontSize: 13 }}>{editError}</div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Date & Time</span>
                      <input
                        type="datetime-local"
                        value={editForm.reservedAt}
                        onChange={(e) => setEditForm((f) => ({ ...f, reservedAt: e.target.value }))}
                        aria-label="New reservation date and time"
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          fontSize: 13,
                          colorScheme: "dark",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Guests</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={editForm.guests}
                        onChange={(e) => setEditForm((f) => ({ ...f, guests: e.target.value }))}
                        aria-label="Number of guests"
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Contact Phone (optional)</span>
                    <input
                      type="tel"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))}
                      placeholder="+94771234567"
                      aria-label="Contact phone number"
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        fontSize: 13,
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditError(null); }}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updateM.isPending}
                      onClick={() => submitEdit(r.id)}
                      aria-label="Save changes"
                      style={{
                        padding: "7px 18px",
                        borderRadius: 999,
                        border: "none",
                        background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: updateM.isPending ? "not-allowed" : "pointer",
                        opacity: updateM.isPending ? 0.7 : 1,
                      }}
                    >
                      {updateM.isPending ? "Saving…" : "💾 Save changes"}
                    </button>
                  </div>
                </section>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
