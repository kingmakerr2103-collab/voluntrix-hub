import { toUserMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete, type GeocodeResult } from "@/components/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Urgency = Database["public"]["Enums"]["urgency_level"];

interface Org {
  id: string;
  name: string;
}

interface Props {
  onCreated?: () => void;
}

export const CreateOpportunityDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name)")
        .eq("user_id", user.id)
        .in("role", ["admin", "owner"]);
      if (error) {
        toast({ title: "Couldn't load organizations", description: error.message, variant: "destructive" });
        return;
      }
      const list: Org[] = (data ?? [])
        .map((row: any) => row.organizations)
        .filter(Boolean);
      setOrgs(list);
      if (list[0]) setOrgId(list[0].id);
    })();
  }, [open, user]);

  const handleSelect = (r: GeocodeResult) => {
    setAddress(r.display_name);
    setCoords({ lat: r.lat, lon: r.lon });
  };

  const reset = () => {
    setTitle(""); setDescription(""); setCategory(""); setSkills("");
    setUrgency("medium"); setAddress(""); setCoords(null);
  };

  const submit = async () => {
    if (!user) return;
    if (!orgId) {
      toast({ title: "No organization", description: "You need admin access to an organization to post opportunities.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !coords) {
      toast({ title: "Missing info", description: "Title and a precise location are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("opportunities").insert({
      organization_id: orgId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      urgency,
      skills_required: skills.split(",").map((s) => s.trim()).filter(Boolean),
      location: address,
      latitude: coords.lat,
      longitude: coords.lon,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't create", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity posted", description: "Volunteers can now find it on the map." });
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <>
      <Button variant="hero" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New
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
              <p className="text-sm text-white/85 mt-1">Reach the right volunteers, with precise location.</p>
            </div>

            <div className="p-6 space-y-4">
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  You need to be an admin of an organization to post opportunities.
                </p>
              ) : (
                <>
                  {orgs.length > 1 && (
                    <Field label="Organization">
                      <select
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="Title">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Weekend food drive volunteers"
                      className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </Field>

                  <Field label="Precise location" hint="Search and pick to attach exact coordinates.">
                    <AddressAutocomplete
                      value={address}
                      onChange={(v) => { setAddress(v); if (coords) setCoords(null); }}
                      onSelect={handleSelect}
                      placeholder="Start typing an address…"
                    />
                    {coords && (
                      <p className="mt-1.5 text-[10px] font-mono text-primary">
                        ✓ {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                      </p>
                    )}
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

                  <Field label="Category (optional)">
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="food, education, environment…"
                      className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </Field>

                  <Field label="Skills needed (comma separated)">
                    <input
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="cooking, driving, first aid"
                      className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="What will volunteers do?"
                      className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </Field>

                  <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post opportunity"}
                  </Button>
                </>
              )}
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
