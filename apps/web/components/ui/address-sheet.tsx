'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createAddress, listAddresses } from '../../lib/api/addresses';
import { nearestStore } from '../../lib/api/catalog';
import { useSessionStore } from '../../lib/store/session';
import { Icon } from './icons';

export function AddressSheet({ onClose }: { onClose: () => void }) {
  const setLocation = useSessionStore((s) => s.setLocation);
  const lat = useSessionStore((s) => s.lat);
  const lng = useSessionStore((s) => s.lng);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });

  async function choose(addressId: string, chosenLat: number, chosenLng: number) {
    setSwitching(addressId);
    try {
      const res = await nearestStore(chosenLat, chosenLng);
      if (res.serviceable && res.storeId && res.storeName && res.etaMinutes != null) {
        setLocation({ storeId: res.storeId, storeName: res.storeName, etaMinutes: res.etaMinutes, lat: chosenLat, lng: chosenLng });
      }
      onClose();
    } finally {
      setSwitching(null);
    }
  }

  function addNewHere() {
    if (!navigator.geolocation) return addFromCoords(lat ?? 12.9716, lng ?? 77.6412);
    setAdding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => addFromCoords(pos.coords.latitude, pos.coords.longitude),
      () => addFromCoords(lat ?? 12.9716, lng ?? 77.6412),
      { timeout: 8000 },
    );
  }

  async function addFromCoords(newLat: number, newLng: number) {
    try {
      const label = `Address ${(addressesQuery.data?.length ?? 0) + 1}`;
      const created = await createAddress({ label, lat: newLat, lng: newLng, line1: 'Current location' });
      qc.invalidateQueries({ queryKey: ['addresses'] });
      await choose(created.id, newLat, newLng);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="sheetback" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label="Choose delivery address">
        <p className="font-display" style={{ fontSize: 24, marginBottom: 6 }}>Deliver to</p>
        {addressesQuery.data?.map((a) => (
          <button
            key={a.id}
            className="opt"
            role="radio"
            aria-checked={a.lat === lat && a.lng === lng}
            disabled={switching === a.id}
            onClick={() => choose(a.id, a.lat, a.lng)}
          >
            <span className="radio" />
            <span>
              <b>{a.label}</b>
              <br />
              <span className="small muted">{a.line1}</span>
            </span>
          </button>
        ))}
        {addressesQuery.data?.length === 0 && (
          <p className="small muted" style={{ padding: '8px 0' }}>No saved addresses yet.</p>
        )}
        <button className="btn ghost block" style={{ marginTop: 12 }} onClick={addNewHere} disabled={adding}>
          <Icon name="pin" className="h-[18px] w-[18px]" /> {adding ? 'Locating…' : 'Add this location'}
        </button>
      </div>
    </div>
  );
}
