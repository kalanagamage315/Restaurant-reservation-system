import { http } from "./http";

export type MyProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  roles: string[];
  restaurantId: string | null;
};

export function getMyProfile() {
  return http.get<MyProfile>("/users/profile").then((r) => r.data);
}

export function updateMyProfile(payload: {
  fullName?: string | null;
  phoneNumber?: string | null;
  email?: string;
  currentPassword?: string;
}) {
  return http.patch<MyProfile>("/users/profile", payload).then((r) => r.data);
}

export function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return http.patch("/users/profile/password", payload).then((r) => r.data);
}