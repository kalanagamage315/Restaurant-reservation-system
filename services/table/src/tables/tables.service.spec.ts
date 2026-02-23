import { Test, TestingModule } from "@nestjs/testing";
import { TablesService } from "./tables.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

function makePrismaMock() {
    return {
        diningTable: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
}

const sampleTable = {
    id: "tbl_1",
    restaurantId: "rest_1",
    tableNumber: "T1",
    capacity: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("TablesService", () => {
    let service: TablesService;
    let prisma: ReturnType<typeof makePrismaMock>;

    beforeEach(async () => {
        prisma = makePrismaMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TablesService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<TablesService>(TablesService);
    });

    afterEach(() => jest.clearAllMocks());

    // ── create ───────────────────────────────────────────────────────────────────

    describe("create", () => {
        it("creates a table successfully", async () => {
            prisma.diningTable.create.mockResolvedValue(sampleTable);

            const result = await service.create({
                restaurantId: "rest_1",
                tableNumber: "T1",
                capacity: 4,
            });

            expect(prisma.diningTable.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ tableNumber: "T1", capacity: 4, isActive: true }),
                }),
            );
            expect(result).toEqual(sampleTable);
        });

        it("throws ConflictException when table number already exists for the restaurant (P2002)", async () => {
            const prismaError = new PrismaClientKnownRequestError("Unique constraint", {
                code: "P2002",
                clientVersion: "5.0.0",
            });
            prisma.diningTable.create.mockRejectedValue(prismaError);

            await expect(
                service.create({ restaurantId: "rest_1", tableNumber: "T1", capacity: 4 }),
            ).rejects.toThrow(ConflictException);
        });

        it("re-throws non-unique errors as-is", async () => {
            const genericError = new Error("DB connection failed");
            prisma.diningTable.create.mockRejectedValue(genericError);

            await expect(
                service.create({ restaurantId: "rest_1", tableNumber: "T1", capacity: 4 }),
            ).rejects.toThrow("DB connection failed");
        });
    });

    // ── listActiveByRestaurant ────────────────────────────────────────────────────

    describe("listActiveByRestaurant", () => {
        it("returns only active tables for the given restaurant", async () => {
            prisma.diningTable.findMany.mockResolvedValue([sampleTable]);

            const result = await service.listActiveByRestaurant("rest_1");

            expect(prisma.diningTable.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { restaurantId: "rest_1", isActive: true } }),
            );
            expect(result).toHaveLength(1);
        });
    });

    // ── update ────────────────────────────────────────────────────────────────────

    describe("update", () => {
        it("updates a table's capacity successfully", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(sampleTable);
            prisma.diningTable.update.mockResolvedValue({ ...sampleTable, capacity: 6 });

            const result = await service.update("tbl_1", { capacity: 6 });

            expect(prisma.diningTable.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: "tbl_1" } }),
            );
            expect(result.capacity).toBe(6);
        });

        it("throws NotFoundException when table does not exist", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(null);

            await expect(service.update("tbl_999", { capacity: 6 })).rejects.toThrow(NotFoundException);
            expect(prisma.diningTable.update).not.toHaveBeenCalled();
        });

        it("throws ConflictException when updated table number conflicts (P2002)", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(sampleTable);
            const prismaError = new PrismaClientKnownRequestError("Unique constraint", {
                code: "P2002",
                clientVersion: "5.0.0",
            });
            prisma.diningTable.update.mockRejectedValue(prismaError);

            await expect(service.update("tbl_1", { tableNumber: "T1" })).rejects.toThrow(ConflictException);
        });
    });

    // ── setStatus / deactivate ────────────────────────────────────────────────────

    describe("setStatus", () => {
        it("deactivates a table", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(sampleTable);
            prisma.diningTable.update.mockResolvedValue({ ...sampleTable, isActive: false });

            await service.setStatus("tbl_1", false);

            expect(prisma.diningTable.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { isActive: false } }),
            );
        });

        it("throws NotFoundException when table does not exist", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(null);

            await expect(service.setStatus("tbl_999", false)).rejects.toThrow(NotFoundException);
        });
    });

    describe("deactivate", () => {
        it("delegates to setStatus with isActive=false", async () => {
            prisma.diningTable.findUnique.mockResolvedValue(sampleTable);
            prisma.diningTable.update.mockResolvedValue({ ...sampleTable, isActive: false });

            await service.deactivate("tbl_1");

            expect(prisma.diningTable.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { isActive: false } }),
            );
        });
    });
});
