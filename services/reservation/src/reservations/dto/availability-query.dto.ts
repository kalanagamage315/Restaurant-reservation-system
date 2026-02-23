import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsInt, IsISO8601, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class AvailabilityQueryDto {
  @ApiProperty({ example: "rest_001" })
  @IsString()
  restaurantId: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests: number;

  @ApiProperty({ example: "2026-02-11T18:30:00.000Z" })
  @IsISO8601()
  reservedAt: string;

  @ApiPropertyOptional({ example: 90, default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMins?: number;
}
