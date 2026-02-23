import { IsOptional, IsString } from "class-validator";

export class ConfirmReservationDto {
  @IsOptional()
  @IsString()
  tableId?: string;
}
