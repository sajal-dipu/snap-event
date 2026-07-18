"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Lock,
  Settings,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import { bookingService } from "@/services/BookingService";
import { generateStrongPassword, generateSecurityCode } from "@/utils/crypto";
import { APP_URL } from "@/utils/helpers";


import { CreateRoomFormSchema, type ValidatedCreateRoomForm } from "../schemas";
import { db } from "@/lib/firebase/firestore";
import { collection, doc } from "firebase/firestore";

export function CreateRoomWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = React.useState(1);

  // Security State
  const [generatedRoomId, setGeneratedRoomId] = React.useState("");
  const [generatedPassword, setGeneratedPassword] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [securityCode, setSecurityCode] = React.useState("");
  const [hasSavedSecurityCode, setHasSavedSecurityCode] = React.useState(false);
  const [copiedSecurityCode, setCopiedSecurityCode] = React.useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = React.useState(false);


  // Initialize Form
  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<ValidatedCreateRoomForm>({
    resolver: zodResolver(CreateRoomFormSchema) as any,
    defaultValues: {
      name: "",
      eventType: "wedding",
      eventDate: "",
      eventTime: "",
      eventLocation: {
        street: "",
        city: "",
        state: "",
        country: "India",
        postalCode: "",
      },
      description: "",
      allowGuestAccess: true,
      requireFaceVerification: false,
      allowDownloadRequests: true,
      autoCloseRoom: false,
      autoCloseDate: "",
      visibility: "public",
      bookingId: "",
    },
  });

  const watchAutoCloseRoom = useWatch({ control, name: "autoCloseRoom" });

  // Step names
  // Fetch completed bookings for this photographer
  const { data: completedBookings = [] } = useQuery({
    queryKey: ["completedBookings", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const res = await bookingService.list({ photographerId: user.uid, status: "completed" }, 100);
      return res.data;
    },
    enabled: !!user?.uid
  });

  const steps = [
    { number: 1, name: "Event Information", icon: FileText },
    { number: 2, name: "Room Settings", icon: Settings },
    { number: 3, name: "Security & Review", icon: Lock },
  ];


  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Validation errors state updated:", errors);
    }
  }, [errors]);

  /**
   * Pre-generate Room ID and secure password when transitioning to Step 3
   */
  const handleNextStep = async () => {
    console.log("Continue clicked");
    console.log("Current Step:", step);

    if (step === 1) {
      const isValid = await trigger([
        "name",
        "eventType",
        "eventDate",
        "eventTime",
        "eventLocation.city",
        "eventLocation.state",
        "eventLocation.country",
        "description",
      ]);
      console.log("Validation:", isValid);
      if (isValid) {
        console.log("Next Step");
        setStep(2);
      } else {
        console.log("Validation failed on step 1. Errors:", errors);
      }
    } else if (step === 2) {
      const isValid = await trigger([
        "allowGuestAccess",
        "requireFaceVerification",
        "allowDownloadRequests",
        "autoCloseRoom",
        "autoCloseDate",
        "visibility",
      ]);
      console.log("Validation:", isValid);
      if (isValid) {
        console.log("Next Step");
        // Pre-generate credentials for review in Step 3
        if (!generatedRoomId) {
          let rid = "";
          try {
            const photographerId = user?.uid || "photographer";
            const roomsCollectionRef = collection(db, "photographers", photographerId, "rooms");
            rid = doc(roomsCollectionRef).id;
          } catch (e) {
            rid = `room_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          }
          setGeneratedRoomId(rid);
        }
        if (!generatedPassword) {
          setGeneratedPassword(generateStrongPassword());
        }
        if (!securityCode) {
          setSecurityCode(generateSecurityCode());
        }
        setStep(3);
      } else {
        console.log("Validation failed on step 2. Errors:", errors);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const copyPasswordToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedPassword);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = generatedPassword;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopied(true);
      toast.success("Password copied!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error("Copy failed");
    }
  };
  const handleFormSubmit = async (data: ValidatedCreateRoomForm) => {
    if (isSubmitting) return;
    console.log("[CreateRoom debug] Starting room creation submit pipeline...");
    if (!user) {
      console.error("[CreateRoom debug] User context is null or undefined.");
      toast.error("You must be authenticated to create a room.");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetPath = `photographers/${user.uid}/rooms/${generatedRoomId}`;
      console.log(`[CreateRoom debug] Target Firestore Document Path: "${targetPath}"`);

      // Call modified createRoom supporting client hashed entries
      await roomService.createRoom(
        {
          ...data,
          id: generatedRoomId,
          photographerId: user.uid,
          photographerName: user.displayName || user.email || "Photographer",
          securityCode, // Save security code
        },
        generatedPassword
      );

      console.log("[CreateRoom debug] Firestore write succeeded!");
      
      // Link the booking and room if linked
      if (data.bookingId) {
        console.log(`[CreateRoom debug] Linking bookingId "${data.bookingId}" to roomId "${generatedRoomId}"`);
        try {
          await bookingService.linkRoom(data.bookingId, generatedRoomId);
          toast.success("Successfully linked booking with sharing room!");
        } catch (linkErr) {
          console.error("[CreateRoom debug] Failed linking booking:", linkErr);
        }
      }

      toast.success("Virtual Event Room created successfully!");
      // Session storage bypass flag so developer can enter this room immediately
      sessionStorage.setItem(`room-gate-unlocked-${generatedRoomId}`, "true");
      setIsSuccessOpen(true); // Open success dialog
    } catch (error: any) {
      console.error("[CreateRoom debug] Caught exception during room creation:", error);
      const errorMsg = error?.message || error?.toString() || "Unknown error during room creation";
      toast.error(`Failed to create room: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        {steps.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = step === s.number;
          const isCompleted = step > s.number;
          return (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-all ${isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isCompleted
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-secondary text-muted-foreground border-border"
                    }`}
                >
                  <StepIcon className="h-4.5 w-4.5" />
                </span>
                <span
                  className={`text-xs font-bold hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block opacity-40" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Form Stepper */}
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Card className="border border-border bg-card/75 shadow-md">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Step 1: Event Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-3 mb-2">
                  <h2 className="text-lg font-bold text-foreground">Event Information</h2>
                  <p className="text-xs text-muted-foreground">Detail the name, specialty, and location of the shoot.</p>
                </div>

                {completedBookings.length > 0 && (
                  <div className="space-y-1.5 p-4 bg-secondary/20 rounded-2xl border border-border/40 mb-4 animate-in fade-in duration-300">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Link to Completed Booking (Optional)
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setValue("bookingId", "");
                          return;
                        }
                        const booking = completedBookings.find((b: any) => b.id === selectedId);
                        if (booking) {
                          let dateStr = "";
                          if (booking.eventDate) {
                            const dateObj = booking.eventDate instanceof Date 
                              ? booking.eventDate 
                              : new Date(booking.eventDate.seconds * 1000);
                            dateStr = dateObj.toISOString().split("T")[0];
                          }
                          
                          setValue("name", booking.packageName ? `${booking.customerName}'s ${booking.eventType} (${booking.packageName})` : `${booking.customerName}'s ${booking.eventType}`);
                          setValue("eventType", booking.eventType.toLowerCase());
                          setValue("eventDate", dateStr);
                          setValue("eventTime", booking.eventTime || "10:00");
                          setValue("eventLocation.street", booking.eventLocation?.street || "");
                          setValue("eventLocation.city", booking.eventLocation?.city || "");
                          setValue("eventLocation.state", booking.eventLocation?.state || "");
                          setValue("eventLocation.postalCode", booking.eventLocation?.postalCode || "");
                          setValue("bookingId", booking.id);
                          setValue("description", `Photos room for ${booking.customerName}'s completed ${booking.eventType} shoot.`);
                        }
                      }}
                    >
                      <option value="">-- Choose Completed Booking to Auto-Fill --</option>
                      {completedBookings.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.customerName} - {b.eventType} ({b.eventDate ? (b.eventDate instanceof Date ? b.eventDate.toLocaleDateString() : new Date(b.eventDate.seconds * 1000).toLocaleDateString()) : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Name</label>
                  <Input
                    type="text"
                    placeholder="Sharma & Patel Wedding Gala"
                    {...register("name")}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Type</label>
                    <Controller
                      name="eventType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { label: "Wedding", value: "wedding" },
                            { label: "Birthday", value: "birthday" },
                            { label: "Corporate", value: "corporate" },
                            { label: "Portrait", value: "portrait" },
                            { label: "Other", value: "other" },
                          ]}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Date</label>
                    <Input
                      type="date"
                      {...register("eventDate")}
                      error={!!errors.eventDate}
                      helperText={errors.eventDate?.message}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Time</label>
                    <Input
                      type="time"
                      {...register("eventTime")}
                      error={!!errors.eventTime}
                      helperText={errors.eventTime?.message}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-t border-border pt-4">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    Event Location
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Street Address (Optional)</label>
                    <Input
                      type="text"
                      placeholder="MG Road, Hotel Taj Residency"
                      {...register("eventLocation.street")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City</label>
                      <Input
                        type="text"
                        placeholder="Mumbai"
                        {...register("eventLocation.city")}
                        error={!!errors.eventLocation?.city}
                        helperText={errors.eventLocation?.city?.message}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">State</label>
                      <Input
                        type="text"
                        placeholder="Maharashtra"
                        {...register("eventLocation.state")}
                        error={!!errors.eventLocation?.state}
                        helperText={errors.eventLocation?.state?.message}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country</label>
                      <Input
                        type="text"
                        placeholder="India"
                        {...register("eventLocation.country")}
                        error={!!errors.eventLocation?.country}
                        helperText={errors.eventLocation?.country?.message}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                  <Textarea
                    placeholder="Provide guest instructions or shoot timelines..."
                    {...register("description")}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cover Image URL (Optional)</label>
                  <Input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    {...register("coverImage")}
                    error={!!errors.coverImage}
                    helperText={errors.coverImage?.message}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Room Settings */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3 mb-2">
                  <h2 className="text-lg font-bold text-foreground">Room Settings</h2>
                  <p className="text-xs text-muted-foreground">Configure visitor access limits and AI sharing features.</p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Allow Guest Access</p>
                    <p className="text-xs text-muted-foreground">Allows scanning guests to view public areas of the gallery.</p>
                  </div>
                  <Controller
                    name="allowGuestAccess"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Require Face Verification</p>
                    <p className="text-xs text-muted-foreground">Guests must submit a selfie. AI filters and shows only their photos.</p>
                  </div>
                  <Controller
                    name="requireFaceVerification"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Allow Download Requests</p>
                    <p className="text-xs text-muted-foreground">Guests can request high-resolution watermark-free photo files.</p>
                  </div>
                  <Controller
                    name="allowDownloadRequests"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="space-y-4 p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">Auto Close Room (Optional)</p>
                      <p className="text-xs text-muted-foreground">Automatically closes guest access on a specific date.</p>
                    </div>
                    <Controller
                      name="autoCloseRoom"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>

                  {watchAutoCloseRoom && (
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Close Date</label>
                      <Input
                        type="date"
                        {...register("autoCloseDate")}
                        error={!!errors.autoCloseDate}
                        helperText={errors.autoCloseDate?.message}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Room Visibility</label>
                  <Controller
                    name="visibility"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { label: "Public (Listed on public portfolio)", value: "public" },
                          { label: "Private (Hidden, search-protected)", value: "private" },
                        ]}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Security & Review */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3 mb-2">
                  <h2 className="text-lg font-bold text-foreground">Security Credentials</h2>
                  <p className="text-xs text-muted-foreground">Review automatically generated event room credentials.</p>
                </div>

                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 dark:border-blue-900/20 dark:bg-blue-950/10 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <p className="font-bold text-foreground">Security Automation Active</p>
                    <p className="mt-0.5">
                      To keep event sharing safe, SnapEvent automatically generates unique Room IDs and cryptographically strong passwords. Cleartext passwords are hashed and never stored in the database.
                    </p>
                  </div>
                </div>

                {/* Password Display Box */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-center space-y-3 relative overflow-hidden">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Generated Room Password</label>

                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl font-bold font-mono tracking-widest text-primary bg-background border border-border px-6 py-2.5 rounded-lg select-all shadow-inner">
                      {generatedPassword}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyPasswordToClipboard}
                      className="h-11 w-11 shrink-0 border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-850"
                    >
                      {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-zinc-400" />}
                    </Button>
                  </div>

                  <div className="p-3 bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-lg flex items-start gap-2.5 text-left border border-red-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-bounce" />
                    <div className="text-[10px] leading-normal font-semibold">
                      <p className="font-bold text-[11px] uppercase tracking-wide">Security Warning</p>
                      <p className="mt-0.5 opacity-90">
                        This password is shown only **ONE TIME** and will be hashed immediately when saved. Save it securely (e.g. in a password manager) to access this room dashboard in the future.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Code Display Box */}
                <div className="p-5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 text-center space-y-3 relative overflow-hidden">
                  <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    Generated Room Recovery Security Code
                  </label>

                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl font-bold font-mono tracking-widest text-purple-700 dark:text-purple-300 bg-background border border-purple-200 dark:border-purple-900/50 px-6 py-2.5 rounded-lg select-all shadow-inner">
                      {securityCode}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(securityCode);
                          setCopiedSecurityCode(true);
                          toast.success("Security Code copied!");
                          setTimeout(() => setCopiedSecurityCode(false), 2000);
                        } catch (err) {
                          toast.error("Copy failed");
                        }
                      }}
                      className="h-11 w-11 shrink-0 border-purple-200 dark:border-purple-900/50 hover:bg-purple-100/50 dark:hover:bg-purple-950/30"
                    >
                      {copiedSecurityCode ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-purple-400" />}
                    </Button>
                  </div>

                  <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 rounded-lg flex items-start gap-2.5 text-left border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="text-[10px] leading-normal font-semibold">
                      <p className="font-bold text-[11px] uppercase tracking-wide">Recovery Warning</p>
                      <p className="mt-0.5 opacity-90 text-[10px]">
                        Save this security code carefully. This code is required to recover and re-access your virtual room in the future.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acknowledge Checkbox */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/40">
                  <input
                    type="checkbox"
                    id="save-code-checkbox"
                    checked={hasSavedSecurityCode}
                    onChange={(e) => setHasSavedSecurityCode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5 cursor-pointer accent-primary"
                  />
                  <label htmlFor="save-code-checkbox" className="text-xs text-foreground font-semibold leading-normal cursor-pointer select-none">
                    I have saved this security code.
                  </label>
                </div>

                {/* Metadata Review */}
                <div className="space-y-2 border-t border-border pt-4 text-xs">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider">Room Metadata Summary</p>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-lg border border-border">
                    <div>
                      <span className="text-muted-foreground">Unique Room ID:</span>
                      <span className="font-semibold ml-1 font-mono text-[10px]">{generatedRoomId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">QR Target URL:</span>
                      <span className="font-semibold ml-1 truncate block font-mono text-[10px]">
                        {APP_URL}/event/{generatedRoomId.substring(0, 6)}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-2 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
            >
              Continue
              <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 px-6 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !hasSavedSecurityCode}
            >
              {isSubmitting ? "Creating event room..." : "Create Virtual Room"}
            </Button>
          )}
        </div>
      </form>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => {}} // Disallow close by clicking backdrop
        title="Virtual Room Created Successfully"
        description="Your secure event sharing gallery is now online."
        className="max-w-md select-none border-purple-500/25 border-2 shadow-2xl shadow-purple-500/10"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed text-center sm:text-left">
            Your Virtual Room has been successfully created. Please review and ensure you have saved your credentials.
          </p>

          <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/5 text-center space-y-2.5">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Security Code</span>
              <span className="text-base font-extrabold font-mono tracking-widest text-purple-700 dark:text-purple-300 block mt-1">
                {securityCode}
              </span>
            </div>
            <div className="border-t border-purple-100 dark:border-purple-900/50 pt-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Access Password</span>
              <span className="text-base font-extrabold font-mono tracking-widest text-primary block mt-1">
                {generatedPassword}
              </span>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 rounded-lg text-left border border-yellow-500/20 text-[10px] font-medium leading-relaxed">
            Keep your security code safe for future access. This code is required to recover and re-access your virtual room in the future.
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 py-2.5"
              onClick={() => {
                setIsSuccessOpen(false);
                router.push("/dashboard/rooms");
              }}
            >
              Go to Rooms List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default CreateRoomWizard;
