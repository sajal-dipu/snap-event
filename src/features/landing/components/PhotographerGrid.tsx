"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Award, ArrowUpRight, Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { getPlaceholderImage } from "@/utils/helpers";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { Photographer } from "@/types";

const fetchPublishedPhotographers = async (): Promise<Photographer[]> => {
  try {
    const snaps = await getDocs(
      query(
        collection(db, "photographers"),
        where("isPublished", "==", true)
      )
    );
    const docs = snaps.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        ...data,
        ratingStats: data.ratingStats || { average: 0, count: 0 },
        specialties: data.specialties || data.specializations || [],
        experience: data.experience || 0,
        startingPrice: data.startingPrice || data.hourlyPrice || data.hourlyRate || 1000,
        currency: data.currency || "INR",
      };
    }) as Photographer[];

    console.log("Fetched photographers:", docs);
    return docs;
  } catch (error) {
    console.error("Marketplace Fetch Error:", error);
    throw error;
  }
};

export function PhotographerGrid() {
  const { data: photographers = [], isLoading } = useQuery({
    queryKey: ["publishedPhotographers"],
    queryFn: fetchPublishedPhotographers,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="photographers">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Scanning published photographers...</p>
        </div>
      </section>
    );
  }

  if (photographers.length === 0) {
    return (
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="photographers">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto bg-card border border-border/80 rounded-3xl p-8 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-505 mb-6">
              <Camera className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">No photographers available yet.</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Photographers will appear here once they publish their profiles.
            </p>
            <Link href="/signup" className="w-full">
              <Button size="lg" className="w-full font-semibold shadow-lg shadow-indigo-500/10">
                Become the First Photographer
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="photographers">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16">
          <div className="text-left max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Photographers</h2>
            <p className="text-muted-foreground">
              Book highly experienced and reviewed verified professionals in your city.
            </p>
          </div>
          <Link href="/photographers">
            <Button variant="outline" className="gap-2">
              View All Photographers <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {photographers.map((p, index) => {
            const avatarUrl = p.profileImage?.secureUrl || p.profilePhoto || getPlaceholderImage("avatar", index % 6);
            const coverUrl = p.coverImage?.secureUrl || p.coverPhoto || getPlaceholderImage("wedding", index % 4);
            const profileUrl = p.slug ? `/p/${p.slug}` : `/photographers/${p.uid}`;
            const currencySymbol = p.currency === "INR" ? "₹" : p.currency === "USD" ? "$" : "₹";
            
            return (
              <motion.div
                key={p.uid}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="group overflow-hidden border-border bg-card shadow-lg hover:shadow-xl dark:shadow-black/5 hover:-translate-y-1 hover:border-indigo-500/20 transition-all flex flex-col h-full">
                  {/* Cover block */}
                  <div className="relative h-32 overflow-hidden bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt="Portfolio cover"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                    />
                    <Badge variant="success" className="absolute top-3 right-3 bg-black/50 hover:bg-black/50 text-white border-white/10 backdrop-blur-sm">
                      Verified
                    </Badge>
                  </div>

                  {/* Body details */}
                  <CardContent className="relative px-5 pb-5 pt-0 flex-grow">
                    {/* Avatar placement */}
                    <div className="absolute -top-8 left-5 border-4 border-card rounded-full shadow-md overflow-hidden bg-card">
                      <Avatar src={avatarUrl} fallback={p.name || p.displayName || "Unknown"} size="md" className="border-0" />
                    </div>

                    <div className="pt-10 flex flex-col gap-3">
                      <div>
                        <h3 className="font-bold text-base text-foreground tracking-tight line-clamp-1">{p.name || p.displayName || "Unknown Photographer"}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.studioName || p.businessName || "Professional Photographer"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground border-y border-border/40 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <span>{p.address?.city || p.location || "Local City"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <span>{p.experience || 0} years experience</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 stroke-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-foreground">
                            {(p.ratingStats?.average || 4.8).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">({p.ratingStats?.count || 0})</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Starts at </span>
                          <span className="text-sm font-bold text-foreground">{currencySymbol}{p.startingPrice || 1000}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  {/* Actions footer */}
                  <CardFooter className="px-5 pb-5 pt-0 gap-2.5">
                    <Link href={profileUrl} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                        Profile
                      </Button>
                    </Link>
                    <Link href={profileUrl} className="flex-1">
                      <Button variant="default" size="sm" className="w-full text-xs font-semibold">
                        Book Now
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
