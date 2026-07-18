"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  MapPin,
  Camera,
  Briefcase,
  Clock,
  Globe2,
  FileCode,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Loader2,
  CheckCircle,
  Eye,
  Calendar
} from "lucide-react";
import { PhotographerSchema } from "@/lib/validation/schemas";
import { photographerService } from "@/services/PhotographerService";
import { db } from "@/lib/firebase/firestore";
import { doc, deleteDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { calculateCompletion } from "./CompletionProgress";

// Custom inline SVG icons because current lucide-react version doesn't support them
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const Globe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Allowed categories and languages list
const SPECIALTIES = [
  "Wedding",
  "Pre Wedding",
  "Birthday",
  "Baby Shoot",
  "Fashion",
  "Corporate",
  "Wildlife",
  "Product",
  "Food",
  "Travel",
  "Drone",
  "Events",
  "Commercial"
];

const LANGUAGES = ["English", "Hindi", "Bengali", "Odia", "Punjabi", "Tamil", "Telugu", "Marathi", "Gujarati"];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function extractPublicId(url: string): string | null {
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;
    
    const path = url.substring(uploadIndex + 8);
    const segments = path.split("/");
    const firstNonTransformIndex = segments.findIndex(seg => seg.match(/^v\d+$/));
    
    let publicIdPath = "";
    if (firstNonTransformIndex !== -1) {
      publicIdPath = segments.slice(firstNonTransformIndex + 1).join("/");
    } else {
      const snapEventIndex = path.indexOf("snapevent/");
      if (snapEventIndex !== -1) {
        publicIdPath = path.substring(snapEventIndex);
      } else {
        const filteredSegments = segments.filter(
          seg => !seg.includes(",") && !seg.startsWith("c_") && !seg.startsWith("w_") && !seg.startsWith("h_")
        );
        if (filteredSegments[0]?.match(/^v\d+$/)) {
          filteredSegments.shift();
        }
        publicIdPath = filteredSegments.join("/");
      }
    }
    
    const dotIndex = publicIdPath.lastIndexOf(".");
    if (dotIndex !== -1) {
      publicIdPath = publicIdPath.substring(0, dotIndex);
    }
    return decodeURIComponent(publicIdPath);
  } catch (error) {
    console.error("Failed to extract publicId:", error);
    return null;
  }
}

interface ProfileFormProps {
  initialData: any;
  uid: string;
  onProfileUpdated: (newData: any) => void;
}

