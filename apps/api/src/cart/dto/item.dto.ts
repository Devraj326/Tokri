import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateItemDto {
  @IsInt()
  @Min(1)
  qty!: number;
}
