"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PhotographerCard } from "@/features/photographers/components/PhotographerCard";
import { BookingFormModal } from "@/features/bookings/components/BookingFormModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  Search,
  MapPin,
  Camera,
  Star,
  Award,
  ChevronDown,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import type { Photographer } from "@/types";

// Fetcher function using Firestore
const fetchActivePhotographers = async (): Promise<Photographer[]> => {
  try {
    const snaps = await getDocs(
      query(
        collection(db, "photographers"),
        where("isPublished", "==", true)
      )
    );

    console.log("Marketplace Docs:", snaps.docs.length);

    const filtered = snaps.docs
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          ratingStats: data.ratingStats || { average: 0, count: 0 },
          specialties: data.specialties || data.specializations || [],
          experience: data.experience || 0,
          startingPrice: data.startingPrice || data.hourlyPrice || data.hourlyRate || 1000,
          currency: data.currency || "INR",
          isPublished: data.isPublished,
          marketplacePublished: data.marketplacePublished,
          isActive: data.isActive ?? true,
          isSuspended: data.isSuspended ?? false
        };
      })
      .filter((p) => 
        p.isPublished === true && 
        p.marketplacePublished !== false
      ) as Photographer[];

    console.log("Photographers:", filtered);
    return filtered;
  } catch (error) {
    console.error("Marketplace Fetch Error:", error);
    throw error;
  }
};

