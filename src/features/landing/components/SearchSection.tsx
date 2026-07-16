"use client";

import * as React from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function SearchSection() {
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [category, setCategory] = React.useState("");

  const categories = [
    { value: "wedding", label: "Wedding" },
    { value: "pre-wedding", label: "Pre-Wedding" },
    { value: "birthday", label: "Birthday" },
    { value: "corporate", label: "Corporate" },
    { value: "fashion", label: "Fashion" },
    { value: "baby-shoot", label: "Baby Shoot" },
    { value: "engagement", label: "Engagement" },
    { value: "festival", label: "Festival" },
  ];

  return (
    <section className="py-12 -mt-16 relative z-25 max-w-4xl mx-auto px-4">
      <div className="glass border border-border rounded-2xl p-6 md:p-8 shadow-xl shadow-black/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Field 1: Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Search className="h-3 w-3" /> Photographer Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-border/80"
            />
          </div>

          {/* Field 2: Location */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Location
            </label>
            <Input
              type="text"
              placeholder="e.g. New York, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-background/50 border-border/80"
            />
          </div>

          {/* Field 3: Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Event Type
            </label>
            <Select
              options={categories}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Select event style"
              className="bg-background/50 border-border/80"
            />
          </div>
        </div>

        <Button variant="gradient" className="w-full mt-6 h-12 justify-center font-bold text-sm">
          Search Photographers
        </Button>
      </div>
    </section>
  );
}
