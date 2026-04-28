import { useState } from "react";

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  address: string | null;
};

/**
 * Browser geolocation + reverse-geocode via OpenStreetMap Nominatim.
 * No API key required. Use as: const { request, loading } = useCurrentLocation();
 */
export const useCurrentLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (): Promise<CurrentLocation | null> => {
    setError(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by this device.");
      return null;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });
      const { latitude, longitude } = pos.coords;
      let address: string | null = null;
      try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.searchParams.set("format", "json");
        url.searchParams.set("lat", String(latitude));
        url.searchParams.set("lon", String(longitude));
        url.searchParams.set("zoom", "14");
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data: { display_name?: string } = await res.json();
          address = data?.display_name ?? null;
        }
      } catch {
        // Reverse geocode failed; coords still useful.
      }
      return { latitude, longitude, address };
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError
          ? err.code === 1
            ? "Location permission denied."
            : "Couldn't get your location."
          : "Couldn't get your location.";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { request, loading, error };
};
