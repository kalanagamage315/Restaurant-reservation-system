import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  Query,
  Param,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ReservationsService } from "./reservations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";
import { ParamIdDto } from "./dto/param-id.dto";
import { AvailabilityQueryDto } from "./dto/availability-query.dto";
import { ConfirmWithTableDto } from "./dto/confirm-with-table.dto";
import { ConfirmedQueryDto } from "./dto/confirmed-query.dto";

@ApiTags("reservations")
@ApiBearerAuth("access-token")
@Controller("reservations")
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) { }

  @Post()
  @ApiOperation({ summary: "Create reservation (Customer)" })
  @ApiResponse({ status: 201, description: "Reservation created" })
  create(@Req() req: any, @Body() body: CreateReservationDto) {
    return this.reservations.create(req.user.userId, body);
  }

  @Get("me")
  @ApiOperation({ summary: "Get my reservations (Customer)" })
  @ApiResponse({ status: 200, description: "List returned" })
  findMine(@Req() req: any) {
    return this.reservations.findMine(req.user.userId);
  }

  @Get("availability")
  @ApiOperation({ summary: "Check available tables (Customer search)" })
  @ApiResponse({ status: 200, description: "Available tables list" })
  availability(@Query() q: AvailabilityQueryDto) {
    return this.reservations.availability(q);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel my reservation (Customer)" })
  @ApiResponse({ status: 200, description: "Reservation cancelled" })
  cancelMine(@Req() req: any, @Param() params: ParamIdDto) {
    return this.reservations.cancelMine(req.user.userId, params.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update my reservation date/guests/contact (Customer, PENDING only)" })
  @ApiResponse({ status: 200, description: "Reservation updated" })
  @ApiResponse({ status: 409, description: "Cannot modify a non-PENDING reservation" })
  update(@Req() req: any, @Param() params: ParamIdDto, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(req.user.userId, params.id, dto);
  }

  @Patch(":id/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  @ApiOperation({
    summary: "Confirm reservation (Staff/Admin) - optionally assign a table",
  })
  @ApiResponse({ status: 200, description: "Reservation confirmed" })
  confirm(
    @Param() params: ParamIdDto,
    @Req() req: any,
    @Body() body?: ConfirmWithTableDto,
  ) {
    if (body?.tableId) {
      return this.reservations.confirmWithTable(params.id, body.tableId, req.user.userId);
    }
    return this.reservations.confirm(params.id, req.user.userId);
  }

  @Patch(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  @ApiOperation({ summary: "Reject reservation (Staff/Admin)" })
  @ApiResponse({ status: 200, description: "Reservation rejected" })
  reject(@Param() params: ParamIdDto, @Req() req: any) {
    return this.reservations.reject(params.id, req.user.userId);
  }

  @Patch(":id/confirm-with-table")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  @ApiOperation({ summary: "Confirm reservation + assign table (Staff/Admin)" })
  @ApiResponse({ status: 200, description: "Reservation confirmed with table" })
  confirmWithTable(
    @Param() params: ParamIdDto,
    @Body() body: ConfirmWithTableDto,
    @Req() req: any,
  ) {
    return this.reservations.confirmWithTable(params.id, body.tableId, req.user.userId);
  }

  // Returns reservations enriched with customer and restaurant details.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  @ApiOperation({ summary: "List reservations (Staff/Admin) - filter by status/restaurant" })
  @ApiResponse({ status: 200, description: "List returned" })
  findAll(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("restaurantId") restaurantId?: string,
  ) {
    const authHeader = req?.headers?.authorization as string | undefined;
    return this.reservations.findAllForStaffAdmin({ status, restaurantId }, authHeader);
  }

  @Get("confirmed")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  @ApiOperation({ summary: "List confirmed reservations with customer info (Staff/Admin)" })
  confirmed(@Req() req: any, @Query() q: ConfirmedQueryDto) {
    const authHeader = req?.headers?.authorization as string | undefined;
    return this.reservations.listConfirmed(req.user, q, authHeader);
  }

  @Patch(":id/checkout")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STAFF", "ADMIN")
  checkout(@Param() params: ParamIdDto, @Req() req: any) {
    return this.reservations.checkoutReservation(params.id, req.user.userId);
  }

  // ── Waitlist ────────────────────────────────────────────────────────────────

  @Post("waitlist")
  @ApiOperation({ summary: "Join the waitlist for a restaurant (Customer)" })
  @ApiResponse({ status: 201, description: "Added to waitlist" })
  @ApiResponse({ status: 409, description: "Already has active/waitlisted reservation" })
  joinWaitlist(
    @Req() req: any,
    @Body() body: { restaurantId: string; guests: number; reservedAt: string; contactPhone?: string },
  ) {
    return this.reservations.joinWaitlist(req.user.userId, body.restaurantId, {
      guests: body.guests,
      reservedAt: body.reservedAt,
      contactPhone: body.contactPhone,
    });
  }

  @Patch(":id/waitlist/leave")
  @ApiOperation({ summary: "Leave the waitlist (Customer)" })
  @ApiResponse({ status: 200, description: "Removed from waitlist" })
  leaveWaitlist(@Req() req: any, @Param() params: ParamIdDto) {
    return this.reservations.leaveWaitlist(req.user.userId, params.id);
  }
}
