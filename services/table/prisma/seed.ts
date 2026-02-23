import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding tables...");

    const tables = [
        // The Golden Fork (rest_001) — 8 tables
        { id: "tbl_001", restaurantId: "rest_001", tableNumber: "T1", capacity: 2, isActive: true },
        { id: "tbl_002", restaurantId: "rest_001", tableNumber: "T2", capacity: 2, isActive: true },
        { id: "tbl_003", restaurantId: "rest_001", tableNumber: "T3", capacity: 4, isActive: true },
        { id: "tbl_004", restaurantId: "rest_001", tableNumber: "T4", capacity: 4, isActive: true },
        { id: "tbl_005", restaurantId: "rest_001", tableNumber: "T5", capacity: 6, isActive: true },
        { id: "tbl_006", restaurantId: "rest_001", tableNumber: "T6", capacity: 6, isActive: true },
        { id: "tbl_007", restaurantId: "rest_001", tableNumber: "T7", capacity: 8, isActive: true },
        { id: "tbl_008", restaurantId: "rest_001", tableNumber: "VIP1", capacity: 10, isActive: true },

        // Seaside Bistro (rest_002) — 7 tables
        { id: "tbl_009", restaurantId: "rest_002", tableNumber: "A1", capacity: 2, isActive: true },
        { id: "tbl_010", restaurantId: "rest_002", tableNumber: "A2", capacity: 2, isActive: true },
        { id: "tbl_011", restaurantId: "rest_002", tableNumber: "A3", capacity: 4, isActive: true },
        { id: "tbl_012", restaurantId: "rest_002", tableNumber: "A4", capacity: 4, isActive: true },
        { id: "tbl_013", restaurantId: "rest_002", tableNumber: "A5", capacity: 6, isActive: true },
        { id: "tbl_014", restaurantId: "rest_002", tableNumber: "A6", capacity: 8, isActive: true },
        { id: "tbl_015", restaurantId: "rest_002", tableNumber: "A7", capacity: 12, isActive: false },

        // Spice Garden (rest_003) — 6 tables
        { id: "tbl_016", restaurantId: "rest_003", tableNumber: "B1", capacity: 2, isActive: true },
        { id: "tbl_017", restaurantId: "rest_003", tableNumber: "B2", capacity: 4, isActive: true },
        { id: "tbl_018", restaurantId: "rest_003", tableNumber: "B3", capacity: 4, isActive: true },
        { id: "tbl_019", restaurantId: "rest_003", tableNumber: "B4", capacity: 6, isActive: true },
        { id: "tbl_020", restaurantId: "rest_003", tableNumber: "B5", capacity: 8, isActive: true },
        { id: "tbl_021", restaurantId: "rest_003", tableNumber: "B6", capacity: 10, isActive: true },

        // The Rooftop Grill (rest_004) — 4 tables
        { id: "tbl_022", restaurantId: "rest_004", tableNumber: "R1", capacity: 2, isActive: true },
        { id: "tbl_023", restaurantId: "rest_004", tableNumber: "R2", capacity: 4, isActive: true },
        { id: "tbl_024", restaurantId: "rest_004", tableNumber: "R3", capacity: 6, isActive: true },
        { id: "tbl_025", restaurantId: "rest_004", tableNumber: "R4", capacity: 8, isActive: true },
    ];

    for (const t of tables) {
        await prisma.diningTable.upsert({
            where: { id: t.id },
            update: t,
            create: t,
        });
    }

    console.log(`✅ Seeded ${tables.length} tables across 4 restaurants`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
