import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

export type MapPin = {
  id: string;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
  urgency?: "low" | "medium" | "high" | "critical";
  onClick?: () => void;
};

const URGENCY_HSL: Record<NonNullable<MapPin["urgency"]>, string> = {
  critical: "hsl(0 84% 55%)",
  high: "hsl(28 95% 55%)",
  medium: "hsl(42 95% 55%)",
  low: "hsl(142 60% 38%)",
};

const buildIcon = (urgency: MapPin["urgency"] = "medium") => {
  const color = URGENCY_HSL[urgency];
  const html = `
    <div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.25;animation:pulse 2s infinite;"></div>
      <div style="position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
    </div>`;
  return L.divIcon({
    html,
    className: "voluntrix-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const FitBounds = ({ pins }: { pins: MapPin[] }) => {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pins, map]);
  return null;
};

interface Props {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  height?: string;
}

export const LeafletMap = ({
  pins,
  center = [20, 0],
  zoom = 2,
  className = "",
  height = "100%",
}: Props) => {
  const validPins = useMemo(
    () => pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)),
    [pins],
  );

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={buildIcon(p.urgency)}
            eventHandlers={{ click: () => p.onClick?.() }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{p.title}</strong>
                {p.subtitle && (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{p.subtitle}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds pins={validPins} />
      </MapContainer>
    </div>
  );
};
