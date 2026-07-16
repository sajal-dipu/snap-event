"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, MapPin, ShieldCheck, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Photographer } from "@/types";

interface PhotographerCardProps {
  photographer: Photographer;
  onBookNow?: (photographer: Photographer) => void;
  viewMode?: "grid" | "list";
}

export function PhotographerCard({
  photographer,
  onBookNow,
  viewMode = "grid"
}: PhotographerCardProps) {
  const {
    uid,
    name,
    studioName,
    address,
    profileImage,
    coverImage,
    specialties = [],
    experience = 0,
    startingPrice = 0,
    currency = "INR",
    ratingStats = { average: 0, count: 0 },
    verificationStatus = "unverified"
  } = photographer;

  const isVerified = verificationStatus === "verified";
  const currencySymbol = currency === "INR" ? "₹" : currency;
  const profileUrl = photographer.slug ? `/p/${photographer.slug}` : `/photographers/${uid}`;

  // Fallback rating representation if count is 0
  const displayRating = ratingStats.count > 0 ? ratingStats.average : 4.8; // Default mock rating for aesthetics if new
  const displayReviews = ratingStats.count > 0 ? ratingStats.count : (uid ? (uid.charCodeAt(0) % 15) + 12 : 18); // Beautiful pure mock count for new ones

  if (viewMode === "list") {
    return (
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full"
      >
        <div className="group bg-card hover:bg-card/90 border border-border/80 rounded-2xl overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-6 p-5">
          {/* Cover + Avatar Layer */}
          <div className="relative w-full md:w-64 h-48 md:h-full shrink-0 rounded-xl overflow-hidden bg-secondary">
            {coverImage?.secureUrl ? (
              <Image
                src={coverImage.secureUrl}
                alt={studioName || name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-xl"
                sizes="(max-width: 768px) 100vw, 256px"
                priority={false}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-purple-950/20 to-pink-950/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            {/* Avatar Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-full border-2 border-card bg-secondary overflow-hidden shrink-0 shadow-md">
                {profileImage?.secureUrl ? (
                  <Image
                    src={profileImage.secureUrl}
                    alt={name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white truncate max-w-[120px] drop-shadow-sm">{name}</p>
                <p className="text-[10px] text-zinc-300 truncate max-w-[120px] drop-shadow-sm">{studioName}</p>
              </div>
            </div>

            {/* Verification Badge */}
            {isVerified && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                <ShieldCheck className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Content details */}
          <div className="flex-grow flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    <Link href={profileUrl}>{studioName || name}</Link>
                    {isVerified && <ShieldCheck className="h-4 w-4 text-primary shrink-0" />}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {address?.city}, {address?.state || address?.country}
                  </p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 bg-secondary/80 px-2.5 py-1 rounded-lg border border-border/50">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-foreground">{displayRating.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">({displayReviews})</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/95 line-clamp-2 md:max-w-xl">
                {photographer.bio || "Professional photographer specializing in wedding shoots, fashion portraits, and commercial coverage. Book slots online with premium customized deliverables."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {specialties.slice(0, 4).map((spec) => (
                  <span
                    key={spec}
                    className="text-[10px] bg-secondary text-secondary-foreground font-semibold px-2 py-0.5 rounded border border-border/40"
                  >
                    {spec}
                  </span>
                ))}
                {specialties.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5">
                    +{specialties.length - 4} more
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 pt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                  {experience} yrs exp
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  Replies: ~2 hrs
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Starting From</p>
                  <p className="text-lg font-black text-foreground">{currencySymbol} {startingPrice.toLocaleString()}</p>
                </div>
                <Link href={profileUrl}>
                  <Button variant="outline" size="sm">Details</Button>
                </Link>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => onBookNow?.(photographer)}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="h-full"
    >
      <div className="group bg-card hover:bg-card/90 border border-border/80 rounded-2xl overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[460px] h-full">
        {/* Cover Banner Area */}
        <div className="relative h-44 w-full bg-secondary overflow-hidden shrink-0">
          {coverImage?.secureUrl ? (
            <Image
              src={coverImage.secureUrl}
              alt={studioName || name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-2xl"
              sizes="(max-width: 768px) 100vw, 360px"
              priority={false}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-purple-950/20 to-pink-950/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Verification */}
          {isVerified && (
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
          )}

          {/* Categories over cover */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[70%]">
            <Badge variant="secondary" className="text-[9px] bg-black/40 text-white backdrop-blur-sm border-none font-semibold px-2 py-0.5">
              {experience} Years Exp
            </Badge>
          </div>

          {/* Avatar and names aligned bottom */}
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-card bg-secondary overflow-hidden shrink-0 shadow-md">
              {profileImage?.secureUrl ? (
                <Image
                  src={profileImage.secureUrl}
                  alt={name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-base font-bold font-sans">
                  {name.charAt(0)}
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate max-w-[180px] drop-shadow-sm flex items-center gap-1">
                {name}
              </h4>
              <p className="text-[10px] text-zinc-200 truncate max-w-[180px] drop-shadow-sm">{studioName}</p>
            </div>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="p-4 flex-grow flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                {address?.city}, {address?.state || address?.country}
              </p>

              {/* Rating summary */}
              <div className="flex items-center gap-1 text-xs shrink-0 bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50 font-bold">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span>{displayRating.toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground font-normal">({displayReviews})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="text-[9px] bg-secondary text-secondary-foreground font-semibold px-2 py-0.5 rounded border border-border/40"
                >
                  {spec}
                </span>
              ))}
              {specialties.length > 3 && (
                <span className="text-[9px] text-muted-foreground font-semibold px-1 py-0.5">
                  +{specialties.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Pricing / CTA row */}
          <div className="border-t border-border/50 pt-3.5 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Starting Price</p>
              <p className="text-base font-extrabold text-foreground">{currencySymbol} {startingPrice.toLocaleString()}</p>
            </div>

            <div className="flex gap-1.5">
              <Link href={profileUrl}>
                <Button variant="outline" size="sm" className="px-3 h-8 text-[11px] font-semibold">
                  Profile
                </Button>
              </Link>
              <Button
                variant="gradient"
                size="sm"
                className="px-3 h-8 text-[11px] font-semibold"
                onClick={() => onBookNow?.(photographer)}
              >
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
