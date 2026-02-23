import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import {
  adminListAllRestaurants,
  createRestaurant,
  updateRestaurant,
  setRestaurantStatus,
} from "../../api/restaurants.api";
import type { Restaurant } from "../../types/api";

const ALL_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

type FormState = {
  name: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  openDays: string[];
};

const EMPTY_FORM: FormState = {
  name: "", address: "", phone: "",
  openTime: "", closeTime: "", openDays: [],
};

function fromRestaurant(r: Restaurant): FormState {
  return {
    name: r.name ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
    openTime: r.openTime ?? "",
    closeTime: r.closeTime ?? "",
    openDays: r.openDays ?? [],
  };
}

function DayPicker({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) {
  function toggle(day: string) {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {ALL_DAYS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: value.includes(d)
              ? "2px solid #7c3aed"
              : "1px solid rgba(255,255,255,0.2)",
            background: value.includes(d) ? "rgba(124,58,237,0.25)" : "transparent",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {DAY_SHORT[d]}
        </button>
      ))}
    </div>
  );
}

function FormFields({
  form,
  setForm,
}: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const field = (label: string, key: keyof FormState, type = "text", required = false) => (
    <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
      {label}{required ? " *" : ""}
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "inherit" }}
      />
    </label>
  );

  return (
    <>
      {field("Name", "name", "text", true)}
      {field("Address", "address")}
      {field("Phone", "phone", "tel")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {field("Open Time (HH:mm)", "openTime", "time")}
        {field("Close Time (HH:mm)", "closeTime", "time")}
      </div>
      <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
        Open Days
        <DayPicker
          value={form.openDays}
          onChange={(v) => setForm((p) => ({ ...p, openDays: v }))}
        />
      </label>
    </>
  );
}


export default function AdminRestaurantsPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();

  if (!hasRole("ADMIN")) return <p>Access denied.</p>;

  const restaurantsQ = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: adminListAllRestaurants,
  });

  const restaurants = useMemo(() => restaurantsQ.data ?? [], [restaurantsQ.data]);

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = restaurants.find((r: Restaurant) => r.id === selectedId) ?? null;

  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  function pickRestaurant(id: string) {
    setSelectedId(id);
    const r = restaurants.find((x: Restaurant) => x.id === id);
    setEditForm(r ? fromRestaurant(r) : EMPTY_FORM);
  }

  const createM = useMutation({
    mutationFn: () =>
      createRestaurant({
        name: createForm.name.trim(),
        address: createForm.address.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        openTime: createForm.openTime || undefined,
        closeTime: createForm.closeTime || undefined,
        openDays: createForm.openDays.length ? createForm.openDays : undefined,
      }),
    onSuccess: async () => {
      setCreateForm(EMPTY_FORM);
      await qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
  });

  const updateM = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No restaurant selected");
      return updateRestaurant(selectedId, {
        name: editForm.name.trim() || undefined,
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        openTime: editForm.openTime || undefined,
        closeTime: editForm.closeTime || undefined,
        openDays: editForm.openDays.length ? editForm.openDays : undefined,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
      await qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });

  const deactivateM = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No restaurant selected");
      return setRestaurantStatus(selectedId, false);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const activateM = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("No restaurant selected");
      return setRestaurantStatus(selectedId, true);
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const busy = createM.isPending || updateM.isPending || deactivateM.isPending || activateM.isPending;

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 16,
    background: "rgba(255,255,255,0.04)",
  };

  const errMsg = (m: any) =>
    m?.response?.data?.message ?? m?.message ?? "Unknown error";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2>🍴 Manage Restaurants</h2>

      {restaurantsQ.isLoading && <p>Loading…</p>}
      {restaurantsQ.isError && <p style={{ color: "crimson" }}>Failed to load</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        {/* LEFT: List */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>All Restaurants</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {restaurants.map((r: Restaurant) => (
              <button
                key={r.id}
                onClick={() => pickRestaurant(r.id)}
                style={{
                  textAlign: "left", padding: 10, borderRadius: 10, cursor: "pointer",
                  border: selectedId === r.id ? "2px solid #7c3aed" : "1px solid rgba(255,255,255,0.15)",
                  background: selectedId === r.id ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{r.name}</b>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{r.address ?? "—"}</div>
                    {r.openTime && r.closeTime && (
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        🕐 {r.openTime} – {r.closeTime}
                      </div>
                    )}
                    {r.openDays?.length ? (
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        🗓 {r.openDays.map((d) => DAY_SHORT[d] ?? d).join(", ")}
                      </div>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.isActive ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                    {r.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </button>
            ))}
            {restaurants.length === 0 && !restaurantsQ.isLoading && <p style={{ opacity: 0.6 }}>No restaurants.</p>}
          </div>
        </div>

        {/* RIGHT: Create + Edit */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Create */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Create Restaurant</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <FormFields form={createForm} setForm={setCreateForm} />
              <button disabled={busy || !createForm.name.trim()} onClick={() => createM.mutate()}>
                {createM.isPending ? "Creating…" : "➕ Create"}
              </button>
              {createM.isError && (
                <p style={{ color: "crimson", fontSize: 13 }}>
                  {errMsg((createM.error as any)?.response?.data ?? createM.error)}
                </p>
              )}
              {createM.isSuccess && <p style={{ color: "#4ade80", fontSize: 13 }}>Created ✓</p>}
            </div>
          </div>

          {/* Edit */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Edit / Deactivate</h3>
            {!selected ? (
              <p style={{ opacity: 0.6, fontSize: 13 }}>← Select a restaurant.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>ID: {selected.id}</div>
                <FormFields form={editForm} setForm={setEditForm} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button disabled={busy} onClick={() => updateM.mutate()}>
                    {updateM.isPending ? "Saving…" : "💾 Save Changes"}
                  </button>
                  {selected.isActive ? (
                    <button disabled={busy} onClick={() => deactivateM.mutate()} style={{ borderColor: "#f87171", color: "#f87171" }}>
                      {deactivateM.isPending ? "Deactivating…" : "Deactivate"}
                    </button>
                  ) : (
                    <button disabled={busy} onClick={() => activateM.mutate()} style={{ borderColor: "#4ade80", color: "#4ade80" }}>
                      {activateM.isPending ? "Activating…" : "Activate"}
                    </button>
                  )}
                </div>
                {updateM.isSuccess && <p style={{ color: "#4ade80", fontSize: 13 }}>Saved ✓</p>}
                {(updateM.isError || deactivateM.isError || activateM.isError) && (
                  <p style={{ color: "crimson", fontSize: 13 }}>
                    {errMsg((updateM.error as any) ?? (deactivateM.error as any) ?? (activateM.error as any))}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
