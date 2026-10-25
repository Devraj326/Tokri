import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { RootShell } from '../components/layout/root-shell';

export const metadata: Metadata = {
  title: 'Tokri — Bring everyone. We’ll bring the rest.',
  description: '10-minute quick commerce with shared carts and an AI kit assistant.',
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('tokri-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <RootShell>{children}</RootShell>
        </Providers>
      </body>
    </html>
  );
}
