import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRestaurants } from "../api/restaurants.api";
import { confirmReservation, listReservations, rejectReservation } from "../api/reservations.api";
import { listTablesByRestaurant } from "../api/tables.api";
import { useAuth } from "../auth/AuthContext";
import type { DiningTable, Reservation } from "../types/api";

export default function StaffReservationsPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();

  const isAdmin = hasRole("ADMIN");
  const isStaff = hasRole("STAFF");

  const [restaurantFilter, setRestaurantFilter] = useState<string>("");

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingRestaurantId, setConfirmingRestaurantId] = useState<string | null>(null);
  const [confirmingGuests, setConfirmingGuests] = useState<number>(0);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  if (!isAdmin && !isStaff) return <p>Access denied.</p>;

  const restaurantsQ = useQuery({
    queryKey: ["restaurants"],
    queryFn: listRestaurants,
  });

  const effectiveRestaurantId = useMemo(() => {
    if (!isAdmin) return undefined;
    return restaurantFilter || undefined;
  }, [isAdmin, restaurantFilter]);

  const pendingQ = useQuery<Reservation[]>({
    queryKey: ["reservations", "PENDING", effectiveRestaurantId ?? "ALL"],
    queryFn: () => listReservations({ status: "PENDING", restaurantId: effectiveRestaurantId }),
    enabled: true,
  });

  const tablesQ = useQuery<DiningTable[]>({
    queryKey: ["tables", confirmingRestaurantId],
    queryFn: () => listTablesByRestaurant(confirmingRestaurantId!),
    enabled: !!confirmingRestaurantId,
  });

  const filteredTables = useMemo(() => {
    const list = tablesQ.data ?? [];
    return list.filter((t) => t.isActive && t.capacity >= confirmingGuests);
  }, [tablesQ.data, confirmingGuests]);

  const confirmM = useMutation({
    mutationFn: (p: { id: string; tableId: string }) => confirmReservation(p.id, p.tableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      setConfirmingId(null);
      setConfirmingRestaurantId(null);
      setConfirmingGuests(0);
      setSelectedTableId("");
    },
  });

  const rejectM = useMutation({
    mutationFn: (id: string) => rejectReservation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const confirmError =
    (confirmM.error as any)?.response?.data?.message ??
    (confirmM.error as any)?.message ??
    null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>{isAdmin ? "Admin Reservations" : "Staff Reservations"}</h2>

      {/* Admin filter */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Filter by Restaurant:
            <select
              value={restaurantFilter}
              onChange={(e) => setRestaurantFilter(e.target.value)}
              disabled={restaurantsQ.isLoading}
            >
              <option value="">All (Pending)</option>
              {restaurantsQ.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {restaurantsQ.isError && (
            <span style={{ color: "crimson" }}>Failed to load restaurants</span>
          )}
        </div>
      )}

      {!isAdmin && (
        <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
          Staff view is locked to your assigned restaurant by backend.
        </p>
      )}

      <div>
        <h3 style={{ marginBottom: 8 }}>Pending Reservations</h3>

        {pendingQ.isLoading && <p>Loading pending reservations...</p>}
        {pendingQ.isError && (
          <p style={{ color: "crimson" }}>
            Failed to load pending reservations
            {` `}
            {(pendingQ.error as any)?.response?.data?.message
              ? `(${(pendingQ.error as any).response.data.message})`
              : ""}
          </p>
        )}

        {!pendingQ.isLoading && pendingQ.data && pendingQ.data.length === 0 && (
          <p>No pending reservations found.</p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {pendingQ.data?.map((res) => {
            const restaurantName = res.restaurant?.name ?? "(Unknown restaurant)";
            const phoneToShow = res.effectivePhone ?? res.contactPhone ?? res.customer?.phoneNumber ?? null;

            return (
              <div
                key={res.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 14,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div><b>Restaurant:</b> {restaurantName}</div>
                    <div><b>Reservation ID:</b> {res.id}</div>

                    {/* Customer contact details */}
                    <div>
                      <b>Customer Phone:</b> {phoneToShow ?? "—"}
                      {res.contactPhone ? <span style={{ opacity: 0.7 }}> (entered)</span> : null}
                    </div>

                    <div><b>Customer Name:</b> {res.customer?.fullName ?? "—"}</div>
                    <div><b>Customer Email:</b> {res.customer?.email ?? "—"}</div>

                    <div><b>Guests:</b> {res.guests}</div>
                    <div><b>Reserved At:</b> {new Date(res.reservedAt).toLocaleString()}</div>
                    <div><b>Status:</b> {res.status}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <button
                      onClick={() => {
                        setConfirmingId(res.id);
                        setConfirmingRestaurantId(res.restaurantId);
                        setConfirmingGuests(res.guests);
                        setSelectedTableId("");
                      }}
                    >
                      Confirm
                    </button>

                    <button disabled={rejectM.isPending} onClick={() => rejectM.mutate(res.id)}>
                      {rejectM.isPending ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>

                {/* Confirm UI */}
                {confirmingId === res.id && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        Table:
                        <select
                          value={selectedTableId}
                          onChange={(e) => setSelectedTableId(e.target.value)}
                          disabled={tablesQ.isLoading}
                        >
                          <option value="">Select a table</option>
                          {filteredTables.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.tableNumber} (cap {t.capacity})
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        disabled={!selectedTableId || confirmM.isPending}
                        onClick={() => confirmM.mutate({ id: res.id, tableId: selectedTableId })}
                      >
                        {confirmM.isPending ? "Confirming..." : "Confirm with Table"}
                      </button>

                      <button
                        onClick={() => {
                          setConfirmingId(null);
                          setConfirmingRestaurantId(null);
                          setConfirmingGuests(0);
                          setSelectedTableId("");
                        }}
                      >
                        Cancel
                      </button>

                      {tablesQ.isError && (
                        <span style={{ color: "crimson" }}>Failed to load tables</span>
                      )}
                    </div>

                    {confirmError && <span style={{ color: "crimson" }}>{confirmError}</span>}

                    {tablesQ.isLoading && <span style={{ opacity: 0.7 }}>Loading tables...</span>}
                    {!tablesQ.isLoading && filteredTables.length === 0 && (
                      <span style={{ color: "crimson" }}>
                        No active tables with enough capacity for {confirmingGuests} guests.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
