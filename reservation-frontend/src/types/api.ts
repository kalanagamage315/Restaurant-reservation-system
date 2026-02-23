// Role values matching the backend Prisma enum.
export type Role = "ADMIN" | "STAFF" | "CUSTOMER";

// Auth state types used by AuthContext.
export type AuthUser = {
  id: string;
  email: string;
  roles: Role[];
  restaurantId?: string | null;

  // optional extras you return from backend
  fullName?: string | null;
  phoneNumber?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

// -------------------- Domain types --------------------

export type Restaurant = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
  openTime?: string | null;   // "HH:mm" e.g. "09:00"
  closeTime?: string | null;  // "HH:mm" e.g. "22:00"
  openDays?: string[];        // e.g. ["MONDAY","SATURDAY"]
};

export type DiningTable = {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  isActive: boolean;
};

export type Reservation = {
  id: string;
  userId: string;
  restaurantId: string;
  guests: number;
  reservedAt: string;
  status: string;
  tableId?: string | null;

  contactPhone?: string | null;

  // Fields below are enriched by the backend (not stored directly on the reservation).
  restaurant?: Restaurant | null;

  customer?: {
    id: string;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
  } | null;

  effectivePhone?: string | null;
  checkedOutAt?: string | null;
  checkedOutBy?: string | null;

};
