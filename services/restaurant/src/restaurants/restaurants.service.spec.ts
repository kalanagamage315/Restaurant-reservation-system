import { Test, TestingModule } from "@nestjs/testing";
import { RestaurantsService } from "./restaurants.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

function makePrismaMock() {
    return {
        restaurant: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
}

const sampleRestaurant = {
    id: "rest_1",
    name: "The Golden Fork",
    address: "123 Main St",
    phone: "+94-11-234-5678",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("RestaurantsService", () => {
    let service: RestaurantsService;
    let prisma: ReturnType<typeof makePrismaMock>;

    beforeEach(async () => {
        prisma = makePrismaMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RestaurantsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<RestaurantsService>(RestaurantsService);
    });

    afterEach(() => jest.clearAllMocks());

    // ── create ──────────────────────────────────────────────────────────────────

    describe("create", () => {
        it("creates a restaurant and returns it", async () => {
            prisma.restaurant.create.mockResolvedValue(sampleRestaurant);

            const result = await service.create({
                name: "The Golden Fork",
                address: "123 Main St",
                phone: "+94-11-234-5678",
            });

            expect(prisma.restaurant.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ name: "The Golden Fork" }),
                }),
            );
            expect(result).toEqual(sampleRestaurant);
        });

        it("creates a restaurant with null address and phone when not supplied", async () => {
            prisma.restaurant.create.mockResolvedValue({ ...sampleRestaurant, address: null, phone: null });

            await service.create({ name: "Bare Bones" });

            expect(prisma.restaurant.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ address: null, phone: null }),
                }),
            );
        });
    });

    // ── findActive ───────────────────────────────────────────────────────────────

    describe("findActive", () => {
        it("returns only active restaurants", async () => {
            prisma.restaurant.findMany.mockResolvedValue([sampleRestaurant]);

            const result = await service.findActive();

            expect(prisma.restaurant.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isActive: true } }),
            );
            expect(result).toHaveLength(1);
        });
    });

    // ── findAll ──────────────────────────────────────────────────────────────────

    describe("findAll", () => {
        it("returns all restaurants regardless of status", async () => {
            const inactive = { ...sampleRestaurant, id: "rest_2", isActive: false };
            prisma.restaurant.findMany.mockResolvedValue([sampleRestaurant, inactive]);

            const result = await service.findAll();

            expect(prisma.restaurant.findMany).toHaveBeenCalledWith(
                expect.not.objectContaining({ where: { isActive: true } }),
            );
            expect(result).toHaveLength(2);
        });
    });

    // ── update ───────────────────────────────────────────────────────────────────

    describe("update", () => {
        it("updates an existing restaurant", async () => {
            prisma.restaurant.findUnique.mockResolvedValue(sampleRestaurant);
            prisma.restaurant.update.mockResolvedValue({ ...sampleRestaurant, name: "New Name" });

            const result = await service.update("rest_1", { name: "New Name" });

            expect(prisma.restaurant.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: "rest_1" } }),
            );
            expect(result.name).toBe("New Name");
        });

        it("throws NotFoundException when restaurant does not exist", async () => {
            prisma.restaurant.findUnique.mockResolvedValue(null);

            await expect(service.update("rest_999", { name: "X" })).rejects.toThrow(NotFoundException);
            expect(prisma.restaurant.update).not.toHaveBeenCalled();
        });
    });

    // ── setStatus ─────────────────────────────────────────────────────────────────

    describe("setStatus", () => {
        it("deactivates a restaurant", async () => {
            prisma.restaurant.findUnique.mockResolvedValue(sampleRestaurant);
            prisma.restaurant.update.mockResolvedValue({ ...sampleRestaurant, isActive: false });

            await service.setStatus("rest_1", false);

            expect(prisma.restaurant.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { isActive: false } }),
            );
        });

        it("throws NotFoundException when restaurant does not exist", async () => {
            prisma.restaurant.findUnique.mockResolvedValue(null);

            await expect(service.setStatus("rest_999", false)).rejects.toThrow(NotFoundException);
        });
    });
});
