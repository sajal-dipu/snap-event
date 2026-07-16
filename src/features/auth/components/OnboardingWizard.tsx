"use client";

/**
 * OnboardingWizard
 *
 * Runs AFTER email verification is complete.
 * Collects: Studio info → Specialties → Pricing & Languages → Photos.
 * On final submit: uploads photos to Cloudinary, creates the Firestore
 * photographer document, sets auth state, then redirects to /dashboard.
 *
 * Error handling:
 *  - Cloudinary failure → stays on Photos step, shows retry banner.
 *  - Firestore failure  → shows retry banner with the same uploaded assets.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Building2,
  DollarSign,
  Camera,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { onAuthStateChanged } from "firebase/auth";

import {
  SignUpStep2Schema,
  SignUpStep3Schema,
  SignUpStep4Schema,
  type SignUpStep2Data,
  type SignUpStep3Data,
  type SignUpStep4Data,
  PHOTOGRAPHY_SPECIALTIES,
  CURRENCIES,
  LANGUAGES,
} from "@/lib/validation/authSchemas";
import { setRoleCookie } from "@/lib/firebase/authService";
import { photographerService } from "@/services/PhotographerService";
import { auth } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/auth-store";

// ────────────────────────────────────────────────────────────
// UPLOAD HELPER
// ────────────────────────────────────────────────────────────

interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  version?: number;
}

async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<CloudinaryAsset> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

  console.log(`[Cloudinary] ── Starting direct upload ──`);
  console.log(`[Cloudinary] File name  : "${file.name}"`);
  console.log(`[Cloudinary] File type  : "${file.type}"`);
  console.log(`[Cloudinary] File size  : ${(file.size / 1024).toFixed(1)} KB`);
  console.log(`[Cloudinary] Target folder: "${folder}"`);
  console.log(`[Cloudinary] Cloud Name: "${cloudName}"`);
  console.log(`[Cloudinary] Upload Preset: "${uploadPreset}"`);

  if (!cloudName) {
    const msg = "Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.";
    console.error(`[Cloudinary] ❌ ${msg}`);
    throw new Error(msg);
  }

  if (!file || file.size === 0) {
    const msg = "No file selected or file is empty.";
    console.error(`[Cloudinary] ❌ ${msg}`);
    throw new Error(msg);
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  fd.append("folder", folder);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  console.log(`[Cloudinary] Sending FormData to Cloudinary API: POST ${url}`);

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: fd });
  } catch (networkErr: any) {
    console.error(`[Cloudinary] ❌ Network error reaching Cloudinary:`, networkErr?.message);
    throw new Error(`Network error: ${networkErr?.message ?? "Could not reach Cloudinary server."}`);
  }

  console.log(`[Cloudinary] HTTP response status: ${res.status} ${res.statusText}`);

  let body: any;
  let bodyText = "";
  try {
    bodyText = await res.text();
    body = JSON.parse(bodyText);
  } catch (parseErr: any) {
    console.error(`[Cloudinary] ❌ Failed to parse API response as JSON:`, parseErr?.message);
    console.error(`[Cloudinary] Raw response body was:`, bodyText);
    throw new Error(`Cloudinary returned an unreadable response (HTTP ${res.status}). Complete response: ${bodyText}`);
  }

  if (!res.ok) {
    console.error(`[Cloudinary] ❌ Upload failed. Complete Cloudinary Response:`, JSON.stringify(body, null, 2));
    const errorMsg: string = body?.error?.message ?? `Upload failed with HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  console.log(`[Cloudinary] ✅ Upload succeeded.`);
  console.log(`[Cloudinary]    public_id  : "${body.public_id}"`);
  console.log(`[Cloudinary]    secure_url : "${body.secure_url}"`);

  return {
    publicId: body.public_id,
    secureUrl: body.secure_url,
  };
}

// ────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ────────────────────────────────────────────────────────────

function inputCls(hasError: boolean, extra = "") {
  return `w-full px-3 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${extra} ${
    hasError ? "border-red-500/60 focus:ring-red-500/30" : "border-border"
  }`;
}

function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButtons({
  onBack,
  nextLabel = "Continue",
  onNextClick,
}: {
  onBack?: () => void;
  nextLabel?: string;
  onNextClick?: () => void;
}) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}
      <button
        type={onNextClick ? "button" : "submit"}
        onClick={onNextClick}
        className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        {nextLabel} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STEP INDICATOR
// ────────────────────────────────────────────────────────────

const STEPS = ["Studio", "Specialties", "Pricing", "Photos"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary/20 border-2 border-primary text-primary"
                    : "bg-secondary border border-border text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mb-4 transition-colors ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STEP 1 — Studio Information
// ────────────────────────────────────────────────────────────

function StudioStep({ onNext }: { onNext: (d: SignUpStep2Data) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpStep2Data>({ resolver: zodResolver(SignUpStep2Schema) });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4" noValidate>
      <Field label="Studio Name" error={errors.studioName?.message} htmlFor="ob-studio">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="ob-studio"
            type="text"
            placeholder="Raj Photography Studio"
            {...register("studioName")}
            className={inputCls(!!errors.studioName, "pl-10")}
          />
        </div>
      </Field>

      <Field
        label="Years of Experience"
        error={errors.experience?.message}
        htmlFor="ob-exp"
      >
        <input
          id="ob-exp"
          type="number"
          min={0}
          max={60}
          placeholder="5"
          {...register("experience", { valueAsNumber: true })}
          className={inputCls(!!errors.experience)}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="City" error={errors.city?.message} htmlFor="ob-city">
          <input
            id="ob-city"
            type="text"
            placeholder="Mumbai"
            {...register("city")}
            className={inputCls(!!errors.city)}
          />
        </Field>
        <Field label="State" error={errors.state?.message} htmlFor="ob-state">
          <input
            id="ob-state"
            type="text"
            placeholder="Maharashtra"
            {...register("state")}
            className={inputCls(!!errors.state)}
          />
        </Field>
        <Field label="Country" error={errors.country?.message} htmlFor="ob-country">
          <input
            id="ob-country"
            type="text"
            placeholder="India"
            {...register("country")}
            className={inputCls(!!errors.country)}
          />
        </Field>
      </div>

      <NavButtons nextLabel="Next: Specialties" />
    </form>
  );
}

// ────────────────────────────────────────────────────────────
// STEP 2 — Photography Specialties
// ────────────────────────────────────────────────────────────

function SpecialtiesStep({
  onNext,
  onBack,
}: {
  onNext: (d: SignUpStep3Data) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggle = (s: string) => {
    setError("");
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleNext = () => {
    if (selected.length === 0) {
      setError("Please select at least one specialty");
      return;
    }
    onNext({ specialties: selected });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select all that apply:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PHOTOGRAPHY_SPECIALTIES.map((spec) => {
          const sel = selected.includes(spec);
          return (
            <motion.button
              key={spec}
              type="button"
              onClick={() => toggle(spec)}
              whileTap={{ scale: 0.97 }}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left flex items-center justify-between gap-2 ${
                sel
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span>{spec}</span>
              {sel && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            </motion.button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-muted-foreground">{selected.length} selected</p>
      <NavButtons onBack={onBack} nextLabel="Next: Pricing" onNextClick={handleNext} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STEP 3 — Pricing & Languages
// ────────────────────────────────────────────────────────────

function PricingStep({
  onNext,
  onBack,
}: {
  onNext: (d: SignUpStep4Data) => void;
  onBack: () => void;
}) {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["English"]);
  const [langError, setLangError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpStep4Data>({
    resolver: zodResolver(SignUpStep4Schema),
    defaultValues: { currency: "INR", languages: ["English"] },
  });

  const toggleLang = (lang: string) => {
    setLangError("");
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    );
  };

  const submit = handleSubmit((data) => {
    if (selectedLangs.length === 0) {
      setLangError("Please select at least one language");
      return;
    }
    onNext({ ...data, languages: selectedLangs });
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Starting Price"
          error={errors.startingPrice?.message}
          htmlFor="ob-price"
        >
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="ob-price"
              type="number"
              min={1}
              placeholder="5000"
              {...register("startingPrice", { valueAsNumber: true })}
              className={inputCls(!!errors.startingPrice, "pl-10")}
            />
          </div>
        </Field>
        <Field label="Currency" error={errors.currency?.message} htmlFor="ob-currency">
          <select
            id="ob-currency"
            {...register("currency")}
            className={inputCls(!!errors.currency, "bg-secondary")}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Languages Spoken</label>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => {
            const sel = selectedLangs.includes(lang);
            return (
              <motion.button
                key={lang}
                type="button"
                onClick={() => toggleLang(lang)}
                whileTap={{ scale: 0.97 }}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sel
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {lang}
              </motion.button>
            );
          })}
        </div>
        {langError && <p className="text-xs text-red-400">{langError}</p>}
        <p className="text-xs text-muted-foreground">{selectedLangs.length} selected</p>
      </div>

      <NavButtons onBack={onBack} nextLabel="Next: Upload Photos" />
    </form>
  );
}

// ────────────────────────────────────────────────────────────
// STEP 4 — Profile & Cover Photos
// ────────────────────────────────────────────────────────────

function PhotosStep({
  onSubmit,
  onBack,
  isSubmitting,
}: {
  onSubmit: (profileFile?: File, coverFile?: File) => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const profileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    file: File,
    setFile: typeof setProfileFile,
    setPreview: typeof setProfilePreview,
    maxMb: number
  ) => {
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image must be less than ${maxMb}MB`);
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-5">
      {/* Profile Photo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Profile Photo{" "}
          <span className="text-muted-foreground font-normal">(recommended)</span>
        </label>
        <div
          onClick={() => profileRef.current?.click()}
          className="relative w-24 h-24 rounded-full border-2 border-dashed border-border hover:border-primary/60 cursor-pointer transition-colors overflow-hidden flex items-center justify-center bg-secondary"
        >
          {profilePreview ? (
            <>
              <img
                src={profilePreview}
                alt="Profile preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileFile(null);
                  setProfilePreview("");
                }}
                className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <input
          ref={profileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleFile(e.target.files[0], setProfileFile, setProfilePreview, 5)
          }
        />
        <p className="text-xs text-muted-foreground">
          Click to upload. JPEG, PNG or WebP. Max 5 MB.
        </p>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Portfolio Cover Image{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div
          onClick={() => coverRef.current?.click()}
          className="relative w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/60 cursor-pointer transition-colors overflow-hidden flex flex-col items-center justify-center gap-2 bg-secondary"
        >
          {coverPreview ? (
            <>
              <img
                src={coverPreview}
                alt="Cover preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCoverFile(null);
                  setCoverPreview("");
                }}
                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Click to upload cover image</p>
            </>
          )}
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleFile(e.target.files[0], setCoverFile, setCoverPreview, 10)
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        You can add more portfolio images from your dashboard after setup.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={() => onSubmit(profileFile ?? undefined, coverFile ?? undefined)}
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving Profile…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Complete Setup
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN WIZARD
// ────────────────────────────────────────────────────────────

interface WizardData {
  studio?: SignUpStep2Data;
  specialties?: SignUpStep3Data;
  pricing?: SignUpStep4Data;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<WizardData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Pending submit args for retry
  const pendingSubmitRef = useRef<{
    profileFile?: File;
    coverFile?: File;
    profileAsset?: CloudinaryAsset;
    coverAsset?: CloudinaryAsset;
  }>({});

  // ── Auth guard ──────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log("[Authentication] No session on /onboarding → /login");
        router.replace("/login");
        return;
      }

      if (!firebaseUser.emailVerified) {
        console.log("[Authentication] Email not verified on /onboarding → /verify-email");
        router.replace("/verify-email");
        return;
      }

      try {
        console.log(
          `[Firestore] Checking onboarding status for UID: ${firebaseUser.uid}`
        );
        const photographer = await photographerService.getById(firebaseUser.uid);
        if (photographer?.onboardingCompleted) {
          console.log("[Redirect] Onboarding already complete → /dashboard");
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("[Firestore] Error checking onboarding status:", err);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ── Step navigation ────────────────────────────────────
  const goForward = <T extends keyof WizardData>(
    key: T,
    data: WizardData[T]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: data }));
    setDirection(1);
    setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrorBanner(null);
  };

  // ── Final submit with retry support ────────────────────
  const handleFinalSubmit = useCallback(
    async (profileFile?: File, coverFile?: File) => {
      if (!formData.studio || !formData.specialties || !formData.pricing) {
        toast.error("Missing form data. Please go back and complete all steps.");
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.error("[Authentication] No authenticated user during onboarding submit.");
        toast.error("Your session expired. Please sign in again.");
        router.push("/login");
        return;
      }

      setIsSubmitting(true);
      setErrorBanner(null);

      // Persist files for retry
      pendingSubmitRef.current.profileFile = profileFile || pendingSubmitRef.current.profileFile;
      pendingSubmitRef.current.coverFile = coverFile || pendingSubmitRef.current.coverFile;

      // Check if profile photo is present
      const hasProfilePhoto = pendingSubmitRef.current.profileFile || pendingSubmitRef.current.profileAsset;
      if (!hasProfilePhoto) {
        toast.error("Profile photo is required.");
        setIsSubmitting(false);
        return;
      }

      let profileAsset = pendingSubmitRef.current.profileAsset;
      let coverAsset = pendingSubmitRef.current.coverAsset;

      // 1. Cloudinary: profile photo
      if (pendingSubmitRef.current.profileFile && !profileAsset) {
        try {
          console.log(
            `[Cloudinary] Uploading profile photo for UID: ${firebaseUser.uid}`
          );
          toast.info("Uploading profile photo…");
          profileAsset = await uploadToCloudinary(
            pendingSubmitRef.current.profileFile,
            `snapevent/photographers/${firebaseUser.uid}/profile`
          );
          pendingSubmitRef.current.profileAsset = profileAsset;
          console.log(
            `[Cloudinary] Profile photo uploaded: ${profileAsset.secureUrl}`
          );
        } catch (err: any) {
          console.error("[Cloudinary] Profile photo upload failed:", err);
          setErrorBanner(
            "Profile photo upload failed. Fix the issue or remove the photo, then retry."
          );
          setIsSubmitting(false);
          toast.error("Profile photo upload failed. Please retry.");
          return; // Stay on Photos step
        }
      }

      // 2. Cloudinary: cover image
      if (pendingSubmitRef.current.coverFile && !coverAsset) {
        try {
          console.log(
            `[Cloudinary] Uploading cover image for UID: ${firebaseUser.uid}`
          );
          toast.info("Uploading cover image…");
          coverAsset = await uploadToCloudinary(
            pendingSubmitRef.current.coverFile,
            `snapevent/photographers/${firebaseUser.uid}/cover`
          );
          pendingSubmitRef.current.coverAsset = coverAsset;
          console.log(
            `[Cloudinary] Cover image uploaded: ${coverAsset.secureUrl}`
          );
        } catch (err: any) {
          console.error("[Cloudinary] Cover image upload failed:", err);
          setErrorBanner(
            "Cover image upload failed. Fix the issue or remove the photo, then retry."
          );
          setIsSubmitting(false);
          toast.error("Cover image upload failed. Please retry.");
          return; // Stay on Photos step
        }
      }

      // 3. Build photographer document
      const photographerData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        displayName: firebaseUser.displayName ?? "",
        role: "photographer" as const,
        name: firebaseUser.displayName ?? formData.studio.studioName,
        studioName: formData.studio.studioName,
        bio: `Photographer based in ${formData.studio.city}, ${formData.studio.state}`,
        phone: "",
        address: {
          city: formData.studio.city,
          state: formData.studio.state,
          country: formData.studio.country,
        },
        profileImage: profileAsset ? {
          publicId: profileAsset.publicId,
          secureUrl: profileAsset.secureUrl,
        } : null,
        coverImage: coverAsset ? {
          publicId: coverAsset.publicId,
          secureUrl: coverAsset.secureUrl,
        } : null,
        portfolioImages: [],
        specialties: formData.specialties.specialties,
        experience: formData.studio.experience,
        languages: formData.pricing.languages,
        pricingPackages: [],
        startingPrice: formData.pricing.startingPrice,
        currency: formData.pricing.currency,
        isActive: true,
        isFeatured: false,
        isSuspended: false,
        timezone: "Asia/Kolkata",
        blocked: false,
        isVerified: false,
        status: "active",
        profileCompleted: true,
        onboardingCompleted: true,
        profilePhoto: profileAsset?.secureUrl ?? "",
        coverPhoto: coverAsset?.secureUrl ?? "",
        rating: 0,
        ratingCount: 0,
      };

      // 4. Save to Firestore
      try {
        console.log(
          `[Firestore] Creating photographer document for UID: ${firebaseUser.uid}`
        );
        await photographerService.createFromSignup(
          firebaseUser.uid,
          photographerData
        );
        console.log("[Firestore] Photographer document created successfully.");
      } catch (err: any) {
        console.error("[Firestore] Failed to create photographer document:", err);
        setErrorBanner(
          "Failed to save your profile. Please retry — your uploaded photos are preserved."
        );
        setIsSubmitting(false);
        toast.error("Profile save failed. Please retry.");
        return;
      }

      // 5. Set auth state & cookie
      setRoleCookie("photographer");
      useAuthStore.getState().setAuth({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName:
          firebaseUser.displayName || photographerData.name,
        photoURL:
          firebaseUser.photoURL || photographerData.profilePhoto || null,
        role: "photographer",
        emailVerified: firebaseUser.emailVerified,
      });

      // Clear the retry state
      pendingSubmitRef.current = {};

      toast.success("Profile created! Welcome to SnapEvent. 🎉");
      console.log("[Redirect] Redirecting to /dashboard");
      router.push("/dashboard");
      setIsSubmitting(false);
    },
    [formData, router]
  );

  const handleRetry = () => {
    const { profileFile, coverFile } = pendingSubmitRef.current;
    handleFinalSubmit(profileFile, coverFile);
  };

  // ── Slide variants ─────────────────────────────────────
  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? 40 : -40, opacity: 0 }),
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set up your profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete your photographer profile to start accepting bookings
        </p>
      </div>

      <StepIndicator current={currentStep} />

      {/* Error banner with retry */}
      <AnimatePresence>
        {errorBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-400">{errorBanner}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors shrink-0 font-medium"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSubmitting ? "animate-spin" : ""}`}
              />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {currentStep === 1 && (
            <StudioStep
              onNext={(d) => goForward("studio", d)}
            />
          )}
          {currentStep === 2 && (
            <SpecialtiesStep
              onNext={(d) => goForward("specialties", d)}
              onBack={goBack}
            />
          )}
          {currentStep === 3 && (
            <PricingStep
              onNext={(d) => goForward("pricing", d)}
              onBack={goBack}
            />
          )}
          {currentStep === 4 && (
            <PhotosStep
              onSubmit={handleFinalSubmit}
              onBack={goBack}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default OnboardingWizard;
