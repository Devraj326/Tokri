import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdminCreateVariantDto {
  @IsString()
  size!: string;

  @IsNumber()
  @Min(0)
  mrp!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class AdminUpdateVariantDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class AdminUpsertInventoryDto {
  @IsString()
  storeId!: string;

  @IsNumber()
  @Min(0)
  qtyAvailable!: number;
}
