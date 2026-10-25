import { IsString } from 'class-validator';

export class FirebaseVerifyDto {
  @IsString()
  idToken!: string;
}
