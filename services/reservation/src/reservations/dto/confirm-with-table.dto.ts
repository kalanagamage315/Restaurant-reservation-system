import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ConfirmWithTableDto {
  @ApiProperty({ example: "tbl_abc123" })
  @IsString()
  tableId: string;
}
