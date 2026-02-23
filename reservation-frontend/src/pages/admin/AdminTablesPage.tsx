import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { adminListAllRestaurants } from "../../api/restaurants.api";
import { adminListAllTables, createTable, setTableStatus, updateTable } from "../../api/tables.api";

export default function AdminTablesPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();

  if (!hasRole("ADMIN")) return <p>Access denied.</p>;

  const restaurantsQ = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: adminListAllRestaurants,
  });

  const [restaurantId, setRestaurantId] = useState("");
  const [tableNumber, setTableNumber] = useState("T1");
  const [capacity, setCapacity] = useState<number>(2);

  const tablesQ = useQuery({
    queryKey: ["admin-tables", restaurantId || "NONE"],
    queryFn: () => adminListAllTables(restaurantId),
    enabled: !!restaurantId,
  });

  const createM = useMutation({
    mutationFn: () => createTable({ restaurantId, tableNumber, capacity }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tables"] });
      setTableNumber("T1");
      setCapacity(2);
    },
  });

  const statusM = useMutation({
    mutationFn: (p: { id: string; isActive: boolean }) => setTableStatus(p.id, p.isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tables"] }),
  });

  const updateM = useMutation({
    mutationFn: (p: { id: string; tableNumber?: string; capacity?: number }) => {
      const { id, ...body } = p; // strip id before sending to the update API
      return updateTable(id, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tables"] }),
  });


  const tables = useMemo(() => tablesQ.data ?? [], [tablesQ.data]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Admin - Tables</h2>

      <label style={{ display: "grid", gap: 6, maxWidth: 520 }}>
        Select Restaurant
        <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} disabled={restaurantsQ.isLoading}>
          <option value="">Select</option>
          {restaurantsQ.data?.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.isActive ? "" : "(inactive)"}
            </option>
          ))}
        </select>
      </label>

      {restaurantId && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 10, maxWidth: 520 }}>
          <h3 style={{ margin: 0 }}>Create Table</h3>

          <label style={{ display: "grid", gap: 6 }}>
            Table Number
            <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Capacity
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </label>

          <button disabled={!tableNumber.trim() || createM.isPending} onClick={() => createM.mutate()}>
            {createM.isPending ? "Creating..." : "Create"}
          </button>

          {createM.isError && <p style={{ color: "crimson" }}>Create failed</p>}
        </div>
      )}

      {restaurantId && (
        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Tables</h3>
          {tablesQ.isLoading && <p>Loading...</p>}
          {tablesQ.isError && <p style={{ color: "crimson" }}>Failed to load</p>}

          {tables.map((t: any) => (
            <TableRow
              key={t.id}
              t={t}
              busy={statusM.isPending || updateM.isPending}
              onToggle={(isActive) => statusM.mutate({ id: t.id, isActive })}
              onUpdate={(patch) => updateM.mutate({ id: t.id, ...patch })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TableRow({
  t,
  busy,
  onToggle,
  onUpdate,
}: {
  t: any;
  busy: boolean;
  onToggle: (isActive: boolean) => void;
  onUpdate: (patch: { tableNumber?: string; capacity?: number }) => void;
}) {
  const [num, setNum] = useState<string>(t.tableNumber ?? "");
  const [cap, setCap] = useState<number>(Number(t.capacity ?? 1));

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div><b>{t.tableNumber}</b> (cap {t.capacity})</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>{t.id}</div>
          <div>Status: <b style={{ color: t.isActive ? "green" : "crimson" }}>{t.isActive ? "ACTIVE" : "INACTIVE"}</b></div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={busy} onClick={() => onToggle(!t.isActive)}>
            {t.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Table Number
          <input value={num} onChange={(e) => setNum(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Capacity
          <input type="number" min={1} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
        </label>

        <button disabled={busy || !num.trim()} onClick={() => onUpdate({ tableNumber: num, capacity: cap })}>
          Save
        </button>
      </div>
    </div>
  );
}
