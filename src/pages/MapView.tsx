import { PlaceholderPage } from "@/components/PlaceholderPage";
import { MapPin } from "lucide-react";
const MapView = () => (
  <PlaceholderPage
    title="Map of impact"
    description="Live map of needs, projects and volunteers around you."
    icon={<MapPin className="h-7 w-7" />}
  />
);
export default MapView;
