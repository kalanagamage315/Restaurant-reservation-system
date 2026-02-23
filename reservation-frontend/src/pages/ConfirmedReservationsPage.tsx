import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { adminListAllRestaurants, getRestaurantById } from "../api/restaurants.api";
import { checkoutReservationApi, listReservations } from "../api/reservations.api";
import { listTablesByRestaurant } from "../api/tables.api";

function toYYYYMMDDLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ConfirmedReservationsPage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();

  const isAdmin = hasRole("ADMIN");
  const isStaff = hasRole("STAFF");

  const staffRestaurantId = (user as any)?.restaurantId ?? "";

  const [restaurantId, setRestaurantId] = useState<string>(isStaff ? staffRestaurantId : "");
  const [date, setDate] = useState<string>(toYYYYMMDDLocal(new Date()));
  const [tableFilter, setTableFilter] = useState<string>(""); // "" = All

  // Admin: restaurants dropdown
  const restaurantsQ = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: adminListAllRestaurants,
    enabled: isAdmin,
  });

  const restaurants = useMemo(() => restaurantsQ.data ?? [], [restaurantsQ.data]);

  // Staff: restaurant name
  const staffRestaurantQ = useQuery({
    queryKey: ["restaurant-by-id", staffRestaurantId],
    queryFn: () => getRestaurantById(staffRestaurantId),
    enabled: isStaff && !!staffRestaurantId,
  });

  const selectedRestaurantName = isStaff
    ? staffRestaurantQ.data?.name ?? staffRestaurantId
    : restaurants.find((r: any) => r.id === restaurantId)?.name ?? "";

  const activeRestaurantId = isStaff ? staffRestaurantId : restaurantId;
  const canFetch = !!date && !!activeRestaurantId;

  // Load tables to support both the filter dropdown and tableId → tableNumber mapping.
  const tablesQ = useQuery({
    queryKey: ["tables", activeRestaurantId],
    queryFn: () => listTablesByRestaurant(activeRestaurantId),
    enabled: !!activeRestaurantId,
  });

  const tableIdToNumber = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of (tablesQ.data ?? []) as any[]) {
      map.set(t.id, t.tableNumber);
    }
    return map;
  }, [tablesQ.data]);

  // Fetch all CONFIRMED reservations for the selected restaurant (date filtering is done client-side).
  const confirmedRawQ = useQuery({
    queryKey: ["reservations", "CONFIRMED", activeRestaurantId],
    queryFn: () => listReservations({ status: "CONFIRMED", restaurantId: activeRestaurantId }),
    enabled: !!activeRestaurantId,
  });

  // Enrich raw reservations with resolved tableNumber, then filter by the locally selected date.
  const allForDate = useMemo(() => {
    const raw = (confirmedRawQ.data ?? []) as any[];

    const enriched = raw.map((r) => {
      const tableNumber = r.tableId ? tableIdToNumber.get(r.tableId) ?? null : null;
      return { ...r, tableNumber };
    });

    return enriched.filter((r) => {
      const d = new Date(r.reservedAt);
      return toYYYYMMDDLocal(d) === date;
    });
  }, [confirmedRawQ.data, tableIdToNumber, date]);

  // Table dropdown options are derived from the tables list, not the confirmed reservations.
  const tableOptions = useMemo(() => {
    const nums = (tablesQ.data ?? []).map((t: any) => String(t.tableNumber ?? "").trim()).filter(Boolean);
    return Array.from(new Set(nums)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [tablesQ.data]);

  // Apply the selected table filter client-side.
  const list = useMemo(() => {
    if (!tableFilter) return allForDate;
    const tf = tableFilter.trim().toLowerCase();
    return allForDate.filter((r: any) => String(r.tableNumber ?? "").toLowerCase() === tf);
  }, [allForDate, tableFilter]);

  // Mutation to check out a reservation and free its table.
  const checkoutM = useMutation({
    mutationFn: (reservationId: string) => checkoutReservationApi(reservationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", "CONFIRMED", activeRestaurantId] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Confirmed Reservations</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          maxWidth: 1100,
        }}
      >
        {/* Restaurant selection */}
        <label style={{ display: "grid", gap: 6 }}>
          Restaurant
          {isStaff ? (
            <input value={selectedRestaurantName || "Not Assigned"} disabled />
          ) : (
            <select
              value={restaurantId}
              onChange={(e) => {
                setRestaurantId(e.target.value);
                setTableFilter("");
              }}
            >
              <option value="">Select restaurant</option>
              {restaurants.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isActive ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          )}
        </label>

        {/* Date selection */}
        <label style={{ display: "grid", gap: 6 }}>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTableFilter("");
            }}
          />
        </label>

        {/* Table filter */}
        <label style={{ display: "grid", gap: 6 }}>
          Table
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} disabled={!canFetch}>
            <option value="">All tables</option>
            {tableOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!canFetch && (
        <p style={{ color: "crimson" }}>
          {isStaff ? "You are not assigned to a restaurant yet." : "Please select a restaurant."}
        </p>
      )}

      {(confirmedRawQ.isLoading || tablesQ.isLoading) && canFetch && <p>Loading...</p>}
      {(confirmedRawQ.isError || tablesQ.isError) && canFetch && (
        <p style={{ color: "crimson" }}>
          Failed to load data
        </p>
      )}

      {!confirmedRawQ.isLoading && canFetch && list.length === 0 && (
        <p>No confirmed reservations for this date{tableFilter ? ` (Table ${tableFilter}).` : "."}</p>
      )}

      {checkoutM.isError && (
        <p style={{ color: "crimson" }}>
          Checkout failed:{" "}
          {(checkoutM.error as any)?.response?.data?.message ??
            (checkoutM.error as any)?.message ??
            "Unknown error"}
        </p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {list.map((r: any) => {
          const isCheckedOut = !!r.checkedOutAt;

          return (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{r.customer?.fullName ?? "—"}</b> ({r.customer?.email ?? "—"})
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    <b>Status:</b> {r.status}
                  </div>

                  <button
                    disabled={checkoutM.isPending || isCheckedOut || !r.tableId}
                    onClick={() => checkoutM.mutate(r.id)}
                    title={!r.tableId ? "No table assigned" : isCheckedOut ? "Already checked out" : "Free table"}
                  >
                    {isCheckedOut ? "Checked Out" : checkoutM.isPending ? "Freeing..." : "Free Table"}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 13 }}>
                <b>Reserved At:</b> {new Date(r.reservedAt).toLocaleString()}
              </div>

              <div style={{ fontSize: 13 }}>
                <b>Guests:</b> {r.guests}
              </div>

              <div style={{ fontSize: 13 }}>
                <b>Table:</b> {r.tableNumber ?? "—"}
              </div>

              <div style={{ fontSize: 13 }}>
                <b>Customer Phone:</b> {r.effectivePhone ?? "—"}
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                <b>Checkout:</b> {r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleString() : "Not yet"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
