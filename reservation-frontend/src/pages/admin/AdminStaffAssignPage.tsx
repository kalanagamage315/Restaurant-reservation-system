import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { adminListAllRestaurants } from "../../api/restaurants.api";
import {
  adminListAllUsers,
  adminSetUserRoles,
  assignStaffRestaurant,
  type AnyUser,
  type Role,
} from "../../api/users.api";

function userPrimaryRole(u: AnyUser): Role {
  const r = u.roles?.[0]?.role;
  if (r === "ADMIN" || r === "STAFF" || r === "CUSTOMER") return r;
  return "CUSTOMER";
}

export default function AdminStaffAssignPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();

  if (!hasRole("ADMIN")) return <p>Access denied.</p>;

  const restaurantsQ = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: adminListAllRestaurants,
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminListAllUsers,
  });

  const restaurants = useMemo(() => restaurantsQ.data ?? [], [restaurantsQ.data]);
  const users = useMemo(() => usersQ.data ?? [], [usersQ.data]);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const selectedUser = users.find((u) => u.id === selectedUserId);

  const [selectedRole, setSelectedRole] = useState<Role>("CUSTOMER");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");

  function onPickUser(id: string) {
    setSelectedUserId(id);
    const u = users.find((x) => x.id === id);
    const role = u ? userPrimaryRole(u) : "CUSTOMER";
    setSelectedRole(role);
    setSelectedRestaurantId(u?.restaurantId ?? "");
  }

  const setRoleM = useMutation({
    mutationFn: (p: { userId: string; role: Role }) => adminSetUserRoles(p.userId, [p.role]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
  });

  const assignM = useMutation({
    mutationFn: (p: { userId: string; restaurantId: string | null }) =>
      assignStaffRestaurant(p.userId, p.restaurantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  
  const restaurantNameById = (id?: string | null) =>
    id ? restaurants.find((r: any) => r.id === id)?.name ?? "—" : "—";

  const currentRestaurantName = restaurantNameById(selectedUser?.restaurantId);

  const isStaffSelected = selectedRole === "STAFF";
  const selectedUserIsStaff = selectedUser ? userPrimaryRole(selectedUser) === "STAFF" : false;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Admin - Users / Roles / Staff Assignment</h2>

      {(restaurantsQ.isLoading || usersQ.isLoading) && <p>Loading...</p>}
      {(restaurantsQ.isError || usersQ.isError) && (
        <p style={{ color: "crimson" }}>Failed to load users or restaurants</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Users list */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>All Users</h3>

          {users.length === 0 && <p>No users found.</p>}

          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u) => {
              const role = userPrimaryRole(u);
              const phone = (u as any).phoneNumber ?? null; 
              const staffRestaurant =
                role === "STAFF" ? restaurantNameById(u.restaurantId) : null;

              return (
                <button
                  key={u.id}
                  onClick={() => onPickUser(u.id)}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 10,
                    border: selectedUserId === u.id ? "2px solid #333" : "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div>
                        <b>{u.fullName ?? "—"}</b>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{u.email}</div>

                      {/* Phone number */}
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Phone: {phone ? phone : "—"}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                      <b>{role}</b>
                    </div>
                  </div>

                  {/* Only show assigned restaurant if STAFF */}
                  {role === "STAFF" && (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                      Assigned Restaurant: {staffRestaurant ?? "—"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Details panel */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Manage Selected User</h3>

          {!selectedUser ? (
            <p>Select a user from the left.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div>
                  <b>Name:</b> {selectedUser.fullName ?? "—"}
                </div>
                <div>
                  <b>Email:</b> {selectedUser.email}
                </div>

                {/* Phone number */}
                <div>
                  <b>Phone:</b> {(selectedUser as any).phoneNumber ?? "—"}
                </div>

                <div>
                  <b>Current Role:</b> {userPrimaryRole(selectedUser)}
                </div>

                {/*Only show assigned restaurant if current role is STAFF */}
                {selectedUserIsStaff && (
                  <div>
                    <b>Assigned Restaurant:</b> {currentRestaurantName ?? "—"}
                  </div>
                )}
              </div>

              {/* Role select */}
              <label style={{ display: "grid", gap: 6 }}>
                Set Role
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <button
                disabled={setRoleM.isPending}
                onClick={() => setRoleM.mutate({ userId: selectedUser.id, role: selectedRole })}
              >
                {setRoleM.isPending ? "Updating Role..." : "Save Role"}
              </button>

              {setRoleM.isError && (
                <p style={{ color: "crimson" }}>
                  Role update failed:{" "}
                  {(setRoleM.error as any)?.response?.data?.message ??
                    (setRoleM.error as any)?.message ??
                    "Unknown error"}
                </p>
              )}

              <hr />

              {/* Only show assignment UI if STAFF (based on selected role dropdown) */}
              {!isStaffSelected ? (
                <p style={{ opacity: 0.75 }}>
                  Restaurant assignment is only for <b>STAFF</b> users.
                </p>
              ) : (
                <>
                  <label style={{ display: "grid", gap: 6 }}>
                    Assign to Restaurant
                    <select
                      value={selectedRestaurantId}
                      onChange={(e) => setSelectedRestaurantId(e.target.value)}
                      disabled={restaurantsQ.isLoading}
                    >
                      <option value="">Unassign</option>
                      {restaurants.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.isActive ? "" : "(inactive)"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    disabled={assignM.isPending}
                    onClick={() =>
                      assignM.mutate({
                        userId: selectedUser.id,
                        restaurantId: selectedRestaurantId ? selectedRestaurantId : null,
                      })
                    }
                  >
                    {assignM.isPending ? "Saving..." : "Save Assignment"}
                  </button>

                  {assignM.isError && (
                    <p style={{ color: "crimson" }}>
                      Assignment failed:{" "}
                      {(assignM.error as any)?.response?.data?.message ??
                        (assignM.error as any)?.message ??
                        "Unknown error"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
