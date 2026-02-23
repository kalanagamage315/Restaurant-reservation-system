import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateReservationDto {
  @ApiProperty({ example: "cmlf0kkrm0000w5ksaerue09n" })
  @IsString()
  restaurantId: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  guests: number;

  @ApiProperty({ example: "2026-02-28T06:24:00.000Z" })
  @IsString()
  reservedAt: string;

  // Optional direct contact number for this reservation, overrides the account number if provided.
  @ApiPropertyOptional({ example: "+94771234567", description: "Optional contact number for this reservation" })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
