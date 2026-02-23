import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) { }

  create(data: any) {
    return this.prisma.restaurant.create({
      data: {
        name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        openTime: data.openTime ?? null,
        closeTime: data.closeTime ?? null,
        openDays: data.openDays ?? [],
      },
    });
  }

  // Returns only active restaurants, ordered by creation date.
  findActive() {
    return this.prisma.restaurant.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Returns all restaurants regardless of active status (admin use).
  findAll() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.restaurant.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Restaurant not found");

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        address: data.address ?? undefined,
        phone: data.phone ?? undefined,
        openTime: data.openTime ?? undefined,
        closeTime: data.closeTime ?? undefined,
        openDays: data.openDays ?? undefined,
      },
    });
  }

  async setStatus(id: string, isActive: boolean) {
    const exists = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Restaurant not found");

    return this.prisma.restaurant.update({
      where: { id },
      data: { isActive },
    });
  }
}
