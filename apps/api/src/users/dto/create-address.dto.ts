import { IsNumber, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  label!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  line1!: string;
}
