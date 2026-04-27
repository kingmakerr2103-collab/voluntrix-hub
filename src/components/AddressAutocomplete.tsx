import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type GeocodeResult = {
  display_name: string;
  lat: number;
  lon: number;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
};

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Address autocomplete using OpenStreetMap's free Nominatim API.
 * No API key required. Debounced 350ms, respects 1 req/sec usage policy.
 */
export const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search address or place…",
  className,
}: Props) => {
  const [results, setResults] = useState<NominatimItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.trim().length < 3) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "0");
        url.searchParams.set("limit", "6");
        url.searchParams.set("q", value);
        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        const data: NominatimItem[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const handlePick = (item: NominatimItem) => {
    const result: GeocodeResult = {
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    };
    onChange(item.display_name);
    onSelect(result);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-card border border-border rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg max-h-64 overflow-y-auto"
        >
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-start gap-2 transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
