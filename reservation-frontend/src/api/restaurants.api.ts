import { http } from "./http";
import type { Restaurant } from "../types/api";

type RestaurantPayload = {
  name?: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  openDays?: string[];
};

// Returns only active restaurants (public access).
export function listRestaurants() {
  return http.get<Restaurant[]>("/restaurants").then((r) => r.data);
}

export function getRestaurantById(id: string) {
  return http.get<Restaurant>(`/restaurants/${id}`).then((r) => r.data);
}

// Returns all restaurants including inactive ones (admin only).
export function adminListAllRestaurants() {
  return http.get<Restaurant[]>("/restaurants/admin/all").then((r) => r.data);
}

export function createRestaurant(payload: RestaurantPayload & { name: string }) {
  return http.post<Restaurant>("/restaurants", payload).then((r) => r.data);
}

export function updateRestaurant(id: string, payload: RestaurantPayload) {
  return http.patch<Restaurant>(`/restaurants/${id}`, payload).then((r) => r.data);
}

export function setRestaurantStatus(id: string, isActive: boolean) {
  return http.patch<Restaurant>(`/restaurants/${id}/status`, { isActive }).then((r) => r.data);
}
