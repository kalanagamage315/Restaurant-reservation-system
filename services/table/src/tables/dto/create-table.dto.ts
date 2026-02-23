import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateTableDto {
  @ApiProperty({ example: "restaurant_id_here" })
  @IsString()
  @MinLength(5)
  restaurantId: string;

  @ApiProperty({ example: "T1" })
  @IsString()
  @MinLength(1)
  tableNumber: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  capacity: number;
}
