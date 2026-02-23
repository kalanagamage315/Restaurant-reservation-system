import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) { }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return { user: req.user };
  }

  // Returns the full profile of the currently authenticated user.
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: any) {
    return this.users.getMyProfile(req.user.id ?? req.user.userId ?? req.user.sub);
  }

  // Updates profile fields (name, phone, email) for the currently authenticated user.
  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: any,
    @Body()
    body: {
      fullName?: string | null;
      phoneNumber?: string | null;
      email?: string;
      currentPassword?: string; // required if changing email
    },
  ) {
    return this.users.updateMyProfile(req.user.id ?? req.user.userId ?? req.user.sub, body);
  }

  // Changes the password for the currently authenticated user.
  @Patch("profile/password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.users.changeMyPassword(req.user.id ?? req.user.userId ?? req.user.sub, body.currentPassword, body.newPassword);
  }

  // Returns all staff users for admin assignment UI.
  @Get("staff")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listStaff() {
    return this.users.listStaffUsers();
  }

  // Assigns or unassigns a staff member to a restaurant.
  @Patch(":id/assign-restaurant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  assignRestaurant(@Param("id") userId: string, @Body() body: { restaurantId: string | null }) {
    return this.users.assignRestaurant(userId, body.restaurantId ?? null);
  }

  // Internal endpoint used by the reservation service to fetch user details by IDs.
  @Post("public-by-ids")
  @UseGuards(JwtAuthGuard)
  publicByIds(@Body() body: { ids: string[] }) {
    return this.users.findManyPublicByIds(body.ids ?? []);
  }

  @Get("admin-only")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly() {
    return { message: "Admin access confirmed." };
  }

  // Returns all active users (admin only).
  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAllUsers() {
    return this.users.listAllUsers();
  }

  // Updates the roles assigned to a user (admin only).
  @Patch(":id/roles")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setRoles(@Param("id") userId: string, @Body() body: { roles: Role[] }) {
    return this.users.setUserRoles(userId, body.roles ?? []);
  }
}