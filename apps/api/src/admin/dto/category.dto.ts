import { IsOptional, IsString, Length } from 'class-validator';

export class AdminCreateCategoryDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  hindiName?: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class AdminUpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  hindiName?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