export default function PhotographersPage() {
  const { data: photographers = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activePhotographers"],
    queryFn: fetchActivePhotographers,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // State Variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("All");
  const [minExperience, setMinExperience] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhotographerForBooking, setSelectedPhotographerForBooking] = useState<Photographer | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const pageSize = 12;

  // Extract unique locations and specialties from loaded data
  const locations = useMemo(() => {
    const countries = new Set<string>();
    const states = new Set<string>();
    const cities = new Set<string>();

    photographers.forEach((p) => {
      if (p.address?.country) countries.add(p.address.country);
      if (p.address?.state) states.add(p.address.state);
      if (p.address?.city) cities.add(p.address.city);
    });

    return {
      countries: ["All", ...Array.from(countries)],
      states: ["All", ...Array.from(states)],
      cities: ["All", ...Array.from(cities)]
    };
  }, [photographers]);

  const specialties = useMemo(() => {
    const list = new Set<string>();
    photographers.forEach((p) => {
      p.specialties?.forEach((spec) => list.add(spec));
    });
    return ["All", ...Array.from(list)];
  }, [photographers]);

  // Client Side Searching, Filtering and Sorting
  const filteredPhotographers = useMemo(() => {
    let result = [...photographers];

    // Search Query (Name/Studio)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.studioName?.toLowerCase().includes(q)
      );
    }

    // Location Filters
    if (selectedCountry !== "All") {
      result = result.filter((p) => p.address?.country === selectedCountry);
    }
    if (selectedState !== "All") {
      result = result.filter((p) => p.address?.state === selectedState);
    }
    if (selectedCity !== "All") {
      result = result.filter((p) => p.address?.city === selectedCity);
    }

    // Category / Specialty Filter
    if (selectedSpecialty !== "All") {
      result = result.filter((p) => p.specialties?.includes(selectedSpecialty));
    }

    // Price Range Filter
    if (minPrice) {
      result = result.filter((p) => p.startingPrice >= parseFloat(minPrice));
    }
    if (maxPrice) {
      result = result.filter((p) => p.startingPrice <= parseFloat(maxPrice));
    }

    // Rating Filter
    if (minRating !== "All") {
      result = result.filter((p) => p.ratingStats.average >= parseFloat(minRating));
    }

    // Experience Filter
    if (minExperience !== "All") {
      result = result.filter((p) => p.experience >= parseInt(minExperience, 10));
    }

    // Sort Logic
    result.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.startingPrice - b.startingPrice;
        case "price_desc":
          return b.startingPrice - a.startingPrice;
        case "newest":
          // Fallback to average rating if created dates are missing
          const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000).getTime() : 0;
          return dateB - dateA;
        case "bookings":
          return (b.completedBookings || 0) - (a.completedBookings || 0);
        case "rating":
        default:
          return b.ratingStats.average - a.ratingStats.average;
      }
    });

    return result;
  }, [
    photographers,
    searchQuery,
    selectedCountry,
    selectedState,
    selectedCity,
    selectedSpecialty,
    minPrice,
    maxPrice,
    minRating,
    minExperience,
    sortBy
  ]);

  // Paginated Results
  const totalPages = Math.ceil(filteredPhotographers.length / pageSize);
  const paginatedPhotographers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPhotographers.slice(start, start + pageSize);
  }, [filteredPhotographers, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCountry("All");
    setSelectedState("All");
    setSelectedCity("All");
    setSelectedSpecialty("All");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("All");
    setMinExperience("All");
    setSortBy("rating");
    setCurrentPage(1);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950/40 text-foreground py-12 pb-24">
        <div className="container mx-auto px-4 space-y-8">
          
          {/* Top Title & Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent sm:text-4xl">
                Discover Photographers
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5">
                Browse through premium vetted studio artists, compare packages, and book slots instantly.
              </p>
            </div>
            
            {/* View Mode Toggle & Sort selector */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-xs text-muted-foreground font-semibold">Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="rating">Highest Rated</option>
                <option value="bookings">Most Popular</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
                <option value="newest">Newest</option>
              </select>

              <div className="flex bg-card border border-border p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Central Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* 1. Glassmorphic Filter Sidebar (Desktop) */}
            <aside className="hidden lg:block space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-24 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-extrabold text-sm tracking-wider uppercase flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Reset All
                  </button>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shoot Specialty</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => {
                      setSelectedSpecialty(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Categories</option>
                    {specialties.filter(s => s !== "All").map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedState("All");
                      setSelectedCity("All");
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Countries</option>
                    {locations.countries.filter(c => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">State</label>
                  <select
                    value={selectedState}
                    disabled={selectedCountry === "All"}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedCity("All");
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All States</option>
                    {locations.states.filter(s => s !== "All").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City</label>
                  <select
                    value={selectedCity}
                    disabled={selectedState === "All"}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Cities</option>
                    {locations.cities.filter(c => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Range (₹)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-9 px-2 text-xs"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-9 px-2 text-xs"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => {
                      setMinRating(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">Any Rating</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                  </select>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience Level</label>
                  <select
                    value={minExperience}
                    onChange={(e) => {
                      setMinExperience(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-input text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">Any Experience</option>
                    <option value="10">10+ Years (Senior)</option>
                    <option value="5">5+ Years (Mid)</option>
                    <option value="2">2+ Years (Junior)</option>
                  </select>
                </div>
              </div>
            </aside>

            {/* Mobile Filters Modal Trigger */}
            <div className="lg:hidden flex items-center justify-between gap-4">
              <div className="flex-grow">
                <SearchBar
                  placeholder="Search by name or studio..."
                  value={searchQuery}
                  onValueChange={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                  }}
                  className="max-w-full"
                />
              </div>
              <Button
                variant="outline"
                className="gap-2 shrink-0 h-10 rounded-lg"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </Button>
            </div>

            {/* Mobile Filters Panel */}
            {mobileFiltersOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
                <div className="w-80 bg-card h-full p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span className="font-extrabold text-sm uppercase flex items-center gap-1.5">
                        <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
                      </span>
                      <button
                        onClick={() => setMobileFiltersOpen(false)}
                        className="text-muted-foreground hover:text-foreground bg-secondary/80 p-1.5 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Specialties */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Specialty</label>
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => {
                          setSelectedSpecialty(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-input text-xs"
                      >
                        <option value="All">All Categories</option>
                        {specialties.filter(s => s !== "All").map((spec) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Country/City */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">City</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-input text-xs"
                      >
                        <option value="All">All Cities</option>
                        {locations.cities.filter(c => c !== "All").map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Price Range (₹)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          className="h-9 px-2 text-xs"
                          value={minPrice}
                          onChange={(e) => {
                            setMinPrice(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          className="h-9 px-2 text-xs"
                          value={maxPrice}
                          onChange={(e) => {
                            setMaxPrice(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Rating</label>
                      <select
                        value={minRating}
                        onChange={(e) => {
                          setMinRating(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-input text-xs"
                      >
                        <option value="All">Any Rating</option>
                        <option value="4.5">4.5+ Stars</option>
                        <option value="4.0">4.0+ Stars</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mt-6 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={handleResetFilters}>
                      Reset
                    </Button>
                    <Button variant="default" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Grid & List Cards Panel */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Search Header for Desktop */}
              <div className="hidden lg:block">
                <div className="relative w-full max-w-lg">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                    <Search className="h-4.5 w-4.5" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Search photographers by name or studio..."
                    className="pl-10 pr-4 py-6 rounded-2xl w-full text-sm bg-card border-border/80"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Skeletons Loader State */}
              {isLoading && (
                <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" : "space-y-4"}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 animate-pulse">
                      <div className="h-36 bg-muted rounded-xl w-full" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="border border-dashed border-red-500/20 bg-red-500/5 rounded-3xl py-16 px-6 text-center space-y-4 max-w-lg mx-auto">
                  <HelpCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <h3 className="text-base font-bold text-foreground">Failed to load marketplace listings</h3>
                  <p className="text-xs text-red-500 max-w-sm mx-auto font-mono break-all">
                    {error instanceof Error ? error.message : String(error || "Unknown error")}
                  </p>
                  <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">
                    We encountered a Firestore network issue. Click retry or check database permissions.
                  </p>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()}>
                    <RefreshCw className="h-4.5 w-4.5" /> Retry Fetch
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && filteredPhotographers.length === 0 && (
                <div className="border border-dashed border-border rounded-3xl py-24 text-center space-y-4">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto animate-bounce" />
                  <h3 className="text-lg font-bold text-foreground">No photographers found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Try adjusting your location filters, budget range, rating sliders, or clearing the search string.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Reset Search & Filters
                  </Button>
                </div>
              )}

              {/* Main Content Layout */}
              {!isLoading && !isError && filteredPhotographers.length > 0 && (
                <>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" : "space-y-4"}>
                    {paginatedPhotographers.map((photographer) => (
                      <PhotographerCard
                        key={photographer.uid}
                        photographer={photographer}
                        viewMode={viewMode}
                        onBookNow={(p) => setSelectedPhotographerForBooking(p)}
                      />
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <Button
                          key={idx}
                          variant={currentPage === idx + 1 ? "default" : "outline"}
                          size="sm"
                          className="w-9 h-9"
                          onClick={() => setCurrentPage(idx + 1)}
                        >
                          {idx + 1}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Booking Form Dialog Modal overlay */}
      {selectedPhotographerForBooking && (
        <BookingFormModal
          isOpen={!!selectedPhotographerForBooking}
          onClose={() => setSelectedPhotographerForBooking(null)}
          photographer={selectedPhotographerForBooking}
        />
      )}
    </PublicLayout>
  );
}

// Inline X icon to support fallback mobile drawer
const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
