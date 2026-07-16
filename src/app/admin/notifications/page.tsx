"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService, type BroadcastTarget, type BroadcastType } from "@/services/AdminService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  BellRing,
  Send,
  Users,
  Camera,
  User,
  Megaphone,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const NOTIFICATION_TYPES = [
  { value: "system" as BroadcastType, label: "System", icon: Megaphone, color: "text-blue-400" },
  { value: "update" as BroadcastType, label: "Update", icon: RefreshCw, color: "text-teal-400" },
  { value: "maintenance" as BroadcastType, label: "Maintenance", icon: AlertTriangle, color: "text-red-400" },
  { value: "promotion" as BroadcastType, label: "Promotion", icon: Megaphone, color: "text-pink-400" },
  { value: "warning" as BroadcastType, label: "Warning", icon: AlertTriangle, color: "text-orange-400" },
  { value: "security" as BroadcastType, label: "Security", icon: AlertTriangle, color: "text-rose-400" },
  { value: "success" as BroadcastType, label: "Success", icon: CheckCircle, color: "text-green-400" },
];

const TARGET_OPTIONS = [
  { value: "all" as BroadcastTarget, label: "Everyone", icon: Users, description: "Send to all users and photographers" },
  { value: "all_photographers" as BroadcastTarget, label: "All Photographers", icon: Camera, description: "Send to every verified photographer" },
  { value: "all_users" as BroadcastTarget, label: "All Customers", icon: Users, description: "Send to all registered customers" },
  { value: "photographer" as BroadcastTarget, label: "Selected Photographer", icon: Camera, description: "Send to a specific photographer" },
  { value: "user" as BroadcastTarget, label: "Selected User", icon: User, description: "Send to a specific customer" },
];

