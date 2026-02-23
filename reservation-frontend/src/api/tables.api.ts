import { http } from "./http";
import type { DiningTable } from "../types/api";

// Returns active tables for a given restaurant (public access).
export function listTablesByRestaurant(restaurantId: string) {
  return http.get<DiningTable[]>("/tables", { params: { restaurantId } }).then((r) => r.data);
}

// Returns all tables including inactive ones, filterable by restaurant (admin/staff).
export function adminListAllTables(restaurantId?: string) {
  return http
    .get<DiningTable[]>("/tables/admin/all", { params: restaurantId ? { restaurantId } : {} })
    .then((r) => r.data);
}

export function createTable(payload: { restaurantId: string; tableNumber: string; capacity: number }) {
  return http.post<DiningTable>("/tables", payload).then((r) => r.data);
}

export function updateTable(id: string, payload: { tableNumber?: string; capacity?: number }) {
  return http.patch<DiningTable>(`/tables/${id}`, payload).then((r) => r.data);
}

export function setTableStatus(id: string, isActive: boolean) {
  return http.patch<DiningTable>(`/tables/${id}/status`, { isActive }).then((r) => r.data);
}
