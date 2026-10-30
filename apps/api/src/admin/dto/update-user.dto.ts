import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
