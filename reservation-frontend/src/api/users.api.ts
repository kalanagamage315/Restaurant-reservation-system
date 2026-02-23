import { http } from "./http";

export type Role = "ADMIN" | "STAFF" | "CUSTOMER";

export type AnyUser = {
  id: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  restaurantId?: string | null;
  isActive?: boolean;

  // backend returns: roles: [{ role: "STAFF" }]
  roles?: { role: Role }[];
};

export function listStaffUsers() {
  return http.get<AnyUser[]>("/users/staff").then((r) => r.data);
}

export function assignStaffRestaurant(userId: string, restaurantId: string | null) {
  return http.patch(`/users/${userId}/assign-restaurant`, { restaurantId }).then((r) => r.data);
}

// Returns all users (admin only).
export function adminListAllUsers() {
  return http.get<AnyUser[]>("/users/admin/all").then((r) => r.data);
}

// Replaces the current role set for a user (admin only).
export function adminSetUserRoles(userId: string, roles: Role[]) {
  return http.patch(`/users/${userId}/roles`, { roles }).then((r) => r.data);
}
