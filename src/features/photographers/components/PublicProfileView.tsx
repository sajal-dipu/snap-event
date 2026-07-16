"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Clock,
  Star,
  Award,
  ChevronRight,
  ShieldCheck,
  Camera,
  Sparkles,
  Mail,
  Phone,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  Globe,
  CheckCircle,
  Languages,
  Briefcase
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BookingFormModal } from "@/features/bookings/components/BookingFormModal";
import { reviewService } from "@/services/ReviewService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { Photographer } from "@/types";

// Custom inline SVG icons
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

interface PublicProfileViewProps {
  photographer: Photographer;
}

// Fetch active photographers for similar recommendations
const fetchActivePhotographers = async (): Promise<Photographer[]> => {
  const snaps = await getDocs(
    query(
      collection(db, "photographers"),
      where("isActive", "==", true),
      where("isSuspended", "==", false),
      where("isPublished", "==", true)
    )
  );
  return snaps.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      ...data,
      ratingStats: data.ratingStats || { average: 0, count: 0 },
      specialties: data.specialties || [],
      experience: data.experience || 0,
      startingPrice: data.startingPrice || 0,
      currency: data.currency || "INR",
    };
  }) as Photographer[];
};

export function PublicProfileView({ photographer }: PublicProfileViewProps) {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [initialBudget, setInitialBudget] = useState<string | undefined>(undefined);
  const [initialNotes, setInitialNotes] = useState<string | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    uid,
    name,
    studioName,
    businessName,
    tagline,
    bio,
    phone,
    email,
    whatsappNumber,
    contactEmail,
    address,
    profileImage,
    coverImage,
    logo,
    portfolioImages = [],
    portfolio = [],
    specialties = [],
    specializations = [],
    experience = 0,
    languages = [],
    pricingPackages = [],
    packages = [],
    startingPrice = 0,
    currency = "INR",
    vacationMode = false,
    unavailableDates = [],
    availability = {},
    socialLinks = {},
    ratingStats = { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } }
  } = photographer;

  const currencySymbol = currency === "INR" ? "₹" : currency;

  // React Query to fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["photographerReviews", uid],
    queryFn: () => reviewService.listByPhotographer(uid).then((res) => res.data)
  });

  // React Query to fetch similar photographers
  const { data: allPhotographers = [] } = useQuery({
    queryKey: ["activePhotographers"],
    queryFn: fetchActivePhotographers
  });

  const similarPhotographers = useMemo(() => {
    return allPhotographers
      .filter(
        (p) =>
          p.uid !== uid &&
          (p.address?.city === address?.city ||
            p.specialties?.some((s) => specialties.includes(s)))
      )
      .slice(0, 3);
  }, [allPhotographers, uid, address?.city, specialties]);

  // Combined Portfolio display source (doc field or subcollection)
  const displayPortfolio = useMemo(() => {
    return portfolio.length > 0 ? portfolio : portfolioImages;
  }, [portfolio, portfolioImages]);

  // Extract unique categories from portfolio images
  const portfolioCategories = useMemo(() => {
    const cats = new Set<string>();
    displayPortfolio.forEach((img: any) => {
      if (img.category) cats.add(img.category);
    });
    return ["All", ...Array.from(cats)];
  }, [displayPortfolio]);

  // Filter portfolio images
  const filteredPortfolio = useMemo(() => {
    return selectedCategory === "All"
      ? displayPortfolio
      : displayPortfolio.filter((img: any) => img.category === selectedCategory);
  }, [displayPortfolio, selectedCategory]);

  // Sort portfolio images: Featured first
  const sortedPortfolio = useMemo(() => {
    return [...filteredPortfolio].sort((a: any, b: any) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });
  }, [filteredPortfolio]);

  // Combined packages list
  const displayPackages = useMemo(() => {
    return packages.length > 0 ? packages : pricingPackages;
  }, [packages, pricingPackages]);

  const displayRating = ratingStats.count > 0 ? ratingStats.average : 4.8;
  const displayReviewsCount = ratingStats.count > 0 ? ratingStats.count : reviews.length || 0;

  // FAQ list specific to photographers
  const faqs = [
    {
      q: "What gear and backups do you bring to a shoot?",
      a: `I shoot with primary and backup full-frame mirrorless camera bodies, high-speed prime/zoom lenses, off-camera flashes, and multiple memory cards to ensure zero interruption during your special moments.`
    },
    {
      q: "How long does it take to deliver finalized photos?",
      a: "Sneak-peek photos are shared within 48 hours of the event. The complete fully-retouched high-resolution digital gallery is delivered within 3 to 4 weeks via a secure SnapEvent virtual room."
    },
    {
      q: "What is your cancellation and rescheduling policy?",
      a: "Rescheduling is free if made at least 14 days before the event, subject to availability. Cancellations within 7 days of the shoot date may incur a 25% scheduling hold fee."
    },
    {
      q: "Do you provide raw, unedited camera files?",
      a: "To maintain creative style and quality standards, I deliver edited, color-graded, high-resolution JPEG files. Raw files are not provided as they represent unfinished work."
    }
  ];

  // Calendar builder helper
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Add empty slots for offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Add real days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Determine availability status
      // We resolve status from availability map, default to unavailable if not marked
      let status: "available" | "booked" | "unavailable" = "unavailable";
      if (vacationMode) {
        status = "unavailable";
      } else if (availability && (availability as any)[dateStr]) {
        status = (availability as any)[dateStr];
      } else if (unavailableDates.includes(dateStr)) {
        status = "unavailable";
      }

      days.push({ dayNum: d, dateStr, status });
    }

    return days;
  }, [currentDate, vacationMode, availability, unavailableDates]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: any) => {
    if (day && day.status === "available") {
      setInitialDate(day.dateStr);
      setInitialNotes(`Pre-selected date from availability calendar: ${day.dateStr}`);
      setBookingModalOpen(true);
    }
  };

  // Star distribution helpers
  const dist = ratingStats.distribution || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  const totalDist = Object.values(dist).reduce((acc, curr) => acc + curr, 0) || 1;

  // Contact variables
  const resolvedPhone = phone || "";
  const resolvedWhatsapp = whatsappNumber || "";
  const resolvedEmail = contactEmail || email || "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-foreground pb-24 font-sans">
      {/* Cover Image Banner */}
      <div className="relative h-[220px] md:h-[360px] w-full overflow-hidden bg-gradient-to-r from-indigo-950 via-purple-950 to-pink-950">
        {coverImage?.secureUrl ? (
          <Image
            src={coverImage.secureUrl}
            alt={studioName || name}
            fill
            className="object-cover opacity-80"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-transparent to-black/30" />
      </div>

      {/* Profile Header Details Card */}
      <div className="container mx-auto px-4 -mt-20 md:-mt-28 relative z-10">
        <div className="bg-card/75 backdrop-blur-md border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Avatar and Names */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="relative shrink-0">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-card bg-secondary overflow-hidden shadow-xl">
                  {profileImage?.secureUrl ? (
                    <Image
                      src={profileImage.secureUrl}
                      alt={name}
                      width={144}
                      height={144}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                      <Camera className="h-10 w-10" />
                    </div>
                  )}
                </div>
                {logo?.secureUrl && (
                  <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-xl bg-card border border-border p-1 shadow-md flex items-center justify-center">
                    <img src={logo.secureUrl} className="w-full h-full object-contain" alt="Studio Logo" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{name}</h1>
                  <ShieldCheck className="h-5.5 w-5.5 text-primary fill-primary/10" />
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-full uppercase">
                    {experience} Years Exp
                  </span>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {studioName} {businessName ? `(${businessName})` : ""}
                </p>
                {tagline && (
                  <p className="text-xs italic text-muted-foreground/80 max-w-lg">
                    &ldquo;{tagline}&rdquo;
                  </p>
                )}
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-muted-foreground pt-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {photographer.location || address?.city || "Location not configured"}
                  </span>
                  <span className="flex items-center gap-1 font-bold">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    {displayRating.toFixed(1)} ({displayReviewsCount} Reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Pricing Summary & CTA */}
            <div className="flex flex-col items-center md:items-end gap-2 border-t md:border-t-0 border-border/50 pt-4 md:pt-0 w-full md:w-auto self-center md:self-end">
              <div className="text-center md:text-right">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Starting Rate</p>
                <p className="text-2xl font-black text-foreground">
                  {currencySymbol} {startingPrice.toLocaleString()}
                </p>
              </div>
              <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20 gap-2" onClick={() => setBookingModalOpen(true)}>
                Book Shoot Now <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="container mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Tabs) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-border bg-card/60 p-1.5 rounded-2xl border overflow-x-auto scrollbar-none gap-1">
            {[
              { id: "portfolio", label: "Portfolio" },
              { id: "about", label: "About" },
              { id: "packages", label: "Packages" },
              { id: "availability", label: "Availability" },
              { id: "reviews", label: "Reviews" },
              { id: "contact", label: "Contact" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS */}
          <div className="space-y-6">
            
            {/* 1. PORTFOLIO GRID */}
            {activeTab === "portfolio" && (
              <div className="space-y-6">
                {portfolioCategories.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {portfolioCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                          selectedCategory === cat
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-card border-border text-muted-foreground hover:border-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedPortfolio.map((img: any, idx) => (
                    <div
                      key={img.publicId || idx}
                      onClick={() => setLightboxImage(img.imageUrl || img.secureUrl)}
                      className="group border border-border bg-card rounded-2xl overflow-hidden aspect-[4/3] cursor-zoom-in relative animate-in fade-in duration-200"
                    >
                      <Image
                        src={img.imageUrl || img.secureUrl}
                        alt="Portfolio Shoot"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 360px"
                      />
                      <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded">
                        {img.category || "General"}
                      </span>
                      {img.isFeatured && (
                        <span className="absolute top-3 left-3 bg-yellow-500 text-black text-[9px] font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-1 shadow">
                          <Star className="h-2.5 w-2.5 fill-black" /> Featured
                        </span>
                      )}
                    </div>
                  ))}

                  {sortedPortfolio.length === 0 && (
                    <div className="col-span-full border border-dashed border-border rounded-2xl py-16 text-center text-muted-foreground italic text-sm">
                      No photos uploaded in this portfolio category.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ABOUT TAB */}
            {activeTab === "about" && (
              <div className="space-y-6">
                
                {/* Journey Bio & General Info */}
                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="relative w-24 h-24 rounded-full border border-border overflow-hidden shrink-0">
                      {profileImage?.secureUrl ? (
                        <Image src={profileImage.secureUrl} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">{name.charAt(0)}</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-lg text-foreground">Creative Journey</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                        {bio || `${name} is a professional photographer specializing in premium capture styles and verified client deliverables.`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/50 pt-5">
                    <div className="flex items-center gap-2 text-xs">
                      <Award className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Experience</p>
                        <p className="font-bold text-foreground">{experience} Years Pro</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Location</p>
                        <p className="font-bold text-foreground">{photographer.location || address?.city || "India"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Languages className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Languages</p>
                        <p className="font-bold text-foreground">{languages.join(", ") || "English"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specializations & Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Specializations */}
                  <div className="bg-card border border-border rounded-3xl p-6 space-y-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-4.5 w-4.5 text-primary" /> Specializations
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {specializations.length > 0 ? (
                        specializations.map((spec) => (
                          <Badge key={spec} className="bg-primary/10 text-primary border-none text-[10px] font-bold py-1 px-3">
                            {spec}
                          </Badge>
                        ))
                      ) : (
                        specialties.map((spec) => (
                          <Badge key={spec} className="bg-primary/10 text-primary border-none text-[10px] font-bold py-1 px-3">
                            {spec}
                          </Badge>
                        ))
                      )}
                      {specializations.length === 0 && specialties.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No specializations configured.</p>
                      )}
                    </div>
                  </div>

                  {/* Social links */}
                  <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Globe className="h-4.5 w-4.5 text-primary" /> Social Channels
                    </h4>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 border border-border hover:border-primary/40 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                        >
                          <InstagramIcon className="text-pink-500 shrink-0" /> Instagram
                        </a>
                      )}
                      {socialLinks.facebook && (
                        <a
                          href={socialLinks.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 border border-border hover:border-primary/40 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                        >
                          <FacebookIcon className="text-blue-600 shrink-0" /> Facebook
                        </a>
                      )}
                      {socialLinks.youtube && (
                        <a
                          href={socialLinks.youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 border border-border hover:border-primary/40 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                        >
                          <YoutubeIcon className="text-red-600 shrink-0" /> YouTube
                        </a>
                      )}
                      {socialLinks.website && (
                        <a
                          href={socialLinks.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 border border-border hover:border-primary/40 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all col-span-2 sm:col-span-1"
                        >
                          <Globe className="h-4 w-4 text-indigo-500 shrink-0" /> Studio Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion FAQ */}
                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-4">
                  <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
                  </h4>
                  <div className="space-y-3.5 pt-2">
                    {faqs.map((faq, idx) => (
                      <details key={idx} className="group border border-border/50 rounded-xl p-3.5 [&_summary::-webkit-details-marker]:hidden bg-secondary/10">
                        <summary className="flex justify-between items-center cursor-pointer focus:outline-none">
                          <span className="text-xs font-bold text-foreground pr-4">{faq.q}</span>
                          <span className="transition group-open:rotate-180 text-muted-foreground">
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </summary>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border/30 pt-2.5">
                          {faq.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 3. PRICING PACKAGES */}
            {activeTab === "packages" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayPackages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-lg">
                          {pkg.duration || `${pkg.durationHours} Hours Coverage`}
                        </span>
                        <h4 className="text-lg font-bold text-foreground pt-1.5">{pkg.name || pkg.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {pkg.description}
                      </p>
                      <div className="border-t border-border/50 pt-3.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Deliverables</p>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          {(pkg.includedServices || pkg.features || [])?.map((inc: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {pkg.extraCharges && pkg.extraCharges !== "None" && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <strong>Extra Charges:</strong> {pkg.extraCharges}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/50 pt-5 mt-6 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Package Rate</p>
                        <p className="text-xl font-black text-foreground">
                          ₹{typeof pkg.price === 'number' ? pkg.price.toLocaleString() : pkg.price}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => {
                          setInitialBudget(pkg.price.toString());
                          setInitialNotes(`Interested in package: ${pkg.name || pkg.title}`);
                          setBookingModalOpen(true);
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}

                {displayPackages.length === 0 && (
                  <div className="col-span-full border border-dashed border-border rounded-2xl py-16 text-center text-muted-foreground italic text-sm">
                    No custom packages defined. Please contact the photographer directly for custom quotes.
                  </div>
                )}
              </div>
            )}

            {/* 4. AVAILABILITY CALENDAR */}
            {activeTab === "availability" && (
              <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                  <div>
                    <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> Availability Grid
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1">Green dates represent open, bookable slots. Click to select.</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-foreground self-center px-3 capitalize">
                      {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
                  {/* Day Labels */}
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                    <span key={idx} className="font-extrabold text-muted-foreground uppercase py-1">{d}</span>
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day, idx) => {
                    if (!day) return <span key={idx} />;
                    
                    let colorClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-700 cursor-not-allowed";
                    let title = "Unavailable date";
                    let isClickable = false;

                    if (day.status === "available") {
                      colorClass = "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 cursor-pointer shadow-sm";
                      title = "Available: Click to book!";
                      isClickable = true;
                    } else if (day.status === "booked") {
                      colorClass = "bg-blue-500/10 text-blue-500 border border-blue-500/20 cursor-not-allowed line-through";
                      title = "Booked slot";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => isClickable && handleDayClick(day)}
                        disabled={!isClickable}
                        className={`aspect-square p-2.5 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${colorClass}`}
                        title={title}
                      >
                        <span className="text-xs">{day.dayNum}</span>
                        {day.status === "available" && (
                          <span className="text-[7px] uppercase font-black tracking-wide hidden sm:block mt-0.5">Book</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex justify-center gap-6 text-[9px] text-muted-foreground pt-4 border-t border-border/30 select-none">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Bookable Slot</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Booked / Closed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Unavailable Block</span>
                </div>
              </div>
            )}

            {/* 5. RATINGS & REVIEWS SECTION */}
            {activeTab === "reviews" && (
              <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-8">
                
                {/* Rating Distribution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-b border-border/50 pb-8">
                  <div className="text-center space-y-1">
                    <p className="text-5xl font-black text-foreground">{displayRating.toFixed(1)}</p>
                    <div className="flex justify-center gap-0.5 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4.5 w-4.5 ${i < Math.round(displayRating) ? "fill-yellow-500" : "text-zinc-300"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Based on {displayReviewsCount} reviews</p>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    {["5", "4", "3", "2", "1"].map((star) => {
                      const count = dist[star as keyof typeof dist] || 0;
                      const percentage = Math.round((count / totalDist) * 100);
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                          <span className="w-3 font-semibold text-muted-foreground">{star}</span>
                          <Star className="h-3 w-3 text-muted-foreground fill-muted-foreground shrink-0" />
                          <div className="flex-grow h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="w-8 text-right text-muted-foreground font-semibold">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review Listings */}
                <div className="space-y-6">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-4.5 w-4.5 text-primary" /> Verified Reviews
                  </h4>

                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="border border-border/60 bg-secondary/15 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                              {rev.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                                {rev.customerName}
                                {rev.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {rev.createdAt ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString() : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-0.5 text-yellow-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < rev.rating ? "fill-yellow-500" : "text-zinc-300"}`} />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}

                    {reviews.length === 0 && (
                      <div className="border border-dashed border-border/80 rounded-2xl py-12 text-center text-muted-foreground italic text-xs">
                        No reviews submitted yet. Book a shoot to leave a verified rating!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 6. CONTACT DETAILS */}
            {activeTab === "contact" && (
              <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
                <div>
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" /> Direct Studio Hires & Contacts
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1">Get in touch directly with the photographer via telephone, WhatsApp chat, or email address.</p>
                </div>

                <div className="flex flex-col gap-4 max-w-md pt-2">
                  {resolvedPhone && (
                    <a
                      href={`tel:${resolvedPhone}`}
                      className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow transition-colors"
                    >
                      <Phone className="h-5 w-5 shrink-0" /> Call Studio ({resolvedPhone})
                    </a>
                  )}

                  {resolvedWhatsapp && (
                    <a
                      href={`https://wa.me/${resolvedWhatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow transition-colors"
                    >
                      <MessageSquare className="h-5 w-5 shrink-0" /> Chat on WhatsApp
                    </a>
                  )}

                  {resolvedEmail && (
                    <a
                      href={`mailto:${resolvedEmail}`}
                      className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow transition-colors"
                    >
                      <Mail className="h-5 w-5 shrink-0" /> Email Studio ({resolvedEmail})
                    </a>
                  )}

                  {!resolvedPhone && !resolvedWhatsapp && !resolvedEmail && (
                    <div className="border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground italic">
                      Contact credentials are private. Please use the booking form to schedule a shoot.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Sticky Column (Booking Card, Availability Calendar) */}
        <div className="space-y-6">
          
          {/* Sticky Booking Card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xl sticky top-24 space-y-5">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Starting Rate</p>
                <p className="text-2xl font-black text-foreground">
                  {currencySymbol} {startingPrice.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs bg-secondary/80 px-2 py-0.5 rounded border border-border/50 font-bold shrink-0">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span>{displayRating.toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground font-normal">({displayReviewsCount})</span>
              </div>
            </div>

            {/* Quick Status indicators */}
            <div className="space-y-3 text-xs">
              {vacationMode ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="font-semibold">Unavailable / Vacation Mode</span>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-3.5 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="font-semibold">Accepting Shoot Requests</span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground bg-secondary/30 p-2.5 rounded-xl border border-border/50">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Response Time</span>
                <span className="font-semibold text-foreground">~2 Hours</span>
              </div>
            </div>

            <Button size="lg" className="w-full shadow-lg shadow-primary/10 gap-2" onClick={() => setBookingModalOpen(true)}>
              Request Booking Session <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          </div>

          {/* Similar Photographers recommendations */}
          {similarPhotographers.length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-primary" /> Similar Photographers
              </h4>

              <div className="space-y-4 pt-1">
                {similarPhotographers.map((sim) => (
                  <a
                    key={sim.uid}
                    href={`/photographers/${sim.uid}`}
                    className="flex items-center gap-3 bg-secondary/20 p-2.5 rounded-2xl border border-border/40 hover:border-primary/40 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden shrink-0 relative">
                      {sim.profileImage?.secureUrl ? (
                        <Image
                          src={sim.profileImage.secureUrl}
                          alt={sim.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {sim.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden flex-grow">
                      <h5 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {sim.studioName || sim.name}
                      </h5>
                      <p className="text-[10px] text-muted-foreground truncate">{sim.address?.city || sim.location}, {sim.experience} yrs exp</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-foreground">₹{sim.startingPrice.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          {(sim.ratingStats?.count > 0 ? sim.ratingStats.average : 4.8).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Lightbox Modal Zoom */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-white/10 shadow-2xl relative">
            <img src={lightboxImage} className="w-full h-full object-contain max-h-[85vh]" alt="Enlarged Portfolio Item" />
          </div>
        </div>
      )}

      {/* Booking Form Dialog Modal Overlay */}
      {bookingModalOpen && (
        <BookingFormModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setInitialBudget(undefined);
            setInitialNotes(undefined);
            setInitialDate(undefined);
          }}
          photographer={photographer}
          initialBudget={initialBudget}
          initialNotes={initialNotes}
          initialDate={initialDate}
        />
      )}
    </div>
  );
}
