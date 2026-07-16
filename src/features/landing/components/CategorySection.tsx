"use client";

import { motion } from "framer-motion";
import { Heart, Gift, Briefcase, Sparkles, Baby, Activity, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { getPlaceholderImage } from "@/utils/helpers";

export function CategorySection() {
  const categories = [
    { name: "Wedding", icon: Heart, count: "1,200+ bookings", tag: "wedding", imgIdx: 0 },
    { name: "Pre-Wedding", icon: Heart, count: "800+ bookings", tag: "wedding", imgIdx: 1 },
    { name: "Birthday", icon: Gift, count: "1,500+ bookings", tag: "event", imgIdx: 0 },
    { name: "Corporate", icon: Briefcase, count: "900+ bookings", tag: "event", imgIdx: 1 },
    { name: "Fashion", icon: Sparkles, count: "700+ bookings", tag: "portrait", imgIdx: 0 },
    { name: "Baby Shoot", icon: Baby, count: "500+ bookings", tag: "portrait", imgIdx: 1 },
    { name: "Engagement", icon: Activity, count: "600+ bookings", tag: "wedding", imgIdx: 2 },
    { name: "Festival", icon: Music, count: "400+ bookings", tag: "event", imgIdx: 2 },
  ];

  return (
    <section className="py-20 bg-background" id="categories">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Event Style Categories</h2>
          <p className="text-muted-foreground">
            Explore styles matching your exact theme needs.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat, index) => {
            const bgUrl = getPlaceholderImage(cat.tag as "wedding" | "avatar" | "portrait" | "event" | "scenery", cat.imgIdx);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="group overflow-hidden cursor-pointer relative h-48 border-0">
                  {/* Background image wrapper */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bgUrl}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-40 dark:opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

                  <CardContent className="relative z-20 h-full flex flex-col justify-end p-6">
                    <div className="bg-primary/20 text-white border border-white/10 p-2.5 rounded-lg w-fit mb-3 flex items-center justify-center backdrop-blur-sm">
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-0.5">{cat.name}</h3>
                    <p className="text-xs text-zinc-300 font-medium">{cat.count}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
