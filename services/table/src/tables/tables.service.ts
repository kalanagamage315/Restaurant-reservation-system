import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) { }

  async create(data: CreateTableDto) {
    try {
      return await this.prisma.diningTable.create({
        data: {
          restaurantId: data.restaurantId,
          tableNumber: data.tableNumber,
          capacity: data.capacity,
          isActive: true,
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Table number already exists for this restaurant");
      }
      throw e;
    }
  }

  // Returns only active tables for the given restaurant, ordered by table number.
  listActiveByRestaurant(restaurantId: string) {
    return this.prisma.diningTable.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { tableNumber: "asc" },
    });
  }

  // Returns all tables for the given restaurant, including inactive ones.
  listAllByRestaurant(restaurantId?: string) {
    return this.prisma.diningTable.findMany({
      where: restaurantId ? { restaurantId } : {},
      orderBy: [{ restaurantId: "asc" }, { tableNumber: "asc" }],
    });
  }

  async update(id: string, data: UpdateTableDto) {
    const t = await this.prisma.diningTable.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Table not found");

    try {
      return await this.prisma.diningTable.update({
        where: { id },
        data: {
          tableNumber: (data as any).tableNumber ?? undefined,
          capacity: (data as any).capacity ?? undefined,
          isActive: (data as any).isActive ?? undefined,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Table number already exists for this restaurant");
      }
      throw e;
    }
  }

  async setStatus(id: string, isActive: boolean) {
    const t = await this.prisma.diningTable.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Table not found");

    return this.prisma.diningTable.update({
      where: { id },
      data: { isActive },
    });
  }

  async deactivate(id: string) {
    return this.setStatus(id, false);
  }
}
