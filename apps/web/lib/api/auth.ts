import { apiFetch } from './client';
import type { AuthUser } from '../store/auth';

export interface SendOtpResponse {
  requestId: string;
  resendAfter: number;
  devOtp?: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

export function sendOtp(phone: string) {
  return apiFetch<SendOtpResponse>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    auth: false,
  });
}

export function sendEmailOtp(email: string) {
  return apiFetch<SendOtpResponse>('/auth/email-otp/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
    auth: false,
  });
}

export function verifyOtp(requestId: string, otp: string) {
  return apiFetch<VerifyOtpResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ requestId, otp }),
    auth: false,
  });
}

export function firebaseVerify(idToken: string) {
  return apiFetch<VerifyOtpResponse>('/auth/firebase/verify', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
    auth: false,
  });
}

export function updateProfile(data: { name?: string; phone?: string }) {
  return apiFetch<AuthUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function logout() {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}
