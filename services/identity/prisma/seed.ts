import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding identity service...");

    const PASSWORD_HASH = await bcrypt.hash("Password123!", 10);

    const users = [
        // Admin
        { id: "user_admin_01", email: "admin@dinease.com", fullName: "Admin User", phoneNumber: "+94-77-000-0001", role: Role.ADMIN },
        // Staff — assigned to restaurants
        { id: "user_staff_01", email: "staff1@dinease.com", fullName: "Kamal Perera", phoneNumber: "+94-77-100-0001", role: Role.STAFF, restaurantId: "rest_001" },
        { id: "user_staff_02", email: "staff2@dinease.com", fullName: "Nilufar Silva", phoneNumber: "+94-77-100-0002", role: Role.STAFF, restaurantId: "rest_002" },
        { id: "user_staff_03", email: "staff3@dinease.com", fullName: "Roshan Fernando", phoneNumber: "+94-77-100-0003", role: Role.STAFF, restaurantId: "rest_003" },
        { id: "user_staff_04", email: "staff4@dinease.com", fullName: "Priya Wijesinghe", phoneNumber: "+94-77-100-0004", role: Role.STAFF, restaurantId: "rest_004" },
        // Customers
        { id: "user_cust_01", email: "alice@example.com", fullName: "Alice Johnson", phoneNumber: "+94-77-200-0001", role: Role.CUSTOMER },
        { id: "user_cust_02", email: "bob@example.com", fullName: "Bob Smith", phoneNumber: "+94-77-200-0002", role: Role.CUSTOMER },
        { id: "user_cust_03", email: "charlie@example.com", fullName: "Charlie Brown", phoneNumber: "+94-77-200-0003", role: Role.CUSTOMER },
        { id: "user_cust_04", email: "diana@example.com", fullName: "Diana Prince", phoneNumber: "+94-77-200-0004", role: Role.CUSTOMER },
        { id: "user_cust_05", email: "eve@example.com", fullName: "Eve Taylor", phoneNumber: "+94-77-200-0005", role: Role.CUSTOMER },
        { id: "user_cust_06", email: "frank@example.com", fullName: "Frank Miller", phoneNumber: "+94-77-200-0006", role: Role.CUSTOMER },
        { id: "user_cust_07", email: "grace@example.com", fullName: "Grace Lee", phoneNumber: "+94-77-200-0007", role: Role.CUSTOMER },
        { id: "user_cust_08", email: "henry@example.com", fullName: "Henry Wilson", phoneNumber: "+94-77-200-0008", role: Role.CUSTOMER },
        { id: "user_cust_09", email: "iris@example.com", fullName: "Iris Chen", phoneNumber: "+94-77-200-0009", role: Role.CUSTOMER },
        { id: "user_cust_10", email: "jack@example.com", fullName: "Jack Thompson", phoneNumber: "+94-77-200-0010", role: Role.CUSTOMER },
    ];

    for (const u of users) {
        const { role, restaurantId, ...userFields } = u as any;

        await prisma.user.upsert({
            where: { id: u.id },
            update: {},
            create: {
                ...userFields,
                passwordHash: PASSWORD_HASH,
                isActive: true,
                restaurantId: restaurantId ?? null,
                roles: {
                    create: [{ role }],
                },
            },
        });
    }

    console.log(`✅ Seeded ${users.length} users (1 admin, 4 staff, 10 customers)`);
    console.log("   Default password for all: Password123!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
