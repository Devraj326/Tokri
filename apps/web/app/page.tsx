'use client';

import { useAuthStore } from '../lib/store/auth';
import { LandingScreen } from '../components/screens/landing-screen';
import { HomeScreen } from '../components/screens/home-screen';

export default function Home() {
  const user = useAuthStore((s) => s.user);
  return user ? <HomeScreen /> : <LandingScreen />;
}
