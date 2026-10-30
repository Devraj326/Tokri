import { IsBoolean, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class AdminCreateStoreDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class AdminUpdateStoreDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}
