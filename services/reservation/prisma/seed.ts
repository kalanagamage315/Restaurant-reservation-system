import { PrismaClient, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Generates a date relative to today
function daysAgo(n: number, hour = 12, minute = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, minute, 0, 0);
    return d;
}

function daysFromNow(n: number, hour = 12, minute = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(hour, minute, 0, 0);
    return d;
}

async function main() {
    console.log("🌱 Seeding reservations...");

    const reservations: Array<{
        id: string;
        userId: string;
        restaurantId: string;
        reservedAt: Date;
        guests: number;
        status: ReservationStatus;
        tableId?: string;
        contactPhone?: string;
        durationMins: number;
        confirmedAt?: Date;
        confirmedBy?: string;
        checkedOutAt?: Date;
        checkedOutBy?: string;
        createdAt: Date;
    }> = [
            // ── CONFIRMED + checked out (historical) ──────────────────────────────────
            {
                id: "res_001", userId: "user_cust_01", restaurantId: "rest_001",
                reservedAt: daysAgo(10, 19, 0), guests: 2, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_001", durationMins: 90,
                confirmedAt: daysAgo(11), confirmedBy: "user_staff_01",
                checkedOutAt: daysAgo(10, 21, 0), checkedOutBy: "user_staff_01",
                createdAt: daysAgo(12),
            },
            {
                id: "res_002", userId: "user_cust_02", restaurantId: "rest_001",
                reservedAt: daysAgo(8, 20, 0), guests: 4, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_003", durationMins: 90,
                confirmedAt: daysAgo(9), confirmedBy: "user_staff_01",
                checkedOutAt: daysAgo(8, 22, 0), checkedOutBy: "user_staff_01",
                createdAt: daysAgo(10),
            },
            {
                id: "res_003", userId: "user_cust_03", restaurantId: "rest_002",
                reservedAt: daysAgo(7, 12, 30), guests: 3, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_011", durationMins: 60,
                confirmedAt: daysAgo(8), confirmedBy: "user_staff_02",
                checkedOutAt: daysAgo(7, 14, 0), checkedOutBy: "user_staff_02",
                createdAt: daysAgo(9),
            },
            {
                id: "res_004", userId: "user_cust_04", restaurantId: "rest_002",
                reservedAt: daysAgo(5, 18, 0), guests: 2, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_009", durationMins: 90,
                confirmedAt: daysAgo(6), confirmedBy: "user_staff_02",
                checkedOutAt: daysAgo(5, 20, 0), checkedOutBy: "user_staff_02",
                createdAt: daysAgo(7),
            },
            {
                id: "res_005", userId: "user_cust_05", restaurantId: "rest_003",
                reservedAt: daysAgo(4, 19, 30), guests: 6, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_019", durationMins: 120,
                confirmedAt: daysAgo(5), confirmedBy: "user_staff_03",
                checkedOutAt: daysAgo(4, 22, 0), checkedOutBy: "user_staff_03",
                createdAt: daysAgo(6),
            },
            {
                id: "res_006", userId: "user_cust_06", restaurantId: "rest_003",
                reservedAt: daysAgo(3, 13, 0), guests: 4, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_017", durationMins: 90,
                confirmedAt: daysAgo(4), confirmedBy: "user_staff_03",
                checkedOutAt: daysAgo(3, 15, 0), checkedOutBy: "user_staff_03",
                createdAt: daysAgo(5),
            },
            {
                id: "res_007", userId: "user_cust_07", restaurantId: "rest_004",
                reservedAt: daysAgo(2, 20, 0), guests: 2, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_022", durationMins: 90,
                confirmedAt: daysAgo(3), confirmedBy: "user_staff_04",
                checkedOutAt: daysAgo(2, 22, 0), checkedOutBy: "user_staff_04",
                createdAt: daysAgo(4),
            },
            {
                id: "res_008", userId: "user_cust_08", restaurantId: "rest_004",
                reservedAt: daysAgo(1, 18, 30), guests: 4, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_023", durationMins: 90,
                confirmedAt: daysAgo(2), confirmedBy: "user_staff_04",
                checkedOutAt: daysAgo(1, 20, 30), checkedOutBy: "user_staff_04",
                createdAt: daysAgo(3),
            },

            // ── CONFIRMED but NOT yet checked out (active today) ─────────────────────
            {
                id: "res_009", userId: "user_cust_09", restaurantId: "rest_001",
                reservedAt: daysAgo(0, 12, 0), guests: 2, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_002", durationMins: 90,
                confirmedAt: daysAgo(1), confirmedBy: "user_staff_01",
                createdAt: daysAgo(2),
            },
            {
                id: "res_010", userId: "user_cust_10", restaurantId: "rest_002",
                reservedAt: daysAgo(0, 13, 0), guests: 4, status: ReservationStatus.CONFIRMED,
                tableId: "tbl_012", durationMins: 90,
                confirmedAt: daysAgo(1), confirmedBy: "user_staff_02",
                createdAt: daysAgo(2),
            },

            // ── CANCELLED ─────────────────────────────────────────────────────────────
            {
                id: "res_011", userId: "user_cust_01", restaurantId: "rest_001",
                reservedAt: daysAgo(15, 19, 0), guests: 4, status: ReservationStatus.CANCELLED,
                durationMins: 90, createdAt: daysAgo(16),
            },
            {
                id: "res_012", userId: "user_cust_02", restaurantId: "rest_003",
                reservedAt: daysAgo(6, 20, 0), guests: 2, status: ReservationStatus.CANCELLED,
                durationMins: 90, createdAt: daysAgo(7),
            },
            {
                id: "res_013", userId: "user_cust_05", restaurantId: "rest_002",
                reservedAt: daysAgo(2, 18, 0), guests: 6, status: ReservationStatus.CANCELLED,
                durationMins: 90, createdAt: daysAgo(3),
            },

            // ── REJECTED ──────────────────────────────────────────────────────────────
            {
                id: "res_014", userId: "user_cust_03", restaurantId: "rest_004",
                reservedAt: daysAgo(10, 21, 0), guests: 10, status: ReservationStatus.REJECTED,
                durationMins: 90, confirmedBy: "user_staff_04", createdAt: daysAgo(11),
            },

            // ── PENDING — upcoming, not yet actioned by staff ─────────────────────────
            {
                id: "res_015", userId: "user_cust_01", restaurantId: "rest_001",
                reservedAt: daysFromNow(1, 19, 0), guests: 2, status: ReservationStatus.PENDING,
                contactPhone: "+94-77-200-0001", durationMins: 90, createdAt: daysAgo(1),
            },
            {
                id: "res_016", userId: "user_cust_02", restaurantId: "rest_001",
                reservedAt: daysFromNow(2, 20, 0), guests: 4, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_017", userId: "user_cust_03", restaurantId: "rest_002",
                reservedAt: daysFromNow(1, 12, 30), guests: 3, status: ReservationStatus.PENDING,
                contactPhone: "+94-77-200-0003", durationMins: 60, createdAt: daysAgo(1),
            },
            {
                id: "res_018", userId: "user_cust_04", restaurantId: "rest_002",
                reservedAt: daysFromNow(3, 18, 0), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_019", userId: "user_cust_05", restaurantId: "rest_003",
                reservedAt: daysFromNow(1, 19, 30), guests: 6, status: ReservationStatus.PENDING,
                durationMins: 120, createdAt: daysAgo(1),
            },
            {
                id: "res_020", userId: "user_cust_06", restaurantId: "rest_003",
                reservedAt: daysFromNow(4, 13, 0), guests: 4, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_021", userId: "user_cust_07", restaurantId: "rest_004",
                reservedAt: daysFromNow(2, 20, 0), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(1),
            },
            {
                id: "res_022", userId: "user_cust_08", restaurantId: "rest_004",
                reservedAt: daysFromNow(5, 18, 30), guests: 4, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_023", userId: "user_cust_09", restaurantId: "rest_001",
                reservedAt: daysFromNow(7, 19, 0), guests: 8, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_024", userId: "user_cust_10", restaurantId: "rest_002",
                reservedAt: daysFromNow(3, 14, 0), guests: 5, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(1),
            },
            {
                id: "res_025", userId: "user_cust_01", restaurantId: "rest_003",
                reservedAt: daysFromNow(6, 20, 30), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_026", userId: "user_cust_02", restaurantId: "rest_004",
                reservedAt: daysFromNow(1, 12, 0), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 60, createdAt: daysAgo(1),
            },
            {
                id: "res_027", userId: "user_cust_03", restaurantId: "rest_001",
                reservedAt: daysFromNow(8, 20, 0), guests: 4, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_028", userId: "user_cust_04", restaurantId: "rest_003",
                reservedAt: daysFromNow(2, 19, 0), guests: 6, status: ReservationStatus.PENDING,
                durationMins: 120, createdAt: daysAgo(1),
            },
            {
                id: "res_029", userId: "user_cust_05", restaurantId: "rest_004",
                reservedAt: daysFromNow(4, 18, 0), guests: 4, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_030", userId: "user_cust_06", restaurantId: "rest_002",
                reservedAt: daysFromNow(10, 21, 0), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
            {
                id: "res_031", userId: "user_cust_07", restaurantId: "rest_001",
                reservedAt: daysFromNow(5, 13, 0), guests: 2, status: ReservationStatus.PENDING,
                durationMins: 60, createdAt: daysAgo(0),
            },
            {
                id: "res_032", userId: "user_cust_08", restaurantId: "rest_003",
                reservedAt: daysFromNow(9, 20, 0), guests: 8, status: ReservationStatus.PENDING,
                durationMins: 90, createdAt: daysAgo(0),
            },
        ];

    for (const r of reservations) {
        const { contactPhone, tableId, confirmedAt, confirmedBy, checkedOutAt, checkedOutBy, ...baseFields } = r;
        await prisma.reservation.upsert({
            where: { id: r.id },
            update: {},
            create: {
                ...baseFields,
                contactPhone: contactPhone ?? null,
                tableId: tableId ?? null,
                confirmedAt: confirmedAt ?? null,
                confirmedBy: confirmedBy ?? null,
                checkedOutAt: checkedOutAt ?? null,
                checkedOutBy: checkedOutBy ?? null,
            },
        });
    }

    console.log(`✅ Seeded ${reservations.length} reservations`);
    console.log("   Breakdown: 8 confirmed+checked-out, 2 confirmed active, 3 cancelled, 1 rejected, 18 pending");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
