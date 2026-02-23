import { ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsISO8601,
    IsInt,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Min,
} from "class-validator";

export class UpdateReservationDto {
    @ApiPropertyOptional({ example: "2026-03-01T19:00:00.000+05:30", description: "New reservation date/time (ISO 8601)" })
    @IsOptional()
    @IsISO8601()
    reservedAt?: string;

    @ApiPropertyOptional({ example: 4, description: "New guest count (min 1)" })
    @IsOptional()
    @IsInt()
    @Min(1)
    guests?: number;

    @ApiPropertyOptional({ example: "+94771234567", description: "Contact phone number" })
    @IsOptional()
    @IsString()
    contactPhone?: string;
}
