import { apiFetch } from './client';

export interface AddressDto {
  id: string;
  label: string;
  lat: number;
  lng: number;
  line1: string;
}

export function listAddresses() {
  return apiFetch<AddressDto[]>('/addresses');
}

export function createAddress(data: { label: string; lat: number; lng: number; line1: string }) {
  return apiFetch<AddressDto>('/addresses', { method: 'POST', body: JSON.stringify(data) });
}

export function addPantryItem(name: string, kind: 'pantry' | 'tool' = 'pantry') {
  return apiFetch('/pantry', { method: 'POST', body: JSON.stringify({ name, kind }) });
}
