import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding restaurants...");

    const restaurants = [
        {
            id: "rest_001",
            name: "The Golden Fork",
            address: "123 Main Street, Colombo 03, Sri Lanka",
            phone: "+94-11-234-5678",
            isActive: true,
            openTime: "08:00",
            closeTime: "22:00",
            openDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
        },
        {
            id: "rest_002",
            name: "Seaside Bistro",
            address: "45 Galle Face Green, Colombo 02, Sri Lanka",
            phone: "+94-11-345-6789",
            isActive: true,
            openTime: "11:00",
            closeTime: "23:00",
            openDays: ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        },
        {
            id: "rest_003",
            name: "Spice Garden",
            address: "78 Kandy Road, Nugegoda, Sri Lanka",
            phone: "+94-11-456-7890",
            isActive: true,
            openTime: "09:00",
            closeTime: "21:00",
            openDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        },
        {
            id: "rest_004",
            name: "The Rooftop Grill",
            address: "12 Union Place, Colombo 02, Sri Lanka",
            phone: "+94-11-567-8901",
            isActive: true,
            openTime: "17:00",
            closeTime: "23:30",
            openDays: ["WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        },
        {
            id: "rest_005",
            name: "Harbor View Restaurant",
            address: "9 Marine Drive, Colombo 01, Sri Lanka",
            phone: "+94-11-678-9012",
            isActive: false,
            openTime: "12:00",
            closeTime: "22:00",
            openDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        },
    ];

    for (const r of restaurants) {
        await prisma.restaurant.upsert({
            where: { id: r.id },
            update: r,
            create: r,
        });
    }

    console.log(`✅ Seeded ${restaurants.length} restaurants with opening hours`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
