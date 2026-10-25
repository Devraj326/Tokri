import { IsOptional, IsString } from 'class-validator';

export class CreateSoloCartDto {
  @IsString()
  storeId!: string;

  @IsOptional()
  @IsString()
  addressId?: string;
}

export class CreateSharedCartDto extends CreateSoloCartDto {
  @IsString()
  name!: string;
}
