/**
 * Mates screen — Redirects to the new matching system.
 * This tab is hidden (href: null) but kept for route compatibility.
 */

import { Redirect } from 'expo-router';

export default function MatesRedirect() {
  return <Redirect href="/(tabs)/inbox" />;
}
