import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;
const MAX_SENDS_PER_IDENTIFIER_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 20;
const REFRESH_TOKEN_COOKIE = 'refresh_token';

type OtpChannel = 'phone' | 'email';

interface OtpRecord {
  channel: OtpChannel;
  identifier: string;
  otpHmac: string;
  attempts: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private hmacOtp(otp: string, requestId: string): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-secret';
    return createHmac('sha256', secret).update(`${requestId}:${otp}`).digest('hex');
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async sendOtp(phone: string, ip: string): Promise<{ requestId: string; resendAfter: number; devOtp?: string }> {
    const { requestId, resendAfter, otp } = await this.createOtpSession('phone', phone, ip);

    const mockOtp = (this.config.get<string>('MOCK_OTP') ?? 'true') === 'true';
    if (mockOtp) {
      // eslint-disable-next-line no-console
      console.log(`[mock-otp] +91${phone} -> ${otp} (requestId=${requestId})`);
      return { requestId, resendAfter, devOtp: otp };
    }

    // Real send path: wire up MSG91 here once DLT template + auth key are configured.
    throw new BadRequestException('Live SMS sending is not configured. Set MOCK_OTP=true for dev.');
  }

  async sendEmailOtp(email: string, ip: string): Promise<{ requestId: string; resendAfter: number; devOtp?: string }> {
    const { requestId, resendAfter, otp } = await this.createOtpSession('email', email, ip);

    const mockEmailOtp = (this.config.get<string>('MOCK_EMAIL_OTP') ?? 'true') === 'true';
    if (mockEmailOtp) {
      // eslint-disable-next-line no-console
      console.log(`[mock-email-otp] ${email} -> ${otp} (requestId=${requestId})`);
      return { requestId, resendAfter, devOtp: otp };
    }

    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const senderEmail = this.config.get<string>('BREVO_SENDER_EMAIL');
    if (!apiKey || !senderEmail) throw new BadRequestException('Email sending is not configured. Set MOCK_EMAIL_OTP=true for dev.');

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Tokri', email: senderEmail },
        to: [{ email }],
        subject: `Your Tokri code is garam-garam: ${otp}`,
        htmlContent: `<p>Your Tokri sign-in code is <b style="font-size:20px">${otp}</b> — fresher than your subzi. Use it in the next 5 minutes before it goes soggy.</p>`,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new BadRequestException(body.message || 'Could not send the email. Try again.');
    }

    return { requestId, resendAfter };
  }

  private async createOtpSession(channel: OtpChannel, identifier: string, ip: string) {
    const identifierRateKey = `otp:rate:${channel}:${identifier}`;
    const ipRateKey = `otp:rate:ip:${ip}`;
    const cooldownKey = `otp:cooldown:${channel}:${identifier}`;

    const [identifierCount, ipCount, onCooldown] = await Promise.all([
      this.redis.incr(identifierRateKey),
      this.redis.incr(ipRateKey),
      this.redis.get(cooldownKey),
    ]);
    if (identifierCount === 1) await this.redis.expire(identifierRateKey, 3600);
    if (ipCount === 1) await this.redis.expire(ipRateKey, 3600);

    if (onCooldown) {
      throw new BadRequestException('Please wait before requesting another code');
    }
    if (identifierCount > MAX_SENDS_PER_IDENTIFIER_PER_HOUR) {
      throw new BadRequestException('Too many code requests. Try again later.');
    }
    if (ipCount > MAX_SENDS_PER_IP_PER_HOUR) {
      throw new BadRequestException('Too many code requests from this network. Try again later.');
    }

    const requestId = randomUUID();
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const record: OtpRecord = { channel, identifier, otpHmac: this.hmacOtp(otp, requestId), attempts: 0 };

    await this.redis.set(`otp:req:${requestId}`, JSON.stringify(record), 'EX', OTP_TTL_SECONDS);
    await this.redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS);

    return { requestId, resendAfter: RESEND_COOLDOWN_SECONDS, otp };
  }

  async verifyOtp(requestId: string, otp: string) {
    const key = `otp:req:${requestId}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('OTP expired or invalid, please request a new one');

    const record: OtpRecord = JSON.parse(raw);
    const candidateHmac = this.hmacOtp(otp, requestId);

    if (candidateHmac !== record.otpHmac) {
      record.attempts += 1;
      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        await this.redis.del(key);
        throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
      }
      await this.redis.set(key, JSON.stringify(record), 'KEEPTTL');
      throw new BadRequestException('Incorrect OTP');
    }

    await this.redis.del(key);
    return this.findOrCreateUserAndIssueTokens(
      record.channel === 'email' ? { email: record.identifier } : { phone: record.identifier },
    );
  }

  private firebaseApp: App | null = null;

  private getFirebaseAdmin(): App {
    if (this.firebaseApp) return this.firebaseApp;
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new BadRequestException('Firebase phone auth is not configured');
    }
    this.firebaseApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return this.firebaseApp;
  }

  async verifyFirebaseToken(idToken: string) {
    const decoded = await getAuth(this.getFirebaseAdmin())
      .verifyIdToken(idToken)
      .catch(() => {
        throw new UnauthorizedException('Invalid or expired sign-in token');
      });

    const phoneE164 = decoded.phone_number;
    if (!phoneE164) throw new BadRequestException('No phone number on this sign-in token');
    const phone = phoneE164.replace(/^\+91/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) throw new BadRequestException('Unsupported phone number');

    return this.findOrCreateUserAndIssueTokens({ phone });
  }

  private async findOrCreateUserAndIssueTokens(identity: { phone?: string; email?: string }) {
    const existing = await this.prisma.user.findFirst({
      where: identity.email ? { email: identity.email } : { phone: identity.phone },
    });
    const isNewUser = !existing;
    const user = existing ?? (await this.prisma.user.create({ data: identity }));

    const { accessToken, refreshToken } = await this.issueTokens(user.id);
    return { accessToken, refreshToken, user, isNewUser };
  }

  async issueTokens(userId: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as unknown as number,
      },
    );

    const refreshToken = randomBytes(32).toString('hex');
    const ttlDays = Number(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '30');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashRefreshToken(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('No refresh token');

    const tokenHash = this.hashRefreshToken(rawToken);
    const record = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

    const { accessToken, refreshToken, refreshTokenExpiresAt } = await this.issueTokens(record.userId);
    return { accessToken, refreshToken, refreshTokenExpiresAt, userId: record.userId };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = this.hashRefreshToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static readonly REFRESH_TOKEN_COOKIE = REFRESH_TOKEN_COOKIE;
}
