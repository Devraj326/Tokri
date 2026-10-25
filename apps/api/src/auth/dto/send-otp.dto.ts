import { IsOptional, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone!: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
