import { Body, Controller, Get, Patch, Post, Query, Param, UseGuards } from "@nestjs/common";
import { TablesService } from "./tables.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { ParamIdDto } from "./dto/param-id.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Tables")
@Controller("tables")
export class TablesController {
  constructor(private readonly tables: TablesService) { }

  // Returns active tables for a restaurant. Requires restaurantId query param.
  @Get()
  @ApiOperation({ summary: "List active tables by restaurantId (public)" })
  list(@Query("restaurantId") restaurantId?: string) {
    if (!restaurantId) return [];
    return this.tables.listActiveByRestaurant(restaurantId);
  }

  // Returns all tables (including inactive) for a restaurant, accessible by admin/staff.
  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "STAFF")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "List all tables (ADMIN/STAFF)" })
  adminAll(@Query("restaurantId") restaurantId?: string) {
    return this.tables.listAllByRestaurant(restaurantId);
  }

  // Creates a new table for a restaurant (admin/staff only).
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "STAFF")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Create table (ADMIN/STAFF)" })
  create(@Body() body: CreateTableDto) {
    return this.tables.create(body);
  }

  // Updates table details such as number or capacity (admin/staff only).
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "STAFF")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Update table (ADMIN/STAFF)" })
  update(@Param() params: ParamIdDto, @Body() body: UpdateTableDto) {
    return this.tables.update(params.id, body);
  }

  // Toggles the active status of a table (admin/staff only).
  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "STAFF")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Set table status (ADMIN/STAFF)" })
  setStatus(@Param() params: ParamIdDto, @Body() body: { isActive: boolean }) {
    return this.tables.setStatus(params.id, !!body?.isActive);
  }

  // Deactivates a table. Kept as a dedicated route for backwards compatibility.
  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Deactivate table (ADMIN)" })
  deactivate(@Param() params: ParamIdDto) {
    return this.tables.deactivate(params.id);
  }
}
