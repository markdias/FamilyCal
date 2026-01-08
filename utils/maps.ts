import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

type MapsApp = 'apple' | 'google' | 'waze';

type MapDestination = {
  query?: string; // freeform address/place
  lat?: number;
  lon?: number;
};

function encodeQuery(value: string) {
  return encodeURIComponent(value.trim());
}

function buildAppleMapsUrl(dest: MapDestination) {
  if (dest.lat !== undefined && dest.lon !== undefined) {
    return `http://maps.apple.com/?ll=${dest.lat},${dest.lon}`;
  }
  if (dest.query) {
    return `http://maps.apple.com/?q=${encodeQuery(dest.query)}`;
  }
  return null;
}

function buildGoogleMapsUrl(dest: MapDestination) {
  if (dest.lat !== undefined && dest.lon !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${dest.lat},${dest.lon}`;
  }
  if (dest.query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeQuery(dest.query)}`;
  }
  return null;
}

function buildWazeUrl(dest: MapDestination) {
  if (dest.lat !== undefined && dest.lon !== undefined) {
    return `https://waze.com/ul?ll=${dest.lat},${dest.lon}&navigate=yes`;
  }
  if (dest.query) {
    return `https://waze.com/ul?q=${encodeQuery(dest.query)}&navigate=yes`;
  }
  return null;
}

export async function openInMaps(app: MapsApp, dest: MapDestination) {
  const builders: Record<MapsApp, (d: MapDestination) => string | null> = {
    apple: buildAppleMapsUrl,
    google: buildGoogleMapsUrl,
    waze: buildWazeUrl,
  };

  const preferred = builders[app](dest);
  const fallbackOrder: MapsApp[] =
    app === 'apple'
      ? ['google', 'waze']
      : app === 'google'
      ? ['apple', 'waze']
      : ['google', 'apple'];

  const urls = [preferred, ...fallbackOrder.map((alt) => builders[alt](dest))].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch (e) {
      // try next
    }
  }

  // If nothing worked and we're on web, let the browser try Google Maps query
  if (Platform.OS === 'web') {
    const webUrl = buildGoogleMapsUrl(dest);
    if (webUrl) {
      await Linking.openURL(webUrl);
      return true;
    }
  }

  return false;
}
