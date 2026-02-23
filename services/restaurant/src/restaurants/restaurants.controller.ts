import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { RestaurantsService } from "./restaurants.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { ParamIdDto } from "./dto/param-id.dto";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Restaurants")
@Controller("restaurants")
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) { }

  // Returns only active restaurants, accessible publicly.
  @Get()
  @ApiOperation({ summary: "List active restaurants (public)" })
  list() {
    return this.restaurants.findActive();
  }

  // Returns all restaurants including inactive ones (admin only).
  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "List all restaurants (ADMIN)" })
  adminAll() {
    return this.restaurants.findAll();
  }

  // Returns a single restaurant by ID, accessible publicly.
  @Get(":id")
  @ApiOperation({ summary: "Get restaurant by id (public)" })
  get(@Param() params: ParamIdDto) {
    return this.restaurants.findOne(params.id);
  }

  // Creates a new restaurant (admin only).
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Create a restaurant (ADMIN)" })
  @ApiResponse({ status: 201 })
  create(@Body() body: CreateRestaurantDto) {
    return this.restaurants.create(body);
  }

  // Updates restaurant details (admin or staff).
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "STAFF")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Update restaurant (ADMIN/STAFF)" })
  update(@Param() params: ParamIdDto, @Body() body: UpdateRestaurantDto) {
    return this.restaurants.update(params.id, body);
  }

  // Toggles the active/inactive status of a restaurant (admin only).
  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Set restaurant status (ADMIN)" })
  setStatus(@Param() params: ParamIdDto, @Body() body: { isActive: boolean }) {
    return this.restaurants.setStatus(params.id, !!body?.isActive);
  }

  // Deactivates a restaurant. Kept as a dedicated route for backwards compatibility.
  @Patch(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Deactivate restaurant (ADMIN)" })
  deactivate(@Param() params: ParamIdDto) {
    return this.restaurants.setStatus(params.id, false);
  }
}
