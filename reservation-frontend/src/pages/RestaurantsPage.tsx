import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listRestaurants } from "../api/restaurants.api";
import { useAuth } from "../auth/AuthContext";
import type { Restaurant } from "../types/api";

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

function HoursInfo({ r }: { r: Restaurant }) {
  const days = r.openDays?.length
    ? r.openDays.map((d) => DAY_LABELS[d] ?? d).join(", ")
    : null;
  const open = fmt12(r.openTime);
  const close = fmt12(r.closeTime);

  if (!days && !open) return null;

  return (
    <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
      {days && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          🗓 {days}
        </span>
      )}
      {open && close && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          🕐 {open} – {close}
        </span>
      )}
    </div>
  );
}

export default function RestaurantsPage() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["restaurants"], queryFn: listRestaurants });

  if (q.isLoading) return <p>Loading restaurants…</p>;
  if (q.isError) return <p style={{ color: "crimson" }}>Failed to load restaurants</p>;

  return (
    <div>
      <h2>🍽 Restaurants</h2>

      <div style={{ display: "grid", gap: 14 }}>
        {q.data?.map((r) => (
          <div
            key={r.id}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              backdropFilter: "blur(6px)",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{r.name}</h3>
              {r.address && (
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
                  📍 {r.address}
                </p>
              )}
              {r.phone && (
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.75 }}>
                  📞{" "}
                  <a href={`tel:${r.phone}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {r.phone}
                  </a>
                </p>
              )}
              <HoursInfo r={r} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {user ? (
                <Link
                  to={`/restaurants/${r.id}/reserve`}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(167,139,250,0.5)",
                    textDecoration: "none",
                    color: "#c4b5fd",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "rgba(167,139,250,0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reserve ›
                </Link>
              ) : (
                <Link
                  to="/login"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.2)",
                    textDecoration: "none",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  Login to Reserve
                </Link>
              )}
            </div>
          </div>
        ))}

        {q.data?.length === 0 && (
          <p style={{ opacity: 0.6 }}>No restaurants available at the moment.</p>
        )}
      </div>
    </div>
  );
}