export default function AdminNotificationsPage() {
  const { user } = useAuthStore();
  const [isSending, setIsSending] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{ count: number; timestamp: string } | null>(null);

  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<BroadcastType>("system");
  const [selectedTarget, setSelectedTarget] = React.useState<BroadcastTarget>("all");
  const [actionUrl, setActionUrl] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");

  // Lists for selecting single recipients
  const [photographers, setPhotographers] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = React.useState("");
  const [isLoadingLists, setIsLoadingLists] = React.useState(false);

  React.useEffect(() => {
    async function loadLists() {
      setIsLoadingLists(true);
      try {
        const [pList, uList] = await Promise.all([
          adminService.listAllPhotographers(),
          adminService.listAllUsers(),
        ]);
        setPhotographers(pList);
        setUsers(uList);
      } catch (err) {
        console.error("Failed to load users and photographers lists", err);
        toast.error("Failed to load users and photographers lists");
      } finally {
        setIsLoadingLists(false);
      }
    }
    loadLists();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    const isSingleRecipient = selectedTarget === "photographer" || selectedTarget === "user";
    if (isSingleRecipient && !selectedRecipientId) {
      toast.error("Please select a recipient");
      return;
    }

    let targetLabel = selectedTarget.replace("_", " ");
    if (isSingleRecipient) {
      const recipientName = selectedTarget === "photographer"
        ? photographers.find(p => p.uid === selectedRecipientId)?.name
        : users.find(u => u.uid === selectedRecipientId)?.displayName;
      targetLabel = `${selectedTarget}: ${recipientName || selectedRecipientId}`;
    }

    if (!confirm(`Send "${title}" to ${targetLabel}?`)) return;

    setIsSending(true);
    try {
      const count = await adminService.sendBroadcastNotification({
        target: selectedTarget,
        targetId: isSingleRecipient ? selectedRecipientId : undefined,
        title: title.trim(),
        message: message.trim(),
        type: selectedType,
        actionUrl: actionUrl.trim() || undefined,
        priority,
      });
      setLastResult({ count, timestamp: new Date().toLocaleTimeString() });
      toast.success(`Notification sent to ${count} recipient(s)!`);
      setTitle("");
      setMessage("");
      setActionUrl("");
      setSelectedRecipientId("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send broadcast notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 max-w-4xl select-none">
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BellRing className="h-7 w-7 text-primary" />
            Notification Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">
            Compose and dispatch notifications to photographers and users across the platform.
          </p>
        </div>

        {/* Success result */}
        {lastResult && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <div>
              <p className="text-xs font-black text-green-600 dark:text-green-400">
                Broadcast sent successfully at {lastResult.timestamp}
              </p>
              <p className="text-[11px] text-green-600/70 dark:text-green-400/70 font-semibold">
                Delivered to {lastResult.count} recipient(s)
              </p>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="ml-auto text-green-500/60 hover:text-green-450 text-xs focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Composer */}
          <Card className="bg-card border border-border lg:col-span-2">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Compose Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSend} className="space-y-5">
                {/* Notification Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Notification Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {NOTIFICATION_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSelectedType(t.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          selectedType === t.value
                            ? "bg-primary/10 border-primary/30"
                            : "bg-secondary border-border hover:border-border/85 hover:bg-secondary/85"
                        }`}
                      >
                        <t.icon className={`h-4 w-4 shrink-0 ${t.color}`} />
                        <span className={`text-[11px] font-bold ${selectedType === t.value ? "text-foreground font-extrabold" : "text-muted-foreground"}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TARGET_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          setSelectedTarget(t.value);
                          setSelectedRecipientId("");
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          selectedTarget === t.value
                            ? "bg-primary/10 border-primary/30"
                            : "bg-secondary border-border hover:border-border/85 hover:bg-secondary/85"
                        }`}
                      >
                        <t.icon className={`h-4 w-4 mt-0.5 shrink-0 ${selectedTarget === t.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-[11px] font-black ${selectedTarget === t.value ? "text-foreground font-black" : "text-muted-foreground"}`}>
                            {t.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground/75 font-semibold mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Recipient Dropdown */}
                {(selectedTarget === "photographer" || selectedTarget === "user") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                      Select {selectedTarget === "photographer" ? "Photographer" : "User"} *
                    </label>
                    {isLoadingLists ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading directory...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      >
                        <option value="" disabled className="bg-background text-foreground">-- Choose Recipient --</option>
                        {selectedTarget === "photographer"
                          ? photographers.map((p) => (
                              <option key={p.uid} value={p.uid} className="bg-background text-foreground">
                                {p.name} ({p.email})
                              </option>
                            ))
                          : users.map((u) => (
                              <option key={u.uid} value={u.uid} className="bg-background text-foreground">
                                {u.displayName || "No Name"} ({u.email})
                              </option>
                            ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Important Platform Update"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[9px] text-muted-foreground/60 font-semibold text-right">{title.length}/100</p>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Message Body *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your broadcast message here..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <p className="text-[9px] text-muted-foreground/60 font-semibold text-right">{message.length}/500</p>
                </div>
                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Notification Priority
                  </label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold capitalize transition-all focus:outline-none ${
                          priority === p
                            ? p === "high"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-500 font-extrabold"
                              : p === "medium"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-extrabold"
                              : "bg-zinc-500/10 border-zinc-500/30 text-zinc-500 font-extrabold"
                            : "bg-secondary border-border hover:border-border/80 text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action URL (optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Action URL <span className="text-muted-foreground/60 normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/dashboard or https://..."
                    className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSending || !title.trim() || !message.trim() || ((selectedTarget === "photographer" || selectedTarget === "user") && !selectedRecipientId)}
                  className="w-full h-11 rounded-xl text-sm font-black bg-primary hover:bg-primary/90 text-white gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Broadcast...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Broadcast Notification
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview & Guide */}
          <div className="space-y-4">
            {/* Live preview */}
            <Card className="bg-card border border-border">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="bg-secondary border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate">
                        {title || "Notification Title"}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-3">
                        {message || "Your message will appear here..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground/75 font-semibold border-t border-border/60 pt-2">
                    <span>SnapEvent Platform</span>
                    <span>Just now</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card className="bg-card border border-border">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Broadcast Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-[10px] font-semibold text-muted-foreground">
                {[
                  "Only send critical, time-sensitive updates.",
                  "Keep titles under 60 characters for best display.",
                  "Avoid sending multiple broadcasts on the same day.",
                  "System announcements go to ALL platform users.",
                  "Each broadcast is logged in the audit trail.",
                ].map((tip, i) => (
                  <p key={i} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    {tip}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
