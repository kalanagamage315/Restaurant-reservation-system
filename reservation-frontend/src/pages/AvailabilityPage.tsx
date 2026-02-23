import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listRestaurants } from "../api/restaurants.api";
import { checkAvailability } from "../api/reservations.api";

export default function AvailabilityPage() {
  const [restaurantId, setRestaurantId] = useState("");
  const [guests, setGuests] = useState<number>(2);
  const [reservedAt, setReservedAt] = useState<string>("");

  const restaurantsQ = useQuery({
    queryKey: ["restaurants"],
    queryFn: listRestaurants,
  });

  const canCheck = useMemo(() => {
    return Boolean(restaurantId && guests > 0 && reservedAt);
  }, [restaurantId, guests, reservedAt]);

  const availabilityQ = useQuery({
    queryKey: ["availability", restaurantId, guests, reservedAt],
    queryFn: () =>
      checkAvailability({
        restaurantId,
        guests,
        reservedAt,
      }),
    enabled: canCheck, 
  });

  const errText =
    (availabilityQ.error as any)?.response?.data?.message ??
    (availabilityQ.error as any)?.message ??
    null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Check Availability</h2>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Restaurant
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            disabled={restaurantsQ.isLoading}
          >
            <option value="">Select restaurant</option>
            {restaurantsQ.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Guests
          <input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Date & Time (ISO / datetime-local)
          <input
            type="datetime-local"
            value={reservedAt}
            onChange={(e) => setReservedAt(e.target.value)}
          />
        </label>
      </div>

      {/*  React Query v5: no isIdle */}
      {!canCheck && <p style={{ opacity: 0.7 }}>Select restaurant, guests, and date/time to check availability.</p>}

      {availabilityQ.isPending && canCheck && <p>Checking availability...</p>}
      {availabilityQ.isError && <p style={{ color: "crimson" }}>{errText ?? "Failed to check availability"}</p>}

      {availabilityQ.isSuccess && (
        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Available Tables</h3>

          {(availabilityQ.data?.length ?? 0) === 0 ? (
            <p>No tables available for this time slot.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {availabilityQ.data.map((t: any) => (
                <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                  <div>
                    <b>{t.tableNumber}</b>
                  </div>
                  <div>Capacity: {t.capacity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
