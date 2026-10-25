const PATHS: Record<string, string> = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  kit: '<path d="M4 11h16l-1.5 8h-13z"/><path d="M8 11c0-3 1.5-5 4-5s4 2 4 5"/><path d="M12 3v3"/>',
  tokri: '<path d="M3 10h18l-2 10H5z"/><path d="M7 10l3-6M17 10l-3-6"/><path d="M8 14h8M9 17h6"/>',
  cart: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/>',
  up: '<path d="M7 11v9H4v-9zM7 11l4-7c2 0 3 1 2.5 3L13 10h6c1 0 2 1 1.7 2.2l-1.6 6.5c-.2.8-1 1.3-1.8 1.3H7"/>',
  down: '<path d="M7 13V4H4v9zM7 13l4 7c2 0 3-1 2.5-3L13 14h6c1 0 2-1 1.7-2.2l-1.6-6.5C18.9 4.5 18.1 4 17.3 4H7"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  cash: '<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',
  door: '<path d="M6 21V4h12v17"/><path d="M3 21h18"/><circle cx="14.5" cy="12.5" r="1"/>',
  paw: '<circle cx="6.5" cy="10" r="2"/><circle cx="17.5" cy="10" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><path d="M8 17.5c0-3 2-5.5 4-5.5s4 2.5 4 5.5c0 2-2 2.2-4 1.2-2 1-4 .8-4-1.2z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  scooter: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l3-7h-4M6 14l2-6h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
};

export function Icon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
