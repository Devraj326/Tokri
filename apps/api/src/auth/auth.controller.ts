import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { SendEmailOtpDto } from './dto/send-email-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { FirebaseVerifyDto } from './dto/firebase-verify.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      // Frontend (Vercel) and backend (Render) are on different domains in production,
      // so the refresh cookie needs SameSite=None to be sent on cross-site requests.
      // 'lax' only works when both are on the same site, which is fine for local dev.
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      domain: this.config.get<string>('COOKIE_DOMAIN') || undefined,
      maxAge: Number(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '30') * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }

  @Post('otp/send')
  @HttpCode(200)
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.auth.sendOtp(dto.phone, ip);
  }

  @Post('email-otp/send')
  @HttpCode(200)
  async sendEmailOtp(@Body() dto: SendEmailOtpDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.auth.sendEmailOtp(dto.email, ip);
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user, isNewUser } = await this.auth.verifyOtp(dto.requestId, dto.otp);
    res.cookie(AuthService.REFRESH_TOKEN_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user: { id: user.id, phone: user.phone, email: user.email, name: user.name }, isNewUser };
  }

  @Post('firebase/verify')
  @HttpCode(200)
  async verifyFirebase(@Body() dto: FirebaseVerifyDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user, isNewUser } = await this.auth.verifyFirebaseToken(dto.idToken);
    res.cookie(AuthService.REFRESH_TOKEN_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken, user: { id: user.id, phone: user.phone, email: user.email, name: user.name }, isNewUser };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[AuthService.REFRESH_TOKEN_COOKIE];
    const { accessToken, refreshToken } = await this.auth.refresh(rawToken);
    res.cookie(AuthService.REFRESH_TOKEN_COOKIE, refreshToken, this.cookieOptions());
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[AuthService.REFRESH_TOKEN_COOKIE];
    await this.auth.logout(rawToken);
    res.clearCookie(AuthService.REFRESH_TOKEN_COOKIE, { path: '/' });
  }
}