export function ProfileForm({ initialData, uid, onProfileUpdated }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Media upload loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // New unavailable date input
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(PhotographerSchema),
    defaultValues: {
      uid: initialData.uid || uid,
      email: initialData.email || "",
      displayName: initialData.displayName || "",
      role: "photographer",
      name: initialData.name || "",
      studioName: initialData.studioName || "",
      businessName: initialData.businessName || "",
      tagline: initialData.tagline || "",
      bio: initialData.bio || "",
      phone: initialData.phone || "",
      dateOfBirth: initialData.dateOfBirth || "",
      gender: initialData.gender || "prefer_not_to_say",
      address: {
        street: initialData.address?.street || "",
        city: initialData.address?.city || "",
        state: initialData.address?.state || "",
        country: initialData.address?.country || "",
        postalCode: initialData.address?.postalCode || "",
      },
      profileImage: initialData.profileImage || undefined,
      coverImage: initialData.coverImage || undefined,
      logo: initialData.logo || undefined,
      portfolioImages: initialData.portfolioImages || [],
      specialties: initialData.specialties || [],
      experience: initialData.experience || 0,
      languages: initialData.languages || [],
      equipment: initialData.equipment || [],
      photographyStyle: initialData.photographyStyle || "",
      pricingPackages: initialData.pricingPackages || [],
      startingPrice: initialData.startingPrice || 0,
      currency: initialData.currency || "INR",
      weeklySchedule: initialData.weeklySchedule || DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = { isOpen: true, startTime: "09:00", endTime: "18:00" };
        return acc;
      }, {} as Record<string, any>),
      vacationMode: initialData.vacationMode || false,
      unavailableDates: initialData.unavailableDates || [],
      socialLinks: {
        instagram: initialData.socialLinks?.instagram || "",
        facebook: initialData.socialLinks?.facebook || "",
        website: initialData.socialLinks?.website || "",
        youtube: initialData.socialLinks?.youtube || "",
        behance: initialData.socialLinks?.behance || "",
      }
    }
  });

  // Watch field values for dynamic views
  const watchedProfileImage = watch("profileImage");
  const watchedCoverImage = watch("coverImage");
  const watchedLogo = watch("logo");
  const watchedPortfolio = watch("portfolioImages") || [];
  const watchedSpecialties = watch("specialties") || [];
  const watchedLanguages = watch("languages") || [];
  const watchedWeeklySchedule = watch("weeklySchedule") || {};
  const watchedUnavailableDates = watch("unavailableDates") || [];

  // Manage Packages field array
  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({
    control,
    name: "pricingPackages"
  });

  React.useEffect(() => {
    if (!watchedPortfolio || watchedPortfolio.length === 0) return;

    const migrateMissing = async () => {
      let needsMigration = false;
      const migrated = await Promise.all(
        watchedPortfolio.map(async (item: any) => {
          if (!item.publicId) {
            const url = item.secureUrl || item.imageUrl || "";
            const extracted = extractPublicId(url);
            if (extracted) {
              needsMigration = true;
              console.log(`Migrating ProfileForm portfolio photo - extracted publicId:`, extracted);
              
              const photoId = item.id || extracted.replace(/\//g, "_");
              try {
                // Update in Firestore subcollection photographers/{uid}/portfolio/{photoId}
                const docRef = doc(db, "photographers", uid, "portfolio", photoId);
                await setDoc(docRef, { ...item, publicId: extracted, id: photoId }, { merge: true });
              } catch (e) {
                console.error("Failed to migrate portfolio photo subcollection:", e);
              }
              
              return { ...item, publicId: extracted, id: photoId };
            }
          }
          return item;
        })
      );

      if (needsMigration) {
        setValue("portfolioImages", migrated, { shouldValidate: true });
        
        try {
          await photographerService.updateProfile(uid, {
            portfolioImages: migrated,
            portfolio: migrated
          });
        } catch (e) {
          console.error("Failed to update profile for migration:", e);
        }
      }
    };

    migrateMissing();
  }, [watchedPortfolio, uid, setValue]);

  const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "profileImage" | "coverImage" | "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fieldName === "profileImage") setProfileLoading(true);
    if (fieldName === "coverImage") setCoverLoading(true);
    if (fieldName === "logo") setLogoLoading(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `snapevent/photographers/${uid}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const bodyText = await res.text();
      let data: any;
      try {
        data = JSON.parse(bodyText);
      } catch {
        console.error(`[Cloudinary] ❌ Failed to parse response JSON:`, bodyText);
        throw new Error(`Upload server returned unreadable response: ${bodyText}`);
      }

      if (!res.ok) {
        console.error(`[Cloudinary] ❌ Single upload failed. Complete Response:`, JSON.stringify(data, null, 2));
        throw new Error(data?.error?.message || `Upload failed with status ${res.status}`);
      }

      setValue(fieldName, {
        publicId: data.public_id,
        secureUrl: data.secure_url,
      }, { shouldValidate: true });
    } catch (error: any) {
      console.error(error);
      alert(`Failed to upload image. Error: ${error?.message || error}`);
    } finally {
      setProfileLoading(false);
      setCoverLoading(false);
      setLogoLoading(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (watchedPortfolio.length + files.length > 100) {
      alert("Maximum 100 portfolio images allowed.");
      return;
    }

    setPortfolioLoading(true);

    try {
      const newImages = [...watchedPortfolio];
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", `snapevent/photographers/${uid}/portfolio`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const bodyText = await res.text();
        let data: any;
        try {
          data = JSON.parse(bodyText);
        } catch {
          console.error(`[Cloudinary] ❌ Failed to parse response JSON:`, bodyText);
          throw new Error(`Upload server returned unreadable response: ${bodyText}`);
        }

        if (!res.ok) {
          console.error(`[Cloudinary] ❌ Portfolio upload failed. Complete Response:`, JSON.stringify(data, null, 2));
          throw new Error(data?.error?.message || `Upload failed with status ${res.status}`);
        }

        newImages.push({
          publicId: data.public_id,
          secureUrl: data.secure_url,
          thumbnailUrl: data.secure_url.replace("/upload/", "/upload/c_thumb,w_250,h_250,g_face,q_auto,f_auto/"),
          uploadedAt: new Date().toISOString(),
          category: "General",
          isFeatured: false
        });
      }

      setValue("portfolioImages", newImages, { shouldValidate: true });
    } catch (error: any) {
      console.error(error);
      alert(`Failed to upload portfolio images. Error: ${error?.message || error}`);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleToggleSpecialty = (spec: string) => {
    const current = [...watchedSpecialties];
    const index = current.indexOf(spec);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(spec);
    }
    setValue("specialties", current, { shouldValidate: true });
  };

  const handleToggleLanguage = (lang: string) => {
    const current = [...watchedLanguages];
    const index = current.indexOf(lang);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(lang);
    }
    setValue("languages", current, { shouldValidate: true });
  };

  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    if (watchedUnavailableDates.includes(newBlockedDate)) {
      setNewBlockedDate("");
      return;
    }
    setValue("unavailableDates", [...watchedUnavailableDates, newBlockedDate], { shouldValidate: true });
    setNewBlockedDate("");
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setValue(
      "unavailableDates",
      watchedUnavailableDates.filter((d) => d !== dateToRemove),
      { shouldValidate: true }
    );
  };

  const handlePortfolioReorder = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === watchedPortfolio.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...watchedPortfolio];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setValue("portfolioImages", reordered, { shouldValidate: true });
  };

  const handlePortfolioDelete = (index: number) => {
    setConfirmDeleteIndex(index);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteIndex === null) return;
    
    // Prevent deleting the last required portfolio image
    if (watchedPortfolio.length <= 1) {
      toast.warning("Cannot delete the last photo. At least one portfolio image is required.");
      setConfirmDeleteIndex(null);
      return;
    }

    const targetImg = watchedPortfolio[confirmDeleteIndex];
    if (!targetImg) {
      setConfirmDeleteIndex(null);
      return;
    }

    let publicId = targetImg.publicId;
    const secureUrl = targetImg.secureUrl || "";

    // STEP 4: Legacy Photo Support
    if (!publicId) {
      publicId = extractPublicId(secureUrl) || "";
    }

    console.log("Deleting publicId:", publicId);

    const loadingToastId = toast.loading("Deleting photo...");
    try {
      let isCloudinaryDeleted = false;

      if (publicId) {
        // STEP 5: Delete Cloudinary asset first via server API DELETE /api/cloudinary/delete
        const res = await fetch("/api/cloudinary/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, secureUrl })
        });
        
        const resData = await res.json();
        
        // STEP 7: Detailed Logging
        console.log("Cloudinary Delete Result:", resData);

        if (res.ok) {
          isCloudinaryDeleted = true;
        } else if (res.status === 403) {
          // STEP 10: 403 Debugging
          console.warn("Cloudinary returned 403 (Credentials Error). We will clear this from Firestore anyway to prevent it from reappearing.");
          toast.warning("Cloudinary credentials returned 403 Forbidden. Removed from database only.");
          isCloudinaryDeleted = true; // treat as success for database/state deletion flow
        } else {
          throw new Error(resData.error || "Failed to remove image from Cloudinary.");
        }
      } else {
        // Extraction failed
        console.warn("Cloudinary publicId missing and extraction failed. Deleting Firestore document only.");
        toast.warning("Cloudinary asset could not be found. Removed from database.");
        isCloudinaryDeleted = true;
      }

      if (isCloudinaryDeleted) {
        // STEP 5: 2. Remove Firestore document
        const photoId = (targetImg as any).id || targetImg.publicId || (publicId ? publicId.replace(/\//g, "_") : null);
        let firestoreDeleted = false;
        if (photoId) {
          try {
            await deleteDoc(doc(db, "photographers", uid, "portfolio", photoId));
            firestoreDeleted = true;
          } catch (fsErr) {
            console.error("Failed to delete Firestore subcollection doc:", fsErr);
          }
        }

        // STEP 5: 3. Update main profile doc & local UI state
        const updated = watchedPortfolio.filter((_, idx) => idx !== confirmDeleteIndex);
        setValue("portfolioImages", updated, { shouldValidate: true });

        const mainDocResult = await photographerService.updateProfile(uid, {
          portfolioImages: updated,
          portfolio: updated
        });

        // STEP 7: Detailed Logging
        console.log("Deletion completed:", {
          publicId,
          secureUrl,
          cloudinaryDeleted: isCloudinaryDeleted,
          firestoreDeleted: firestoreDeleted,
          mainDocUpdated: true
        });

        toast.success("Photo deleted successfully.");
      }
    } catch (err: any) {
      console.error("Deletion failed:", err);
      toast.error(err.message || "Failed to remove photo. Please try again.");
    } finally {
      toast.dismiss(loadingToastId);
      setConfirmDeleteIndex(null);
    }
  };

  const handlePortfolioCategoryChange = (index: number, category: string) => {
    const updated = [...watchedPortfolio];
    updated[index] = { ...updated[index], category };
    setValue("portfolioImages", updated, { shouldValidate: true });
  };

  const handlePortfolioFeaturedToggle = (index: number) => {
    const updated = [...watchedPortfolio];
    updated[index] = { ...updated[index], isFeatured: !updated[index].isFeatured };
    setValue("portfolioImages", updated, { shouldValidate: true });
  };

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const completionPercentage = calculateCompletion(data);
      const finalData = {
        ...data,
        profileCompletion: completionPercentage
      };

      await photographerService.updateProfile(uid, finalData);
      
      onProfileUpdated(finalData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Failed to save profile. Please check validation rules.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Tabs Selector */}
      <div className="flex border-b border-border overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: "personal", label: "Personal & Studio", icon: User },
          { id: "location", label: "Location & Socials", icon: MapPin },
          { id: "categories", label: "Specialties & Languages", icon: Globe },
          { id: "pricing", label: "Pricing & Packages", icon: Briefcase },
          { id: "availability", label: "Availability", icon: Clock },
          { id: "media", label: "Cover & Banner", icon: Camera },
          { id: "portfolio", label: "Portfolio (Max 100)", icon: ImageIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* PERSONAL & STUDIO TAB */}
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Full Name *</label>
                  <Input {...register("name")} error={!!errors.name} helperText={errors.name?.message} placeholder="e.g. John Doe" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground font-mono">Email (Read Only)</label>
                  <Input {...register("email")} disabled className="bg-secondary/50 cursor-not-allowed font-mono text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Mobile Number</label>
                  <Input {...register("phone")} error={!!errors.phone} helperText={errors.phone?.message} placeholder="e.g. +919876543210" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Date of Birth</label>
                  <Input type="date" {...register("dateOfBirth")} error={!!errors.dateOfBirth} helperText={errors.dateOfBirth?.message} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Gender</label>
                  <select
                    {...register("gender")}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Studio Name *</label>
                  <Input {...register("studioName")} error={!!errors.studioName} helperText={errors.studioName?.message} placeholder="e.g. Luminary Studios" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Business Name</label>
                  <Input {...register("businessName")} error={!!errors.businessName} helperText={errors.businessName?.message} placeholder="e.g. Luminary Media Pvt. Ltd." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Experience (Years) *</label>
                  <Input
                    type="number"
                    {...register("experience", { valueAsNumber: true })}
                    error={!!errors.experience}
                    helperText={errors.experience?.message}
                    placeholder="e.g. 5"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-foreground">Photography Style / Tagline</label>
                  <Input {...register("tagline")} error={!!errors.tagline} helperText={errors.tagline?.message} placeholder="e.g. Cinematic candid wedding photographer" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-foreground">Photography style detail</label>
                  <Input {...register("photographyStyle")} error={!!errors.photographyStyle} helperText={errors.photographyStyle?.message} placeholder="e.g. Candid, Cinematic, Documentary" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-foreground">About Photographer</label>
                  <Textarea
                    rows={4}
                    {...register("bio")}
                    error={!!errors.bio}
                    helperText={errors.bio?.message}
                    placeholder="Tell clients about your creative journey, style, achievements..."
                  />
                </div>
              </div>
            )}

            {/* LOCATION & SOCIAL TAB */}
            {activeTab === "location" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Country *</label>
                    <Input {...register("address.country")} error={!!errors.address?.country} helperText={errors.address?.country?.message} placeholder="e.g. India" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">State *</label>
                    <Input {...register("address.state")} error={!!errors.address?.state} helperText={errors.address?.state?.message} placeholder="e.g. Maharashtra" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">City *</label>
                    <Input {...register("address.city")} error={!!errors.address?.city} helperText={errors.address?.city?.message} placeholder="e.g. Mumbai" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Pincode / Postal Code</label>
                    <Input {...register("address.postalCode")} error={!!errors.address?.postalCode} helperText={errors.address?.postalCode?.message} placeholder="e.g. 400001" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground">Full Studio Address</label>
                    <Input {...register("address.street")} error={!!errors.address?.street} helperText={errors.address?.street?.message} placeholder="e.g. Suite 402, Sunset Boulevard" />
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-primary" />
                    Social Media & Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                      </label>
                      <Input {...register("socialLinks.instagram")} error={!!errors.socialLinks?.instagram} helperText={errors.socialLinks?.instagram?.message} placeholder="https://instagram.com/profile" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                      </label>
                      <Input {...register("socialLinks.facebook")} error={!!errors.socialLinks?.facebook} helperText={errors.socialLinks?.facebook?.message} placeholder="https://facebook.com/profile" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-600" /> YouTube
                      </label>
                      <Input {...register("socialLinks.youtube")} error={!!errors.socialLinks?.youtube} helperText={errors.socialLinks?.youtube?.message} placeholder="https://youtube.com/channel" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-500" /> Professional Website
                      </label>
                      <Input {...register("socialLinks.website")} error={!!errors.socialLinks?.website} helperText={errors.socialLinks?.website?.message} placeholder="https://yourwebsite.com" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-blue-500" /> Behance Portfolio
                      </label>
                      <Input {...register("socialLinks.behance")} error={!!errors.socialLinks?.behance} helperText={errors.socialLinks?.behance?.message} placeholder="https://behance.net/profile" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SPECIALTIES & LANGUAGES */}
            {activeTab === "categories" && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Photography Categories (Select Multiple)</h4>
                    <p className="text-muted-foreground text-xs">Which domains represent your professional work?</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {SPECIALTIES.map((spec) => {
                      const isSelected = watchedSpecialties.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => handleToggleSpecialty(spec)}
                          className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                          }`}
                        >
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Languages (Select Multiple)</h4>
                    <p className="text-muted-foreground text-xs">Which languages can you communicate with clients in?</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {LANGUAGES.map((lang) => {
                      const isSelected = watchedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleToggleLanguage(lang)}
                          className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PRICING TAB */}
            {activeTab === "pricing" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Starting Price *</label>
                    <Input
                      type="number"
                      {...register("startingPrice", { valueAsNumber: true })}
                      error={!!errors.startingPrice}
                      helperText={errors.startingPrice?.message}
                      placeholder="e.g. 15000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Currency *</label>
                    <Input {...register("currency")} error={!!errors.currency} helperText={errors.currency?.message} placeholder="e.g. INR" />
                  </div>
                </div>

                {/* Pricing Packages list */}
                <div className="border-t border-border pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Pricing Packages</h4>
                      <p className="text-muted-foreground text-xs">Define options like Half Day, Full Day, or Custom packages.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendPackage({
                          id: Math.random().toString(36).substr(2, 9),
                          name: "",
                          description: "",
                          price: 10000,
                          currency: watch("currency") || "INR",
                          durationHours: 4,
                          includes: []
                        })
                      }
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Package
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {packageFields.map((field, index) => (
                      <div key={field.id} className="relative border border-border p-6 rounded-2xl bg-secondary/10 space-y-4">
                        <button
                          type="button"
                          onClick={() => removePackage(index)}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <h5 className="font-bold text-foreground">Package #{index + 1}</h5>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Package Name *</label>
                            <Input
                              {...register(`pricingPackages.${index}.name` as const)}
                              placeholder="e.g. Half Day Event Shoot"
                              error={!!errors.pricingPackages?.[index]?.name}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Duration (Hours) *</label>
                            <Input
                              type="number"
                              {...register(`pricingPackages.${index}.durationHours` as const, { valueAsNumber: true })}
                              placeholder="e.g. 4"
                              error={!!errors.pricingPackages?.[index]?.durationHours}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Price *</label>
                            <Input
                              type="number"
                              {...register(`pricingPackages.${index}.price` as const, { valueAsNumber: true })}
                              placeholder="e.g. 15000"
                              error={!!errors.pricingPackages?.[index]?.price}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Description *</label>
                          <Textarea
                            rows={2}
                            {...register(`pricingPackages.${index}.description` as const)}
                            placeholder="Describe what services are included in this package..."
                            error={!!errors.pricingPackages?.[index]?.description}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Inclusions (Comma-separated) *</label>
                          <Input
                            placeholder="e.g. 50 edited images, Drone footage, Raw deliverables"
                            onChange={(e) => {
                              const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                              setValue(`pricingPackages.${index}.includes`, list);
                            }}
                            defaultValue={field.includes?.join(", ")}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AVAILABILITY TAB */}
            {activeTab === "availability" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between bg-secondary/20 p-4 rounded-xl">
                  <div>
                    <h4 className="font-semibold text-foreground">Vacation Mode</h4>
                    <p className="text-xs text-muted-foreground">Toggle this to declare yourself temporarily unavailable for all bookings.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-10 h-6 bg-secondary checked:bg-primary rounded-full appearance-none transition-all cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:left-1 checked:before:left-5 before:transition-all shadow-sm"
                    {...register("vacationMode")}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Weekly Schedule
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayConfig = (watchedWeeklySchedule as any)[day] || { isOpen: false, startTime: "09:00", endTime: "18:00" };
                      return (
                        <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-xl bg-background">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={dayConfig.isOpen}
                              onChange={(e) => {
                                setValue(`weeklySchedule.${day}.isOpen` as any, e.target.checked, { shouldValidate: true });
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="font-semibold text-sm text-foreground w-24">{day}</span>
                          </div>

                          {dayConfig.isOpen ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={dayConfig.startTime}
                                onChange={(e) => setValue(`weeklySchedule.${day}.startTime` as any, e.target.value)}
                                className="h-8 border border-border rounded-lg text-xs bg-background px-2"
                              >
                                {Array.from({ length: 24 }).map((_, h) => {
                                  const formatted = `${String(h).padStart(2, "0")}:00`;
                                  return <option key={formatted} value={formatted}>{formatted}</option>;
                                })}
                              </select>
                              <span className="text-xs text-muted-foreground">to</span>
                              <select
                                value={dayConfig.endTime}
                                onChange={(e) => setValue(`weeklySchedule.${day}.endTime` as any, e.target.value)}
                                className="h-8 border border-border rounded-lg text-xs bg-background px-2"
                              >
                                {Array.from({ length: 24 }).map((_, h) => {
                                  const formatted = `${String(h).padStart(2, "0")}:00`;
                                  return <option key={formatted} value={formatted}>{formatted}</option>;
                                })}
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-3 py-1 rounded-full">Closed / Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Blocked dates */}
                <div className="border-t border-border pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Specific Blocked / Unavailable Dates</h4>
                    <p className="text-xs text-muted-foreground">Block single dates you are not available for shoots (e.g. personal events).</p>
                  </div>

                  <div className="flex gap-3 max-w-sm">
                    <Input type="date" value={newBlockedDate} onChange={(e) => setNewBlockedDate(e.target.value)} />
                    <Button type="button" onClick={handleAddBlockedDate}>Add</Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {watchedUnavailableDates.map((date) => (
                      <div key={date} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-semibold">
                        <span>{date}</span>
                        <button type="button" onClick={() => handleRemoveBlockedDate(date)} className="hover:text-red-700 font-bold">×</button>
                      </div>
                    ))}
                    {watchedUnavailableDates.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No blocked dates. Available every open schedule day!</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === "media" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Profile Photo */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Profile Photo *</h4>
                    <div className="relative border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[220px]">
                      {watchedProfileImage ? (
                        <div className="space-y-4">
                          <img src={watchedProfileImage.secureUrl} className="w-28 h-28 rounded-full object-cover border border-border shadow-sm mx-auto" alt="Profile" />
                          <Button type="button" variant="outline" size="sm" onClick={() => setValue("profileImage", undefined)} className="text-red-500 hover:text-red-700">Remove</Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full py-6">
                          {profileLoading ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
                          <span className="text-xs font-semibold text-foreground">Upload Profile Image</span>
                          <span className="text-[10px] text-muted-foreground">WebP, PNG or JPEG up to 10MB</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSingleImageUpload(e, "profileImage")} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Studio Logo */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Studio Logo (Optional)</h4>
                    <div className="relative border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[220px]">
                      {watchedLogo ? (
                        <div className="space-y-4">
                          <img src={watchedLogo.secureUrl} className="w-28 h-28 rounded-2xl object-contain bg-secondary border border-border shadow-sm mx-auto p-2" alt="Logo" />
                          <Button type="button" variant="outline" size="sm" onClick={() => setValue("logo", undefined)} className="text-red-500 hover:text-red-700">Remove</Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full py-6">
                          {logoLoading ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
                          <span className="text-xs font-semibold text-foreground">Upload Studio Logo</span>
                          <span className="text-[10px] text-muted-foreground">WebP, PNG or JPEG up to 10MB</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSingleImageUpload(e, "logo")} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Banner */}
                <div className="space-y-4 pt-4">
                  <h4 className="font-semibold text-foreground">Cover Banner</h4>
                  <div className="relative border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[250px]">
                    {watchedCoverImage ? (
                      <div className="space-y-4 w-full">
                        <img src={watchedCoverImage.secureUrl} className="w-full max-h-[200px] object-cover rounded-xl border border-border shadow-sm" alt="Cover" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setValue("coverImage", undefined)} className="text-red-500 hover:text-red-700">Remove Cover</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full py-8">
                        {coverLoading ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
                        <span className="text-xs font-semibold text-foreground">Upload Cover Banner</span>
                        <span className="text-[10px] text-muted-foreground">High resolution landscape image (recommended 1920x600)</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSingleImageUpload(e, "coverImage")} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PORTFOLIO TAB */}
            {activeTab === "portfolio" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Portfolio Grid ({watchedPortfolio.length} / 100 images)</h4>
                    <p className="text-xs text-muted-foreground">Upload, tag categories, and feature items in your public marketplace portfolio.</p>
                  </div>
                  <label className="cursor-pointer flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                    {portfolioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Portfolio Images
                    <input type="file" multiple className="hidden" accept="image/*" onChange={handlePortfolioUpload} disabled={portfolioLoading} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                  {watchedPortfolio.map((img, idx) => (
                    <div key={img.publicId} className="group border border-border bg-background rounded-2xl overflow-hidden shadow-sm relative transition-all hover:shadow-md flex flex-col">
                      <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                        <img src={img.secureUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Portfolio asset" />
                        
                        {/* Featured Badge */}
                        {img.isFeatured && (
                          <span className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                            ★ Featured
                          </span>
                        )}

                        {/* Mobile delete button always visible in top-right */}
                        <button
                          type="button"
                          onClick={() => handlePortfolioDelete(idx)}
                          className="absolute top-2 right-2 z-20 md:hidden bg-red-600 text-white p-1 rounded-lg shadow-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        {/* Top action overlays */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handlePortfolioReorder(idx, "up")}
                            disabled={idx === 0}
                            className="bg-black/70 hover:bg-black text-white p-1.5 rounded-lg disabled:opacity-50"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePortfolioReorder(idx, "down")}
                            disabled={idx === watchedPortfolio.length - 1}
                            className="bg-black/70 hover:bg-black text-white p-1.5 rounded-lg disabled:opacity-50"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePortfolioDelete(idx)}
                            className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-3 flex-grow flex flex-col justify-between">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Category Tag</label>
                          <select
                            value={img.category || "General"}
                            onChange={(e) => handlePortfolioCategoryChange(idx, e.target.value)}
                            className="w-full text-xs h-8 border border-border rounded-lg bg-background px-2"
                          >
                            <option value="General">General</option>
                            {SPECIALTIES.map((spec) => (
                              <option key={spec} value={spec}>{spec}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePortfolioFeaturedToggle(idx)}
                          className={`w-full text-xs py-1.5 rounded-lg border font-semibold transition-colors ${
                            img.isFeatured
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                              : "bg-background border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {img.isFeatured ? "★ Featured in Top Grid" : "☆ Feature in Top Grid"}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {watchedPortfolio.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground italic flex flex-col items-center justify-center">
                      <ImageIcon className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
                      Your portfolio is empty. Upload some high-quality work to attract bookings!
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <a
            href={`/photographers/${uid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-5 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Eye className="h-4 w-4" />
            Preview Public Profile
          </a>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="text-green-500 text-sm font-semibold flex items-center gap-1.5 animate-bounce">
              <CheckCircle className="h-4 w-4" /> Profile Updated Successfully!
            </span>
          )}

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto h-12 px-8 shadow-lg shadow-primary/20">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving Profiles...
              </>
            ) : (
              "Save Profile Changes"
            )}
          </Button>
        </div>
      </div>
    </form>

      {/* Delete Portfolio Photo Confirmation Modal */}
      {confirmDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Delete Photo?</h3>
            <p className="text-xs text-muted-foreground leading-normal">This photo will be permanently removed from your portfolio.</p>

            <div className="flex gap-2.5 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDeleteIndex(null)} className="text-xs h-8.5 rounded-xl">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                className="text-xs h-8.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default ProfileForm;
