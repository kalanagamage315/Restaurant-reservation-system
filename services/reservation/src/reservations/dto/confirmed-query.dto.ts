import { IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ConfirmedQueryDto {
  @ApiProperty({ description: "YYYY-MM-DD" })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: "HH:mm (optional)" })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: "Admin can pass restaurantId. Staff will be locked anyway." })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({ description: 'Table number like "T1"' })
  @IsOptional()
  @IsString()
  tableNumber?: string;
}
