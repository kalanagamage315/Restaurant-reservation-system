import { IsOptional, IsString } from "class-validator";

export class PendingQueryDto {
  @IsOptional()
  @IsString()
  restaurantId?: string;
}
