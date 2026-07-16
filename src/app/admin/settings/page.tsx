"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { settingsService } from "@/services/SettingsService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Settings,
  Save,
  AlertTriangle,
  Globe,
  Mail,
  Image as ImageIcon,
  Loader2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  Sun,
} from "lucide-react";
import type { PlatformSettings, FeatureFlags } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const FEATURE_FLAGS_CONFIG = [
  { key: "enableFaceRecognition" as const, label: "Face Recognition Search", description: "Enable AI face indexing and recognition search filters for public gallery views." },
  { key: "enableQRCodeAccess" as const, label: "QR Code Room Access", description: "Allow guest room entries and photo retrievals via scanning QR code assets." },
  { key: "enableGuestUpload" as const, label: "Guest Room Uploads", description: "Allow non-registered guest users to upload media directly into virtual rooms." },
  { key: "enablePhotographerVerification" as const, label: "Photographer Vetting", description: "Require platform admin verification before photographers go live." },
  { key: "enableEmailNotifications" as const, label: "Email Notifications System", description: "Enable transaction, registration and confirmation emails." },
  { key: "enablePushNotifications" as const, label: "Push Notification Delivery", description: "Send real-time web push notifications to logged in sessions." },
  { key: "enableReviews" as const, label: "Review & Ratings Ledger", description: "Allow customers to submit star feedback on photographer rooms." },
  { key: "enableWatermarking" as const, label: "Watermark Overlay Previews", description: "Enforce dynamic watermarking overlays on photos prior to approved purchase/download." },
  { key: "enableAnalytics" as const, label: "Platform Analytics Reporting", description: "Track active visitor, session and booking revenue metrics." },
];

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
  const [featureFlags, setFeatureFlags] = React.useState<FeatureFlags | null>(null);

  // Form state
  const [appName, setAppName] = React.useState("SnapEvent");
  const [tagline, setTagline] = React.useState("");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState("");
  const [maxPhotosPerRoom, setMaxPhotosPerRoom] = React.useState(500);
  const [maxPortfolioImages, setMaxPortfolioImages] = React.useState(20);
  const [downloadLinkExpiryHours, setDownloadLinkExpiryHours] = React.useState(72);
  const [platformCommissionPercent, setPlatformCommissionPercent] = React.useState(10);
  const [maxRoomsPerPhotographer, setMaxRoomsPerPhotographer] = React.useState(50);
  const [cloudinaryFolder, setCloudinaryFolder] = React.useState("snapevent");

  React.useEffect(() => {
    async function load() {
      try {
        const [settings, flags] = await Promise.all([
          settingsService.getPlatformSettings(),
          settingsService.getFeatureFlags(),
        ]);
        if (settings) {
          setPlatformSettings(settings);
          setAppName(settings.appName || "SnapEvent");
          setTagline(settings.tagline || "");
          setSupportEmail(settings.supportEmail || "");
          setMaintenanceMode(settings.maintenanceMode || false);
          setMaintenanceMessage(settings.maintenanceMessage || "");
          setMaxPhotosPerRoom(settings.maxPhotosPerRoom || 500);
          setMaxPortfolioImages(settings.maxPortfolioImages || 20);
          setDownloadLinkExpiryHours(settings.downloadLinkExpiryHours || 72);
          setPlatformCommissionPercent(settings.platformCommissionPercent || 10);
          setMaxRoomsPerPhotographer(settings.maxRoomsPerPhotographer || 50);
          setCloudinaryFolder(settings.cloudinaryFolder || "snapevent");
        }
        if (flags) setFeatureFlags(flags);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load platform settings");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSavePlatformSettings = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await settingsService.updatePlatformSettings(
        {
          appName,
          tagline,
          supportEmail,
          maintenanceMode,
          maintenanceMessage: maintenanceMessage.trim() || undefined,
          maxPhotosPerRoom,
          maxPortfolioImages,
          downloadLinkExpiryHours,
          platformCommissionPercent,
          maxRoomsPerPhotographer,
          cloudinaryFolder,
        },
        user.uid
      );
      toast.success("General platform configuration secured.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update system parameters");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFeature = async (key: keyof FeatureFlags) => {
    if (!featureFlags || !user?.uid) return;
    const currentVal = featureFlags[key] ?? false;
    const nextFlags = { ...featureFlags, [key]: !currentVal };
    setFeatureFlags(nextFlags);
    try {
      await settingsService.updateFeatureFlags(nextFlags, user.uid);
      toast.success(`Feature flags updated.`);
    } catch (err) {
      console.error(err);
      setFeatureFlags(featureFlags); // Rollback
      toast.error("Failed to update feature toggles");
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Retrieving platform settings...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            System Control Panel
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">
            Adjust general settings, configure limits, toggle feature flags, or trigger global maintenance mode.
          </p>
        </div>

        {maintenanceMode && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex gap-3 text-xs leading-relaxed font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-extrabold text-foreground">Maintenance Mode Active</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Public pages display the active downtime message. Admins maintain full system operations.
              </p>
            </div>
          </div>
        )}

        {/* General Settings */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* App Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Platform Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="AI-powered event photography..."
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Support Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                <Mail className="h-3 w-3" /> Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@snapevent.com"
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Platform Commission */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Platform Commission (%)
              </label>
              <input
                type="number"
                value={platformCommissionPercent}
                onChange={(e) => setPlatformCommissionPercent(Number(e.target.value))}
                min={0}
                max={50}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Platform Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Max Photos Per Room
              </label>
              <input
                type="number"
                value={maxPhotosPerRoom}
                onChange={(e) => setMaxPhotosPerRoom(Number(e.target.value))}
                min={1}
                max={5000}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Max Portfolio Images
              </label>
              <input
                type="number"
                value={maxPortfolioImages}
                onChange={(e) => setMaxPortfolioImages(Number(e.target.value))}
                min={1}
                max={200}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Download Link Expiry (Hours)
              </label>
              <input
                type="number"
                value={downloadLinkExpiryHours}
                onChange={(e) => setDownloadLinkExpiryHours(Number(e.target.value))}
                min={1}
                max={720}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Max Rooms Per Photographer
              </label>
              <input
                type="number"
                value={maxRoomsPerPhotographer}
                onChange={(e) => setMaxRoomsPerPhotographer(Number(e.target.value))}
                min={1}
                max={1000}
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                Cloudinary Asset Folder name
              </label>
              <input
                type="text"
                value={cloudinaryFolder}
                onChange={(e) => setCloudinaryFolder(e.target.value)}
                placeholder="snapevent"
                className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className={`border-border shadow-sm ${maintenanceMode ? "bg-amber-500/5 border-amber-500/20" : "bg-card"}`}>
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${maintenanceMode ? "text-amber-500" : "text-muted-foreground"}`} />
              Maintenance Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Enable Maintenance Mode</p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  When enabled, the platform shows a maintenance message to all public users.
                </p>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`transition-colors ${maintenanceMode ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
              >
                {maintenanceMode
                  ? <ToggleRight className="h-8 w-8" />
                  : <ToggleLeft className="h-8 w-8" />
                }
              </button>
            </div>
            {maintenanceMode && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Maintenance Message
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We're performing scheduled maintenance. Back soon!"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-secondary border border-amber-500/30 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              Theme Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex-grow">
              <p className="text-xs font-bold text-foreground">Interface Theme</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Toggle between Light, Dark, or System mode to change the appearance of the dashboards.
              </p>
            </div>
            <div className="shrink-0">
              <ThemeToggle showLabel variant="admin" />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {FEATURE_FLAGS_CONFIG.map(({ key, label, description }) => {
              const enabled = featureFlags?.[key] ?? false;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFeature(key)}
                    className={`ml-4 transition-colors shrink-0 ${enabled ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title={enabled ? "Disable feature" : "Enable feature"}
                  >
                    {enabled
                      ? <ToggleRight className="h-7 w-7" />
                      : <ToggleLeft className="h-7 w-7" />
                    }
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-4">
          <Button
            onClick={handleSavePlatformSettings}
            disabled={isSaving}
            className="h-10 px-6 text-sm font-black bg-primary hover:bg-primary/95 text-primary-foreground gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
