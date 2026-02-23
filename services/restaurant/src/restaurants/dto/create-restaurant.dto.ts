import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm

export class CreateRestaurantDto {
  @ApiProperty({ example: "Sankha's Kitchen" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: "Colombo 07" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "0771234567" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "09:00", description: "Opening time in HH:mm format" })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "openTime must be in HH:mm format (e.g. 09:00)" })
  openTime?: string;

  @ApiPropertyOptional({ example: "22:00", description: "Closing time in HH:mm format" })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "closeTime must be in HH:mm format (e.g. 22:00)" })
  closeTime?: string;

  @ApiPropertyOptional({
    example: ["MONDAY", "TUESDAY", "SATURDAY"],
    description: "Open days of the week",
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(VALID_DAYS, { each: true })
  openDays?: string[];
}
