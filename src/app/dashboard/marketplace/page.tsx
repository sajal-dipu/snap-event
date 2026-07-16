"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Camera,
  Share2,
  Copy,
  Check,
  Eye,
  Globe,
  Plus,
  Trash2,
  Edit,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  MessageSquare,
  Clock,
  Tag,
  Loader2,
  UploadCloud,
  Mail,
  Phone,
  ArrowRight,
  Info,
  CalendarDays
} from "lucide-react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { photographerService } from "@/services/PhotographerService";
import { reviewService } from "@/services/ReviewService";
import { db } from "@/lib/firebase/firestore";
import { doc, setDoc, deleteDoc, collection, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { PublicProfileView } from "@/features/photographers/components/PublicProfileView";

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

const SPECIALIZATIONS_LIST = [
  "Wedding",
  "Birthday",
  "Portrait",
  "Pre Wedding",
  "Maternity",
  "Event",
  "Product Photography",
  "Fashion"
];

export default function MarketplacePage() {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = React.useRef<HTMLInputElement>(null);

  // Stepper state
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [confirmDeletePublicId, setConfirmDeletePublicId] = React.useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = React.useState(false);

  // Load photographer profile from Firestore
  const { data: profileData, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["currentPhotographerProfile", user?.uid],
    queryFn: () => user?.uid ? photographerService.getById(user.uid) : Promise.resolve(null),
    enabled: !!user?.uid
  });

  // Load portfolio images from subcollection
  const { data: dbPortfolio = [], isLoading: isLoadingPortfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ["photographerPortfolio", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const snaps = await getDocs(
        query(
          collection(db, "photographers", user.uid, "portfolio"),
          orderBy("order", "asc")
        )
      );
      return snaps.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!user?.uid
  });

  // Local states
  const [portfolio, setPortfolio] = React.useState<any[]>([]);
  const [packages, setPackages] = React.useState<any[]>([]);
  const [profileSlug, setProfileSlug] = React.useState<string>("");
  const [isPublished, setIsPublished] = React.useState<boolean>(false);
  const [availabilityMap, setAvailabilityMap] = React.useState<Record<string, "available" | "booked" | "unavailable">>({});
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  // About tab fields
  const [studioName, setStudioName] = React.useState("");
  const [photographerName, setPhotographerName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [experience, setExperience] = React.useState<number>(0);
  const [location, setLocation] = React.useState("");
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [specializations, setSpecializations] = React.useState<string[]>([]);
  const [socialLinks, setSocialLinks] = React.useState({
    instagram: "",
    facebook: "",
    website: "",
    youtube: ""
  });
  const [profilePhoto, setProfilePhoto] = React.useState("");
  const [coverPhoto, setCoverPhoto] = React.useState("");

  // Contact tab fields
  const [phone, setPhone] = React.useState("");
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");

  // UI state variables
  const [isUploading, setIsUploading] = React.useState(false);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isAddingPkg, setIsAddingPkg] = React.useState(false);
  const [editingPkg, setEditingPkg] = React.useState<any>(null);

  // Package Form state
  const [pkgName, setPkgName] = React.useState("");
  const [pkgPrice, setPkgPrice] = React.useState<number>(10000);
  const [pkgDuration, setPkgDuration] = React.useState("4 Hours");
  const [pkgDesc, setPkgDesc] = React.useState("");
  const [pkgInclusions, setPkgInclusions] = React.useState("");
  const [pkgExtraCharges, setPkgExtraCharges] = React.useState("");

  // Calendar render state
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Sync state from fetched profileData
  React.useEffect(() => {
    if (profileData && !isInitialized) {
      setPackages(profileData.packages || profileData.pricingPackages || []);
      setProfileSlug(profileData.slug || "");
      setIsPublished(profileData.isPublished ?? profileData.marketplacePublished ?? false);
      setAvailabilityMap((profileData.availability as any) || {});

      setStudioName(profileData.studioName || "");
      setPhotographerName(profileData.name || profileData.displayName || "");
      setBio(profileData.bio || "");
      setExperience(profileData.experience || 0);
      setLocation(profileData.location || "");
      setLanguages(profileData.languages || []);
      setSpecializations(profileData.specializations || []);
      setProfilePhoto(profileData.profilePhoto || profileData.profileImage?.secureUrl || "");
      setCoverPhoto(profileData.coverPhoto || profileData.coverImage?.secureUrl || "");

      setSocialLinks({
        instagram: profileData.socialLinks?.instagram || "",
        facebook: profileData.socialLinks?.facebook || "",
        website: profileData.socialLinks?.website || "",
        youtube: profileData.socialLinks?.youtube || ""
      });

      setPhone(profileData.phone || "");
      setWhatsappNumber(profileData.whatsappNumber || "");
      setContactEmail(profileData.contactEmail || profileData.email || "");
      setIsInitialized(true);
    }
  }, [profileData, isInitialized]);

  // Sync state from dbPortfolio
  React.useEffect(() => {
    if (!dbPortfolio) return;

    setPortfolio((prev) => {
      if (prev.length === dbPortfolio.length) {
        const same = prev.every(
          (item, i) =>
            item.id === dbPortfolio[i]?.id &&
            (item.imageUrl || item.secureUrl || item.thumbnailUrl) ===
            ((dbPortfolio[i] as any)?.imageUrl || (dbPortfolio[i] as any)?.secureUrl || (dbPortfolio[i] as any)?.thumbnailUrl)
        );

        if (same) return prev;
      }

      return [...dbPortfolio];
    });
  }, [dbPortfolio]);

  // Recalculate completion metrics on local states
  const completionStats = React.useMemo(() => {
    const hasBasicInfo = !!(photographerName && studioName && bio && experience > 0 && location && specializations.length > 0);
    const hasPortfolio = !!(profilePhoto && coverPhoto && portfolio.length > 0);
    const hasPackages = packages.length > 0;
    const hasAvailability = Object.keys(availabilityMap).length > 0;
    const hasContact = !!(phone && contactEmail);

    let progress = 0;
    if (hasBasicInfo) progress += 20;
    if (hasPortfolio) progress += 20;
    if (hasPackages) progress += 20;
    if (hasAvailability) progress += 20;
    if (hasContact) progress += 20;

    return {
      progress,
      hasBasicInfo,
      hasPortfolio,
      hasPackages,
      hasAvailability,
      hasContact,
      isComplete: progress === 100
    };
  }, [photographerName, studioName, bio, experience, location, specializations, profilePhoto, coverPhoto, portfolio, packages, availabilityMap, phone, contactEmail]);

  // Save changes to Firestore database
  const saveToFirestore = async (updatedFields: Record<string, any>) => {
    if (!user?.uid) return;
    try {
      const mergedProfile = {
        ...profileData,
        ...updatedFields
      };

      const fieldsToSave = {
        ...updatedFields,
        profileCompletion: completionStats.progress
      };

      await photographerService.updateProfile(user.uid, fieldsToSave);
      await refetchProfile();
    } catch (err) {
      console.error("Failed to update profile", err);
      toast.error("Failed to sync updates to database.");
    }
  };

  // Bulk save and continue logic
  const handleSaveAndContinue = async () => {
    // 1. Validate required fields for current step
    if (currentStep === 1) {
      if (!photographerName.trim()) {
        toast.error("Photographer Name is required.");
        return;
      }
      if (!studioName.trim()) {
        toast.error("Studio Name is required.");
        return;
      }
    }
    if (currentStep === 5) {
      if (!phone.trim() && !contactEmail.trim()) {
        toast.error("Please provide at least a Mobile Number or Direct Email.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const fieldsToSave = {
        name: photographerName,
        displayName: photographerName,
        studioName,
        bio,
        experience,
        location,
        languages,
        specializations,
        specialties: specializations,
        phone,
        whatsappNumber,
        contactEmail,
        socialLinks,
        packages,
        availability: availabilityMap,
        address: {
          city: location,
          state: "",
          country: "India"
        }
      };

      await photographerService.updateProfile(user!.uid, {
        ...fieldsToSave,
        profileCompletion: completionStats.progress
      });
      await refetchProfile();
      toast.success("Profile saved successfully.");
    } catch (saveErr) {
      console.error("[Wizard save] Failed saving profile:", saveErr);
      toast.warning("Draft saved locally, but failed syncing to cloud database.");
    } finally {
      setIsSaving(false);
      if (currentStep < 7) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Link copy action
  const publicUrl = profileSlug ? `https://snapevent.com/p/${profileSlug}` : "";
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setIsCopied(true);
    toast.success("Profile URL Copied to Clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Publish/Unpublish trigger
  const handlePublishToggle = async (newState: boolean) => {
    if (!user?.uid) return;

    if (newState && !completionStats.isComplete) {
      toast.error("You cannot publish an incomplete profile. Setup all 5 sections to 100% first.");
      return;
    }

    const firstPkg = packages[0] || {};
    const firstPrice = parseInt(firstPkg.price, 10) || 1000;

    const updateFields: Record<string, any> = {
      isPublished: newState,
      marketplacePublished: newState,
      marketplaceStatus: newState ? "live" : "draft",
      hourlyPrice: firstPrice
    };

    if (newState) {
      updateFields.publishedAt = serverTimestamp();
    }

    if (newState && !profileSlug) {
      const rawName = studioName || photographerName || "photographer";
      let targetSlug = rawName.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (!targetSlug) targetSlug = `photographer-${user.uid.slice(0, 5)}`;
      setProfileSlug(targetSlug);
      updateFields.slug = targetSlug;
    }

    try {
      await saveToFirestore(updateFields);
      setIsPublished(newState);
      if (newState) {
        toast.success("Your Marketplace Booking Profile is now Live!");
      } else {
        toast.warning("Profile unpublished. It is no longer visible to user marketplace.");
      }
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  // Trigger file pickers
  const triggerFilePicker = () => fileInputRef.current?.click();
  const triggerProfilePhotoPicker = () => profilePhotoInputRef.current?.click();
  const triggerCoverPhotoPicker = () => coverPhotoInputRef.current?.click();

  // Cloudinary image upload helper for single images (profile photo / cover photo)
  const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "profile" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    const loadingToastId = toast.loading(`Uploading image...`);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `snapevent/photographers/${user.uid}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Cloudinary upload failed");

      const data = await res.json();
      const imageUrl = data.secure_url;

      if (target === "profile") {
        setProfilePhoto(imageUrl);
        await saveToFirestore({
          profilePhoto: imageUrl,
          profileImage: { publicId: data.public_id, secureUrl: imageUrl }
        });
        toast.success("Profile photo uploaded!");
      } else {
        setCoverPhoto(imageUrl);
        await saveToFirestore({
          coverPhoto: imageUrl,
          coverImage: { publicId: data.public_id, secureUrl: imageUrl }
        });
        toast.success("Cover banner uploaded!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload image.");
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  // Handle portfolio uploads to Cloudinary and sync both subcollection and photographer doc field
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.uid) return;

    const fileList = Array.from(files);
    const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
    const invalidFiles = fileList.filter((f) => !allowedFormats.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Only JPG, PNG, and WEBP formats are allowed.");
      return;
    }

    if (portfolio.length + fileList.length > 20) {
      toast.error(`Maximum 20 photos allowed. You currently have ${portfolio.length}.`);
      return;
    }

    setIsUploading(true);
    const loadingToastId = toast.loading(`Uploading ${fileList.length} photo(s)...`);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      const newUploadedAssets: any[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", `snapevent/photographers/${user.uid}/portfolio`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Cloudinary upload failed for ${file.name}`);
        }

        const data = await res.json();
        const asset = {
          id: `port-${Date.now()}-${i}`,
          imageUrl: data.secure_url,
          thumbnailUrl: data.secure_url.replace("/upload/", "/upload/c_scale,w_300,q_auto/"),
          publicId: data.public_id,
          uploadedAt: new Date().toISOString(),
          order: portfolio.length + i,
          category: "General"
        };

        newUploadedAssets.push(asset);

        // Save to Firestore subcollection
        const docRef = doc(collection(db, "photographers", user.uid, "portfolio"));
        await setDoc(docRef, asset);
      }

      // Also update the list in the main photographers doc "portfolio" field
      const updatedPortfolioArray = [...portfolio, ...newUploadedAssets];
      await saveToFirestore({ portfolio: updatedPortfolioArray });

      setPortfolio((prev) => [
        ...prev,
        ...newUploadedAssets
      ]);

      toast.success("Photos uploaded successfully!");
      await refetchPortfolio();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload photos.");
    } finally {
      setIsUploading(false);
      toast.dismiss(loadingToastId);
    }
  };

  // Set as Cover Photo trigger
  const handleSetAsCover = async (imageUrl: string, publicId: string) => {
    try {
      setCoverPhoto(imageUrl);
      await saveToFirestore({
        coverPhoto: imageUrl,
        coverImage: { publicId, secureUrl: imageUrl }
      });
      toast.success("Cover banner updated to selected photo!");
    } catch (err) {
      toast.error("Failed to update cover photo.");
    }
  };

  // Delete Portfolio Image & Sync
  const handleDeletePortfolio = async (id: string, publicId: string) => {
    if (!user?.uid) return;
    try {
      // 1. Check if the deleted image was the cover photo
      const deletedItem = portfolio.find(item => item.id === id);
      const deletedUrl = deletedItem?.imageUrl || deletedItem?.secureUrl || "";
      const isCurrentlyCover = coverPhoto && (
        coverPhoto === deletedUrl ||
        (deletedItem?.publicId && profileData?.coverImage?.publicId === deletedItem.publicId)
      );

      // 2. Perform Firestore and Cloudinary deletions
      await deleteDoc(doc(db, "photographers", user.uid, "portfolio", id));
      const updatedPortfolioArray = portfolio.filter((item) => item.id !== id);

      // Update main photographer document portfolio list
      await saveToFirestore({ portfolio: updatedPortfolioArray });

      // Update local state immediately
      setPortfolio(updatedPortfolioArray);

      // 3. Delete from Cloudinary
      await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds: [publicId] })
      });

      // 4. Set next cover if this was the cover
      if (isCurrentlyCover) {
        const index = portfolio.findIndex(item => item.id === id);
        const nextCoverItem = updatedPortfolioArray[index] || updatedPortfolioArray[index - 1] || updatedPortfolioArray[0] || null;

        if (nextCoverItem) {
          const nextUrl = nextCoverItem.imageUrl || nextCoverItem.secureUrl || "";
          const nextPublicId = nextCoverItem.publicId || "";
          setCoverPhoto(nextUrl);
          await saveToFirestore({
            coverPhoto: nextUrl,
            coverImage: { publicId: nextPublicId, secureUrl: nextUrl }
          });
        } else {
          setCoverPhoto("");
          await saveToFirestore({
            coverPhoto: "",
            coverImage: null
          });
        }
      }

      toast.success("Portfolio photo deleted successfully.");
      await refetchPortfolio();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item.");
    }
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...portfolio];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setPortfolio(updated);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || !user?.uid) return;
    setDraggedIndex(null);
    try {
      const promises = portfolio.map((item, index) => {
        const ref = doc(db, "photographers", user.uid, "portfolio", item.id);
        return setDoc(ref, { order: index }, { merge: true });
      });
      await Promise.all(promises);
      await saveToFirestore({ portfolio: portfolio });
      toast.success("Portfolio order updated!");
      refetchPortfolio();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save portfolio order.");
    }
  };

  // Package Form Add/Edit Submission
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName || !pkgPrice) {
      toast.error("Please enter a Package Name and Price");
      return;
    }

    const packageItem = {
      id: editingPkg ? editingPkg.id : `pkg-${Date.now()}`,
      name: pkgName,
      title: pkgName,
      price: pkgPrice,
      duration: pkgDuration,
      description: pkgDesc,
      includedServices: pkgInclusions ? pkgInclusions.split(",").map((s) => s.trim()).filter(Boolean) : ["Standard Coverage"],
      features: pkgInclusions ? pkgInclusions.split(",").map((s) => s.trim()).filter(Boolean) : ["Standard Coverage"],
      extraCharges: pkgExtraCharges || "None"
    };

    let updatedPackages;
    if (editingPkg) {
      updatedPackages = packages.map((p) => p.id === editingPkg.id ? packageItem : p);
      toast.success("Package updated successfully!");
    } else {
      updatedPackages = [...packages, packageItem];
      toast.success("Package created successfully!");
    }

    setPackages(updatedPackages);
    await saveToFirestore({
      packages: updatedPackages,
      pricingPackages: updatedPackages
    });

    setIsAddingPkg(false);
    setEditingPkg(null);
    setPkgName("");
    setPkgPrice(10000);
    setPkgDesc("");
    setPkgDuration("4 Hours");
    setPkgInclusions("");
    setPkgExtraCharges("");
  };

  // Delete Package
  const handleDeletePackage = async (id: string) => {
    const updatedPackages = packages.filter((p) => p.id !== id);
    setPackages(updatedPackages);
    await saveToFirestore({
      packages: updatedPackages,
      pricingPackages: updatedPackages
    });
    toast.success("Package removed.");
  };

  // Open Edit Package Form
  const openEditPackage = (pkg: any) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name || pkg.title || "");
    setPkgPrice(typeof pkg.price === "number" ? pkg.price : parseInt(pkg.price?.replace(/[^0-9]/g, "")) || 10000);
    setPkgDesc(pkg.description || "");
    setPkgDuration(pkg.duration || "4 Hours");
    setPkgInclusions(pkg.includedServices?.join(", ") || pkg.features?.join(", ") || "");
    setPkgExtraCharges(pkg.extraCharges || "");
    setIsAddingPkg(true);
  };

  // Calendar helpers
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Toggle single date status
  const handleCalendarDayClick = (dayStr: string) => {
    setSelectedDate(dayStr);
  };

  const setDateStatus = async (status: "available" | "booked" | "unavailable") => {
    if (!selectedDate) return;
    const updatedMap = {
      ...availabilityMap,
      [selectedDate]: status
    };
    setAvailabilityMap(updatedMap);
    await saveToFirestore({ availability: updatedMap });
    setSelectedDate(null);
    toast.success(`Date status updated to: ${status}`);
  };

  // Memoized photographer object for public page live preview
  const previewPhotographerObject = React.useMemo(() => {
    return {
      uid: user?.uid || "",
      email: user?.email || "",
      name: photographerName || user?.displayName || "Studio Artist",
      displayName: photographerName || user?.displayName || "Studio Artist",
      role: "photographer" as const,
      isPublished,
      specializations,
      specialties: specializations,
      portfolio,
      packages,
      location,
      whatsappNumber,
      contactEmail,
      studioName: studioName || "My Creative Studio",
      bio: bio || "Photographer bio preview description details.",
      phone,
      experience: experience || 1,
      languages: languages.length > 0 ? languages : ["English"],
      address: {
        city: location || "India",
        state: "",
        country: "India"
      },
      profileImage: profilePhoto ? { secureUrl: profilePhoto, publicId: "" } : null,
      coverImage: coverPhoto ? { secureUrl: coverPhoto, publicId: "" } : null,
      portfolioImages: portfolio.map((img) => typeof img === 'string' ? { secureUrl: img, publicId: "" } : img),
      socialLinks,
      availability: availabilityMap,
      ratingStats: profileData?.ratingStats || { average: 4.8, count: 0 },
      pricingPackages: packages,
      startingPrice: packages.reduce((min, p) => p.price < min ? p.price : min, 999999) === 999999 ? 0 : packages.reduce((min, p) => p.price < min ? p.price : min, 999999),
      currency: "INR",
      blocked: false,
      isVerified: true,
      verificationStatus: "verified" as const,
      status: "active",
      profileCompleted: true,
      onboardingCompleted: true,
      profilePhoto: profilePhoto,
      coverPhoto: coverPhoto,
      rating: 4.8,
      ratingCount: 0,
      isActive: true,
      isFeatured: false,
      isSuspended: false,
      createdAt: null as any,
      updatedAt: null as any,
      timezone: "Asia/Kolkata",
      totalBookings: 0,
      completedBookings: 0,
      totalRooms: 0,
      totalPhotosUploaded: 0
    };
  }, [user, photographerName, isPublished, specializations, portfolio, packages, location, whatsappNumber, contactEmail, studioName, bio, phone, experience, languages, profilePhoto, coverPhoto, socialLinks, availabilityMap, profileData]);

  // Debugging logs
  console.log("Firestore Portfolio:", dbPortfolio);
  console.log("Local Portfolio:", portfolio);

  if (isLoadingProfile) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhotographerDashboardLayout>
    );
  }

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 pb-12 select-none">

        {/* Hidden Upload Triggers */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".jpg,.jpeg,.png,.webp" className="hidden" />
        <input type="file" ref={profilePhotoInputRef} onChange={(e) => handleSingleImageUpload(e, "profile")} accept=".jpg,.jpeg,.png,.webp" className="hidden" />
        <input type="file" ref={coverPhotoInputRef} onChange={(e) => handleSingleImageUpload(e, "cover")} accept=".jpg,.jpeg,.png,.webp" className="hidden" />

        {/* Wizard Header Banner */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 border-b border-border pb-5">
          <div className="space-y-1.5">
            <span className="bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 w-max">
              <Sparkles className="h-3 w-3 animate-pulse" /> Complete Your Profile
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Photographer Setup Wizard
            </h1>
            <p className="text-xs text-muted-foreground">
              Follow the steps to construct a premium photographer portfolio and publish it live on the marketplace.
            </p>
          </div>

          {/* Quick Preview Links */}
          {isPublished && (
            <div className="flex items-center gap-2.5">
              <a
                href={`/p/${profileSlug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 text-xs font-bold px-4 py-2.5 rounded-xl bg-card hover:bg-secondary transition-all"
              >
                <Eye className="h-4 w-4" /> Preview Public Page
              </a>
              <Button
                variant="outline"
                className="text-red-500 hover:text-red-500 hover:bg-red-500/5 text-xs font-bold h-9.5 px-4 rounded-xl"
                onClick={() => handlePublishToggle(false)}
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" /> Unpublish Profile
              </Button>
            </div>
          )}
        </div>

        {/* Completion Progress Tracking Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Profile Completion Score</span>
            <span className="text-primary font-black">{completionStats.progress}% Complete</span>
          </div>

          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${completionStats.progress}%` }}
            />
          </div>

          {/* Setup checklist grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {[
              { label: "1. Basic Info", done: completionStats.hasBasicInfo },
              { label: "2. Portfolio", done: completionStats.hasPortfolio },
              { label: "3. Packages", done: completionStats.hasPackages },
              { label: "4. Availability", done: completionStats.hasAvailability },
              { label: "5. Contact Details", done: completionStats.hasContact }
            ].map((sec, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${sec.done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground border border-border"
                  }`}>
                  {sec.done ? "✓" : idx + 1}
                </span>
                <span className={sec.done ? "text-foreground font-semibold" : "text-muted-foreground"}>
                  {sec.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Steps Tabs Navigation */}
        <div className="flex border-b border-border bg-card/65 p-1 rounded-2xl border overflow-x-auto scrollbar-none gap-1">
          {[
            { id: 1, label: "Basic Info" },
            { id: 2, label: "Portfolio Upload" },
            { id: 3, label: "Packages" },
            { id: 4, label: "Availability" },
            { id: 5, label: "Contact Info" },
            { id: 6, label: "Preview Profile" },
            { id: 7, label: "Publish Live" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentStep(tab.id)}
              className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${currentStep === tab.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* WIZARD CONTENT SECTIONS */}
        <div className="space-y-6">

          {/* SECTION 1: BASIC INFORMATION */}
          {currentStep === 1 && (
            <Card className="border border-border p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">1. Studio & Identity Setup</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure your personal name, bio, experience metrics, locations, and specializations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Photographer Display Name *</label>
                  <Input
                    type="text"
                    value={photographerName}
                    onChange={(e) => setPhotographerName(e.target.value)}
                    placeholder="e.g. Raj Mehta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Studio / Creative Brand Name *</label>
                  <Input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="e.g. Mehta Wedding Films"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Creative Bio / Vision *</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell clients about your shooting style, backdrop choices, and creative philosophy..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Years of Professional Experience *</label>
                  <Input
                    type="number"
                    value={experience || ""}
                    onChange={(e) => setExperience(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Location (City) *</label>
                  <Input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Languages Spoken (comma separated) *</label>
                  <Input
                    type="text"
                    value={languages.join(", ")}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setLanguages(list);
                    }}
                    placeholder="e.g. English, Hindi"
                  />
                </div>
              </div>

              {/* Specializations checkboxes list */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Specializations (Select at least 1) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {SPECIALIZATIONS_LIST.map((spec) => {
                    const isChecked = specializations.includes(spec);
                    return (
                      <label key={spec} className="flex items-center gap-2 p-3 bg-secondary/15 hover:bg-secondary/30 rounded-xl cursor-pointer text-xs font-semibold select-none border border-border/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? specializations.filter((s) => s !== spec)
                              : [...specializations, spec];
                            setSpecializations(updated);
                          }}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        {spec}
                      </label>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 2: PORTFOLIO UPLOAD */}
          {currentStep === 2 && (
            <Card className="border border-border p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">2. Media & Portfolio Uploads</h3>
                <p className="text-xs text-muted-foreground mt-1">Upload profile headshots, cover banners, and drag-and-drop sortable portfolio items.</p>
              </div>

              {/* Profile and Cover Upload Rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Profile photo block */}
                <div className="bg-secondary/10 p-5 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Profile Photo *</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">Large face headshot for card display.</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-secondary border border-border overflow-hidden relative">
                    {profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera className="h-6 w-6" /></div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={triggerProfilePhotoPicker} className="text-xs font-semibold gap-1.5 rounded-xl">
                    <UploadCloud className="h-4 w-4 text-zinc-500" /> Upload Image
                  </Button>
                </div>

                {/* Cover banner block */}
                <div className="bg-secondary/10 p-5 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-between gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Cover Banner *</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">High-resolution banner overlay for public public view profile headers.</p>
                  </div>
                  <div className="w-full h-20 rounded-xl bg-secondary border border-border overflow-hidden relative">
                    {coverPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera className="h-6 w-6" /></div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={triggerCoverPhotoPicker} className="text-xs font-semibold gap-1.5 rounded-xl">
                    <UploadCloud className="h-4 w-4 text-zinc-500" /> Upload Banner
                  </Button>
                </div>
              </div>

              {/* Portfolio Grid block */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Portfolio Showcase *</h4>
                    <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">Upload up to 20 images. Drag cards to reorder them.</p>
                  </div>
                  <Button onClick={triggerFilePicker} size="sm" className="gap-1.5 text-xs h-8.5 rounded-xl">
                    <Plus className="h-4 w-4" /> Add Photos
                  </Button>
                </div>

                {isUploading && (
                  <div className="p-4 bg-secondary/15 rounded-xl border border-border/40 text-center text-xs text-muted-foreground italic flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading portfolio photos...
                  </div>
                )}

                {/* Portfolio items grid */}
                {isLoadingPortfolio ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="aspect-[4/3] bg-secondary/50 border border-border/20 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {portfolio.map((img, idx) => (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        className="group aspect-[4/3] bg-secondary border border-border rounded-xl overflow-hidden relative cursor-move hover:shadow transition-shadow"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl || img.secureUrl || img.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-lg backdrop-blur-sm z-10">
                          <button
                            type="button"
                            title="Preview"
                            onClick={() => setPreviewImageUrl(img.imageUrl || img.secureUrl || img.thumbnailUrl)}
                            className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Set as Cover Photo"
                            onClick={() => handleSetAsCover(img.imageUrl || img.secureUrl || img.thumbnailUrl, img.publicId)}
                            className="p-1.5 rounded hover:bg-white/20 text-amber-400 transition-colors"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Photo"
                            onClick={() => {
                              setConfirmDeleteId(img.id);
                              setConfirmDeletePublicId(img.publicId);
                            }}
                            className="p-1.5 rounded hover:bg-red-600/80 text-white transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-300" />
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[8px] font-bold text-white px-1.5 py-0.5 rounded uppercase">
                          {img.category || "General"}
                        </span>
                      </div>
                    ))}

                    {portfolio.length === 0 && (
                      <div className="col-span-full border border-dashed border-border/80 rounded-2xl py-12 text-center text-xs text-muted-foreground italic">
                        No portfolio photos uploaded yet. Click "Add Photos" above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* SECTION 3: PACKAGE CREATION */}
          {currentStep === 3 && (
            <Card className="border border-border p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">3. Packages & Pricing Tiers</h3>
                  <p className="text-xs text-muted-foreground mt-1">Design shoot packages (e.g. Silver Package, Gold Package, Premium Package) that clients select directly.</p>
                </div>
                {!isAddingPkg && (
                  <Button onClick={() => { setIsAddingPkg(true); setEditingPkg(null); }} size="sm" className="gap-1.5 text-xs h-8.5 rounded-xl">
                    <Plus className="h-4 w-4" /> Create Package
                  </Button>
                )}
              </div>

              {/* Package Add/Edit form */}
              {isAddingPkg && (
                <form onSubmit={handleSavePackage} className="bg-secondary/10 p-5 rounded-2xl border border-border/50 space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{editingPkg ? "Edit Package Details" : "Create New Pricing Package"}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Package Name *</label>
                      <Input
                        type="text"
                        required
                        value={pkgName}
                        onChange={(e) => setPkgName(e.target.value)}
                        placeholder="e.g. Silver Package"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Base Rate Price (INR) *</label>
                      <Input
                        type="number"
                        required
                        value={pkgPrice || ""}
                        onChange={(e) => setPkgPrice(parseInt(e.target.value, 10) || 0)}
                        placeholder="e.g. 10000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Coverage Duration *</label>
                      <Input
                        type="text"
                        required
                        value={pkgDuration}
                        onChange={(e) => setPkgDuration(e.target.value)}
                        placeholder="e.g. 4 Hours"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Description *</label>
                    <Textarea
                      required
                      value={pkgDesc}
                      onChange={(e) => setPkgDesc(e.target.value)}
                      placeholder="Outline what shoots are supported, the deliverables, styling, and general timelines..."
                      rows={2.5}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Included Deliverables (comma separated) *</label>
                      <Input
                        type="text"
                        value={pkgInclusions}
                        onChange={(e) => setPkgInclusions(e.target.value)}
                        placeholder="e.g. 50 Retouched Photos, Online Gallery"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Extra Charges Details (if any)</label>
                      <Input
                        type="text"
                        value={pkgExtraCharges}
                        onChange={(e) => setPkgExtraCharges(e.target.value)}
                        placeholder="e.g. ₹2,000 per additional hour"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddingPkg(false); setEditingPkg(null); }} className="text-xs h-8.5 rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="text-xs h-8.5 rounded-xl">
                      {editingPkg ? "Save Changes" : "Save Package"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Packages List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-card border border-border/80 rounded-2xl p-5 hover:shadow transition-shadow flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] uppercase tracking-wide bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md">
                            {pkg.duration}
                          </span>
                          <h4 className="font-bold text-sm text-foreground mt-1.5">{pkg.name || pkg.title}</h4>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditPackage(pkg)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-normal line-clamp-2">{pkg.description}</p>

                      <ul className="text-[10px] text-muted-foreground space-y-1 border-t border-border/40 pt-2.5">
                        {(pkg.includedServices || pkg.features || [])?.slice(0, 3).map((item: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-4">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Price Rate</span>
                      <span className="text-base font-black text-foreground">₹{pkg.price?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                {packages.length === 0 && !isAddingPkg && (
                  <div className="col-span-full border border-dashed border-border/85 rounded-2xl py-12 text-center text-xs text-muted-foreground italic">
                    No packages created. Click "Create Package" above to get started.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* SECTION 4: AVAILABILITY CALENDAR */}
          {currentStep === 4 && (
            <Card className="border border-border p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">4. Availability Calendar</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure calendar dates and set them as Available (green), Booked (indigo), or Unavailable (red/gray).</p>
              </div>

              {/* Monthly calendar stepper */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex gap-1 shrink-0">
                  <button onClick={prevMonth} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground"><ChevronLeft className="h-4.5 w-4.5" /></button>
                  <span className="text-xs font-bold text-foreground self-center px-3 capitalize">
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <button onClick={nextMonth} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground"><ChevronRight className="h-4.5 w-4.5" /></button>
                </div>

                <div className="flex gap-4 text-[9px] text-muted-foreground select-none">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-zinc-300 dark:bg-zinc-800" /> Unavailable</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2.5 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d} className="font-extrabold text-muted-foreground py-1 uppercase text-[10px] tracking-wide">{d}</span>
                ))}

                {Array.from({ length: startDayOfMonth(currentDate) }).map((_, idx) => (
                  <span key={`empty-${idx}`} />
                ))}

                {Array.from({ length: daysInMonth(currentDate) }).map((_, idx) => {
                  const d = idx + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const status = availabilityMap[dateStr] || "unavailable";

                  let colorClass = "bg-secondary text-muted-foreground hover:bg-secondary/70";
                  if (status === "available") {
                    colorClass = "bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20";
                  } else if (status === "booked") {
                    colorClass = "bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20";
                  }

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleCalendarDayClick(dateStr)}
                      className={`aspect-square p-2.5 rounded-xl font-bold flex items-center justify-center transition-all ${colorClass}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Set Availability status popover details */}
              {selectedDate && (
                <div className="bg-secondary/15 p-4 rounded-2xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs font-bold text-foreground">Configure Status for Date:</p>
                    <p className="text-xs font-black text-primary font-mono mt-0.5">{selectedDate}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDateStatus("available")} className="text-xs font-bold text-green-600 border-green-500/20 bg-green-500/5 hover:bg-green-500/15">
                      Mark Available
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDateStatus("booked")} className="text-xs font-bold text-blue-600 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15">
                      Mark Booked
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDateStatus("unavailable")} className="text-xs font-bold text-zinc-600 dark:text-zinc-400 border-zinc-500/20 bg-zinc-500/5 hover:bg-zinc-505/15">
                      Mark Blocked / Closed
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 5: CONTACT INFORMATION */}
          {currentStep === 5 && (
            <Card className="border border-border p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">5. Booking Contacts & Links</h3>
                <p className="text-xs text-muted-foreground mt-1">Provide direct call/chat numbers and social media profile URLs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mobile Number (Call) *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">WhatsApp Chat Number *</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Include country code"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Direct Hire Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. hire@studio.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels link */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Social Media Profiles</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><InstagramIcon className="text-pink-500" /> Instagram Link</label>
                    <Input
                      type="url"
                      value={socialLinks.instagram}
                      onChange={(e) => {
                        const updated = { ...socialLinks, instagram: e.target.value };
                        setSocialLinks(updated);
                      }}
                      placeholder="https://instagram.com/my-profile"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FacebookIcon className="text-blue-600" /> Facebook Link</label>
                    <Input
                      type="url"
                      value={socialLinks.facebook}
                      onChange={(e) => {
                        const updated = { ...socialLinks, facebook: e.target.value };
                        setSocialLinks(updated);
                      }}
                      placeholder="https://facebook.com/my-page"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><YoutubeIcon className="text-red-600" /> YouTube Channel Link</label>
                    <Input
                      type="url"
                      value={socialLinks.youtube}
                      onChange={(e) => {
                        const updated = { ...socialLinks, youtube: e.target.value };
                        setSocialLinks(updated);
                      }}
                      placeholder="https://youtube.com/my-channel"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Globe className="h-4 w-4 text-indigo-500" /> Custom Studio Website</label>
                    <Input
                      type="url"
                      value={socialLinks.website}
                      onChange={(e) => {
                        const updated = { ...socialLinks, website: e.target.value };
                        setSocialLinks(updated);
                      }}
                      placeholder="https://mystudio.com"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 6: PREVIEW PAGE */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Eye className="h-4.5 w-4.5 text-primary" /> Live Public Profile Preview
                  </h3>
                  <p className="text-[10px] text-muted-foreground">This is exactly how your public storefront appears to visitors browsing the marketplace.</p>
                </div>
              </div>

              {/* Render PublicProfileView dynamically with current state */}
              <div className="border border-border/80 rounded-3xl overflow-hidden shadow-inner max-h-[75vh] overflow-y-auto bg-background">
                <PublicProfileView photographer={previewPhotographerObject as any} />
              </div>
            </div>
          )}

          {/* SECTION 7: PUBLISH PAGE */}
          {currentStep === 7 && (
            <Card className="border border-border p-8 rounded-3xl space-y-6 text-center max-w-xl mx-auto">

              {/* Progress visual */}
              <div className="flex justify-center pt-2">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Globe className="h-10 w-10 animate-bounce" />
                </div>
              </div>

              {completionStats.progress < 100 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-foreground">Wizard Incomplete ({completionStats.progress}%)</h3>
                    <p className="text-xs text-muted-foreground leading-normal max-w-md mx-auto">
                      Please configure all 5 sections to 100% to live publish your profile. Review what remains in the checklist below:
                    </p>
                  </div>

                  <div className="bg-secondary/20 p-5 rounded-2xl border border-border text-left space-y-2 max-w-sm mx-auto text-xs">
                    <p className="font-bold text-foreground">Remaining Checklist Actions:</p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${completionStats.hasBasicInfo ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-800"}`}>{completionStats.hasBasicInfo ? "✓" : ""}</span>
                        Basic Setup (Name, Bio, Experience, specialties)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${completionStats.hasPortfolio ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-800"}`}>{completionStats.hasPortfolio ? "✓" : ""}</span>
                        Media (Profile photo, Cover banner, 1+ portfolio photos)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${completionStats.hasPackages ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-800"}`}>{completionStats.hasPackages ? "✓" : ""}</span>
                        Pricing (Create at least 1 client package)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${completionStats.hasAvailability ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-800"}`}>{completionStats.hasAvailability ? "✓" : ""}</span>
                        Availability (Mark at least 1 date on calendar)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${completionStats.hasContact ? "bg-emerald-500 text-white" : "bg-zinc-300 dark:bg-zinc-800"}`}>{completionStats.hasContact ? "✓" : ""}</span>
                        Contacts (Provide phone & contact email)
                      </li>
                    </ul>
                  </div>

                  <Button disabled className="w-full max-w-sm mt-4 opacity-50 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" /> Complete setup to Publish
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-foreground">Setup Complete (100%)</h3>
                    <p className="text-xs text-muted-foreground leading-normal max-w-md mx-auto">
                      All steps verified! Click below to publish your portfolio details and allow marketplace clients to book dates.
                    </p>
                  </div>

                  {isPublished ? (
                    <div className="space-y-4 pt-2">
                      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold py-2 px-4 rounded-xl">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Profile Live & Booking Visible</span>
                      </div>

                      {/* Customize slug and share links */}
                      <div className="flex flex-col gap-2 pt-2 max-w-md mx-auto">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground font-mono">
                            p/
                          </span>
                          <Input
                            type="text"
                            value={profileSlug}
                            onChange={(e) => {
                              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                              setProfileSlug(value);
                              saveToFirestore({ slug: value });
                            }}
                            className="pl-[25px] bg-background font-mono text-xs font-bold border-zinc-200 dark:border-zinc-800"
                            placeholder="custom-slug"
                          />
                        </div>

                        <Button onClick={handleCopyLink} variant="outline" className="w-full gap-2 text-xs h-10 rounded-xl">
                          <Copy className="h-4 w-4" /> Copy Booking URL
                        </Button>
                        <a href={`/p/${profileSlug}`} target="_blank" rel="noreferrer" className="w-full">
                          <Button variant="default" className="w-full gap-2 text-xs h-10 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black">
                            <Eye className="h-4 w-4" /> Open Public Profile
                          </Button>
                        </a>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full max-w-sm mt-4 text-red-500 hover:bg-red-500/5 hover:text-red-500 h-10.5 rounded-xl border border-red-500/15"
                        onClick={() => handlePublishToggle(false)}
                      >
                        <Lock className="h-4 w-4 mr-2" /> Unpublish Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-sm mx-auto pt-2 flex flex-col items-center gap-3">
                      <div className="inline-flex items-center gap-2 bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-xs font-bold py-2 px-4 rounded-xl">
                        <span>Status: Draft / Hidden</span>
                      </div>

                      <a href={`/p/${profileSlug}`} target="_blank" rel="noreferrer" className="w-full">
                        <Button variant="outline" className="w-full gap-2 text-xs h-10 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <Eye className="h-4 w-4" /> Preview Public Page
                        </Button>
                      </a>

                      <Button
                        onClick={() => setShowPublishConfirm(true)}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-extrabold shadow-lg shadow-indigo-600/20 h-11 rounded-xl"
                      >
                        <Unlock className="h-4 w-4 mr-2 animate-pulse" /> Publish Profile
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Action button triggers bottom bar (Back / Save & Continue) */}
        {currentStep < 7 && (
          <div className="border-t border-border pt-5 flex items-center justify-between gap-4 mt-6">
            <Button
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(currentStep - 1)}
              className="gap-1.5 text-xs h-9.5 rounded-xl"
            >
              <ChevronLeft className="h-4.5 w-4.5" /> Back
            </Button>

            <Button
              onClick={handleSaveAndContinue}
              disabled={currentStep === 7 || isSaving}
              className="gap-1.5 text-xs h-9.5 rounded-xl bg-primary text-primary-foreground font-bold shrink-0 min-w-[130px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Save & Continue <ChevronRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </div>
        )}

      </div>

      {/* Fullscreen Portfolio Image Preview Lightbox Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <XCircle className="h-6 w-6 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImageUrl} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" alt="" />
        </div>
      )}

      {/* Delete Portfolio Photo Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Delete this portfolio photo?</h3>
            <p className="text-xs text-muted-foreground leading-normal">This will permanently remove the image from your portfolio showcase and Cloudinary. This action cannot be undone.</p>

            <div className="flex gap-2.5 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => { setConfirmDeleteId(null); setConfirmDeletePublicId(null); }} className="text-xs h-8.5 rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const id = confirmDeleteId;
                  const pubId = confirmDeletePublicId;
                  setConfirmDeleteId(null);
                  setConfirmDeletePublicId(null);
                  if (id && pubId) {
                    await handleDeletePortfolio(id, pubId);
                  }
                }}
                className="text-xs h-8.5 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Publish Profile Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex justify-center pt-2">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                <Globe className="h-6 w-6 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>
            <h3 className="text-base font-bold text-foreground">Publish your photographer profile globally?</h3>
            <p className="text-xs text-muted-foreground leading-normal">After publishing, users can discover and book you.</p>

            <div className="flex gap-2.5 justify-center pt-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setShowPublishConfirm(false)} className="text-xs h-8.5 rounded-xl w-full">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setShowPublishConfirm(false);
                  await handlePublishToggle(true);
                }}
                className="text-xs h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white w-full font-bold"
              >
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </PhotographerDashboardLayout>
  );
}
