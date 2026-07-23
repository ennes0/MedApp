const SUPPORTED_BARCODE_COUNTRIES = new Set(['TR', 'US']);

type CountrySource = 'ip' | 'locale' | 'timezone' | 'unknown';

export interface DeviceCountryResult {
  countryCode: string | null;
  source: CountrySource;
}

function parseCountryFromLocale(): string | null {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  const match = locale.match(/[-_]([A-Za-z]{2})\b/);
  return match?.[1]?.toUpperCase() ?? null;
}

function parseCountryFromTimeZone(): string | null {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  const upper = tz.toUpperCase();

  // Best-effort fallback for common US/Turkey zones.
  if (upper.includes('ISTANBUL') || upper.includes('TURKEY')) return 'TR';
  if (upper.includes('NEW_YORK') || upper.includes('CHICAGO') || upper.includes('DENVER') || upper.includes('LOS_ANGELES') || upper.includes('US/')) {
    return 'US';
  }

  return null;
}

async function fetchCountryFromIp(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { country_code?: string };
    const code = data.country_code?.trim().toUpperCase();
    return code && code.length === 2 ? code : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveDeviceCountry(): Promise<DeviceCountryResult> {
  const fromIp = await fetchCountryFromIp();
  if (fromIp) {
    return { countryCode: fromIp, source: 'ip' };
  }

  const fromLocale = parseCountryFromLocale();
  if (fromLocale) {
    return { countryCode: fromLocale, source: 'locale' };
  }

  const fromTimeZone = parseCountryFromTimeZone();
  if (fromTimeZone) {
    return { countryCode: fromTimeZone, source: 'timezone' };
  }

  return { countryCode: null, source: 'unknown' };
}

export function isBarcodeCountrySupported(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return SUPPORTED_BARCODE_COUNTRIES.has(countryCode.toUpperCase());
}
