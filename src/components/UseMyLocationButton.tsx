import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCurrentLocation, type CurrentLocation } from "@/hooks/useCurrentLocation";

interface Props {
  onLocate: (loc: CurrentLocation) => void;
  variant?: "soft" | "outline" | "hero" | "ghost";
  size?: "sm" | "lg" | "default";
  className?: string;
  label?: string;
}

export const UseMyLocationButton = ({
  onLocate,
  variant = "soft",
  size = "lg",
  className,
  label = "Use my current location",
}: Props) => {
  const { request, loading } = useCurrentLocation();

  const handle = async () => {
    const loc = await request();
    if (!loc) {
      toast({
        title: "Couldn't fetch location",
        description: "Please allow location access in your browser and try again.",
        variant: "destructive",
      });
      return;
    }
    onLocate(loc);
    toast({
      title: "Location set",
      description: loc.address ?? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`,
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      {label}
    </Button>
  );
};
