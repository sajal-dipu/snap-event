"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { getPlaceholderImage } from "@/utils/helpers";

export function TestimonialsSection() {
  const testimonials = [
    { name: "Jessica Alba", role: "Bride", rating: 5, comment: "Matching only my photos in a room with 300 guests felt like magic! We downloaded everything without scrolling.", img: 0 },
    { name: "John Doe", role: "Photographer", rating: 5, comment: "No more sorting through Google Drive links. Generating the QR code handles client delivery automatically.", img: 1 },
    { name: "Sophia Martinez", role: "Corporate Event Host", rating: 5, comment: "Our guests were amazed. Having photos linked directly to their phones made the event extremely engaging.", img: 2 },
    { name: "Brian O'Conner", role: "Groom", rating: 4, comment: "Found our photographer here. Secure downloads and pricing clarity were exactly what we were looking for.", img: 3 },
    { name: "Lana Rhoades", role: "Fashion Designer", rating: 5, comment: "I use this platform for all my studio portfolio launches. Outstanding UI and very reliable load speeds.", img: 4 },
    { name: "Emily Blunt", role: "Parent", rating: 5, comment: "We booked baby shoots. Beautiful dashboard and easy download approval requests from Hiroshi Sato.", img: 0 },
  ];

  return (
    <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Hosts & Photographers</h2>
          <p className="text-muted-foreground">
            Here&apos;s what our community says about their booking and sharing experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => {
            const avatarUrl = getPlaceholderImage("avatar", t.img);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="hover:border-indigo-500/20 bg-card border-border hover:shadow-lg dark:hover:shadow-black/5 transition-all duration-300 h-full relative">
                  <div className="absolute top-6 right-6 text-zinc-200 dark:text-zinc-800">
                    <Quote className="h-8 w-8 rotate-180" />
                  </div>

                  <CardContent className="p-8 flex flex-col justify-between h-full gap-6">
                    <div className="space-y-4">
                      {/* Rating stars */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed italic">
                        &quot;{t.comment}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Avatar src={avatarUrl} fallback={t.name} size="sm" />
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-none">{t.name}</h4>
                        <span className="text-xs text-muted-foreground">{t.role}</span>
                      </div>
                    </div>
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
