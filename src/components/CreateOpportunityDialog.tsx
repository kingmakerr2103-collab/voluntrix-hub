import { toUserMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete, type GeocodeResult } from "@/components/AddressAutocomplete";
import { UseMyLocationButton } from "@/components/UseMyLocationButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Urgency = Database["public"]["Enums"]["urgency_level"];

const CATEGORIES = [
  "Education", "Healthcare", "Environment", "Disaster relief",
  "Hunger", "Animals", "Elderly", "Youth", "Community", "Other",
];

interface Org { id: string; name: string }

interface Props { onCreated?: () => void }

export const CreateOpportunityDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>(""); // "" = post as individual
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [skills, setSkills] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [volunteersNeeded, setVolunteersNeeded] = useState<string>("1");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setContactEmail((cur) => cur || user.email || "");
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name)")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"]);
      const list: Org[] = (data ?? []).map((row: any) => row.organizations).filter(Boolean);
      setOrgs(list);
    })();
  }, [open, user]);

  const reset = () => {
    setTitle(""); setPurpose(""); setDescription(""); setSkills("");
    setUrgency("medium"); setAddress(""); setCoords(null); setVolunteersNeeded("1");
    setContactPhone(""); setOrgId("");
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !purpose.trim() || !coords || !contactEmail.trim()) {
      toast({
        title: "Missing info",
        description: "Title, purpose, location, and contact email are required.",
        variant: "destructive",
      });
      return;
    }
    const needed = parseInt(volunteersNeeded, 10);
    if (!needed || needed < 1) {
      toast({ title: "Invalid count", description: "Volunteers needed must be at least 1.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("opportunities").insert({
      organization_id: orgId || null,
      created_by: user.id,
      title: title.trim(),
      purpose: purpose.trim(),
      description: description.trim() || null,
      category: category,
      urgency,
      volunteers_needed: needed,
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim() || null,
      skills_required: skills.split(",").map((s) => s.trim()).filter(Boolean),
      location: address,
      latitude: coords.lat,
      longitude: coords.lon,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't create", description: toUserMessage(error), variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity posted", description: "Volunteers will be notified now." });
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <>
      <Button variant="hero" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Post
      </Button>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/40 backdrop-blur-sm animate-fade-up" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border max-h-[92vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-hero p-6 text-white relative">
              <button onClick={() => setOpen(false)} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-display text-2xl font-bold">Post an opportunity</h2>
              <p className="text-sm text-white/85 mt-1">Anyone can post — individual or organization.</p>
            </div>

            <div className="p-6 space-y-4">
              <Field label="Post as">
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Myself (individual)</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekend food drive volunteers"
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>

              <Field label="Purpose" hint="Why is this happening? Who benefits?">
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Help feed 100 families this weekend"
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>

              <Field label="Detailed description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the activity, schedule, what to bring…"
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Volunteers needed">
                  <input
                    type="number" min={1}
                    value={volunteersNeeded}
                    onChange={(e) => setVolunteersNeeded(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </Field>
              </div>

              <Field label="Location" hint="Use current location or search an address.">
                <div className="space-y-2">
                  <UseMyLocationButton
                    size="sm"
                    variant="soft"
                    label="Use my current location"
                    onLocate={(loc) => {
                      setCoords({ lat: loc.latitude, lon: loc.longitude });
                      if (loc.address) setAddress(loc.address);
                    }}
                  />
                  <AddressAutocomplete
                    value={address}
                    onChange={(v) => { setAddress(v); if (coords) setCoords(null); }}
                    onSelect={(r: GeocodeResult) => {
                      setAddress(r.display_name);
                      setCoords({ lat: r.lat, lon: r.lon });
                    }}
                    placeholder="Search address…"
                  />
                  {coords && (
                    <p className="text-[10px] font-mono text-primary">
                      ✓ {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                    </p>
                  )}
                </div>
              </Field>

              <Field label="Urgency">
                <div className="flex gap-2">
                  {(["low", "medium", "high", "critical"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
                        urgency === u
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Skills needed (comma separated, optional)">
                <input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="cooking, driving, first aid"
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Contact email">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </Field>
                <Field label="Contact phone (optional)">
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </Field>
              </div>

              <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post opportunity"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);
