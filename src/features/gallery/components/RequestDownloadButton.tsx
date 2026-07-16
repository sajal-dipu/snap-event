import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, X, Mail, User, Info, Loader, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateDownloadRequestMutation } from "../hooks/useAiMatching";

interface RequestDownloadButtonProps {
  roomId: string;
  photographerId: string;
  photoIds: string[];
  onSuccess?: () => void;
}

const downloadRequestFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid mobile number (e.g. +919876543210 or 9876543210)"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  message: z.string().max(500, "Message cannot exceed 500 characters").optional(),
});

type DownloadRequestFormData = z.infer<typeof downloadRequestFormSchema>;

const getOrCreateGuestId = (): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("snapevent_guest_uid");
  if (!id) {
    id = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem("snapevent_guest_uid", id);
  }
  return id;
};

export function RequestDownloadButton({
  roomId,
  photographerId,
  photoIds,
  onSuccess,
}: RequestDownloadButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState<string>("");
  const downloadMutation = useCreateDownloadRequestMutation();

  React.useEffect(() => {
    setCustomerId(getOrCreateGuestId());
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DownloadRequestFormData>({
    resolver: zodResolver(downloadRequestFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  const onSubmit = async (data: DownloadRequestFormData) => {
    try {
      const activeCustomerId = customerId || getOrCreateGuestId();

      await downloadMutation.mutateAsync({
        roomId,
        photographerId,
        customerId: activeCustomerId,
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || undefined,
        specialMessage: data.message || undefined,
        requestedPhotoIds: photoIds,
      });

      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error("Download request submission failed:", err);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={photoIds.length === 0}
        className="bg-primary text-primary-foreground font-black shadow-md shadow-primary/10 rounded-xl h-10 w-full sm:w-auto px-6 gap-2"
      >
        <Download className="h-4.5 w-4.5" />
        Request {photoIds.length} Photo{photoIds.length > 1 ? "s" : ""}
      </Button>

      {/* Backdrop Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5 animate-in zoom-in duration-200 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <X className="h-4.5 w-4.5" />
            </Button>

            {/* Header */}
            <div>
              <h3 className="text-base font-black tracking-tight text-foreground uppercase flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Submit Download Request
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                You are requesting high-resolution download links for {photoIds.length} matched photo{photoIds.length > 1 ? "s" : ""}.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("name")}
                  type="text"
                  placeholder="Rahul Sharma"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  className="rounded-xl"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("phone")}
                  type="tel"
                  placeholder="+919876543210 or 9876543210"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  className="rounded-xl"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address <span className="text-zinc-400 text-[10px] font-normal italic">(Optional)</span>
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="rahul@example.com"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  className="rounded-xl"
                />
              </div>

              {/* Special Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Special Message <span className="text-zinc-400 text-[10px] font-normal italic">(Optional)</span>
                </label>
                <textarea
                  {...register("message")}
                  placeholder="E.g., Please approve this quickly, loved the wedding shots!"
                  className="flex min-h-[80px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border-zinc-200 dark:border-zinc-800 focus:border-primary text-foreground"
                />
                {errors.message && (
                  <p className="text-[10px] text-red-500 font-bold">{errors.message.message}</p>
                )}
              </div>

              {/* Informational Warning */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl text-[10px] font-semibold text-muted-foreground border border-border flex items-start gap-2 leading-relaxed">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  The photographer will review and approve your request. A secure temporary download link will be shared with you to access your photos.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="h-10 px-4 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={downloadMutation.isPending}
                  className="h-10 px-5 text-xs font-black bg-primary text-primary-foreground shadow-md shadow-primary/10 rounded-xl gap-1.5"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default RequestDownloadButton;
