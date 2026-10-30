import { IsBoolean, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class AdminCreateCouponDto {
  @IsString()
  @Length(2, 30)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['flat', 'percent'])
  discountType!: 'flat' | 'percent';

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;
}

export class AdminUpdateCouponDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['flat', 'percent'])
  discountType?: 'flat' | 'percent';

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;
}
