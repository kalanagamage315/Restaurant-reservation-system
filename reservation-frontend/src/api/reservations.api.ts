import { http } from "./http";
import type { Reservation } from "../types/api";

export function createReservation(payload: {
  restaurantId: string;
  guests: number;
  reservedAt: string; // ISO
  contactPhone?: string; // optional
}) {
  return http.post<Reservation>("/reservations", payload).then((r) => r.data);
}

// Primary export for fetching the current user's reservations.
export function myReservations() {
  return http.get<Reservation[]>("/reservations/me").then((r) => r.data);
}

// Alias kept for backwards compatibility with existing imports.
export function listMyReservations() {
  return myReservations();
}

export function cancelReservation(id: string) {
  return http.patch(`/reservations/${id}/cancel`).then((r) => r.data);
}

export function listReservations(params?: { status?: string; restaurantId?: string }) {
  return http.get<Reservation[]>("/reservations", { params }).then((r) => r.data);
}

/**
 * Confirms a reservation, optionally assigning a table.
 * Always uses "/confirm" path — comma-separated variants are normalised at the gateway.
 */
export function confirmReservation(id: string, tableId?: string) {
  return http.patch(`/reservations/${id}/confirm`, tableId ? { tableId } : {}).then((r) => r.data);
}

export function rejectReservation(id: string) {
  return http.patch(`/reservations/${id}/reject`).then((r) => r.data);
}

export function checkAvailability(params: {
  restaurantId: string;
  guests: number;
  reservedAt: string;
  durationMins?: number;
}) {
  return http.get("/reservations/availability", { params }).then((r) => r.data);
}

export function listConfirmedReservations(params: {
  restaurantId?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  tableNumber?: string;
}) {
  return http.get("/reservations/confirmed", { params }).then((r) => r.data);
}

// Checks out a confirmed reservation, freeing its assigned table.
export function checkoutReservationApi(id: string) {
  return http.patch(`/reservations/${id}/checkout`).then((r) => r.data);
}

/** Updates a PENDING reservation's date/time, guest count, or contact phone. */
export function updateReservation(
  id: string,
  payload: { reservedAt?: string; guests?: number; contactPhone?: string },
) {
  return http.patch<Reservation>(`/reservations/${id}`, payload).then((r) => r.data);
}
