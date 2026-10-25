import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateKitDto {
  @IsString()
  prompt!: string;

  @IsString()
  storeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;
}
