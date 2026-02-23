/** Minimal shapes returned by upstream microservices.
 * Exported so the controller return types can be inferred without visibility errors.
 */
export interface RestaurantDto {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    isActive?: boolean;
    openTime?: string | null;
    closeTime?: string | null;
    openDays?: string[];
}

export interface TableDto {
    id: string;
    restaurantId: string;
    tableNumber: string;
    capacity: number;
    isActive: boolean;
}

export interface UserPublicDto {
    id: string;
    fullName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    roles?: { role: string }[];
}
