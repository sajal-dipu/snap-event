"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import {
  Camera,
  ShieldAlert,
  Users,
  CalendarCheck,
  MessageSquare,
  BarChart3,
  LogOut,
  Menu,
  ChevronRight,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Home,
  Image as ImageIcon,
  Download,
  Settings,
  ScrollText,
  FolderOpen,
  X,
  Search,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useUiStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/common/NotificationBell";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Dropdown } from "@/components/ui/Dropdown";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Validation schema for Admin Password Reset
const firstLoginSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FirstLoginFormData = z.infer<typeof firstLoginSchema>;

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: Home },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Photographers", href: "/admin/photographers", icon: Camera },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
      { label: "Virtual Rooms", href: "/admin/rooms", icon: FolderOpen },
      { label: "Photos", href: "/admin/photos", icon: ImageIcon },
      { label: "Download Requests", href: "/admin/download-requests", icon: Download },
      { label: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: BellRing },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminDashboardLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { user, isLoading } = useAuthStore();
  const { logout } = useAuth();

  const [isAdminLoading, setIsAdminLoading] = React.useState(true);
  const [firstLogin, setFirstLogin] = React.useState<boolean>(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Close sidebar drawer on page navigation
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Prevent body scroll when drawer is open on mobile/tablet
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ESC key closes the sidebar drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSidebarOpen]);

  // Fetch admin profile config to detect first Login requirement and validate admin role
  React.useEffect(() => {
    async function checkFirstLogin() {
      if (isLoading) return;

      if (!auth.currentUser || !user?.uid) {
        setIsAdminLoading(false);
        router.push("/admin/login");
        return;
      }

      if (user.role !== "admin") {
        setIsAdminLoading(false);
        toast.error("Unauthorized: Access denied.");
        logout();
        router.push("/admin/login");
        return;
      }

      try {
        let adminDocData: any = null;
        const snap = await getDoc(doc(db, "admins", user.uid));
        if (snap.exists()) {
          adminDocData = snap.data();
        }

        if (adminDocData) {
          const role = adminDocData.role?.toLowerCase();
          const isActive = adminDocData.isActive;
          if (role === "admin" && isActive !== false) {
            setFirstLogin(adminDocData.firstLogin === true);
          } else {
            toast.error("Unauthorized: Access denied.");
            logout();
            router.push("/admin/login");
          }
        } else {
          toast.error("Unauthorized: Access denied.");
          logout();
          router.push("/admin/login");
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        toast.error("Unauthorized: Access denied.");
        logout();
        router.push("/admin/login");
      } finally {
        setIsAdminLoading(false);
      }
    }
    checkFirstLogin();
  }, [user, isLoading, router, logout]);

  // Form hooks for Password Change
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstLoginFormData>({
    resolver: zodResolver(firstLoginSchema),
  });

  const handlePasswordChange = async (data: FirstLoginFormData) => {
    if (!auth.currentUser || !user) return;
    setIsSubmittingPassword(true);
    try {
      await updatePassword(auth.currentUser, data.password);
      
      const adminDocRef = doc(db, "admins", user.uid);
      await updateDoc(adminDocRef, {
        firstLogin: false,
        passwordChangedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Administrator password secured successfully.");
      setFirstLogin(false);
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update security credentials.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/admin/login";
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      return { label, href, isLast: idx === segments.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  // Current page title
  const currentPageTitle = React.useMemo(() => {
    for (const group of NAV_GROUPS) {
      const item = group.items.find(i => i.href === pathname);
      if (item) return item.label;
    }
    return "Admin Console";
  }, [pathname]);

  if (isAdminLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-zinc-50 dark:border-zinc-950 animate-pulse" />
        </div>
        <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-2">Validating session...</p>
      </div>
    );
  }

  // Intercept view if password change is required
  if (firstLogin) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0a0a0f] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-white">Secure Admin Credentials</h2>
            <p className="text-xs text-zinc-400 leading-relaxed px-2">
              For security, you must update the temporary default password before accessing the admin dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secure password"
                  {...register("password")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.password ? "border-red-500" : "border-zinc-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-400 font-bold">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm secure password"
                  {...register("confirmPassword")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.confirmPassword ? "border-red-500" : "border-zinc-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-400 font-bold">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700 flex gap-2 items-start text-[10px] font-semibold text-zinc-400 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                A strong password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 rounded-xl text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPassword}
                className="flex-1 h-10 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans transition-colors duration-300">
      {/* Sidebar - Desktop: Always visible, fixed left, 280px width */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-[280px] bg-card text-card-foreground border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-14 px-4 border-b border-border flex items-center gap-2.5 shrink-0">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground shrink-0">
            <Camera className="h-4 w-4" />
          </div>
          <div className="overflow-hidden">
            <span className="font-black text-sm text-foreground tracking-tight block">SnapEvent</span>
            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Admin Console</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow overflow-y-auto p-3 space-y-5 scrollbar-none">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest px-2 mb-1.5">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 group focus:outline-none focus:ring-1 focus:ring-primary ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                      }`}
                    >
                      <item.icon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badge && item.badge > 0 ? (
                        <span className="ml-auto bg-destructive text-destructive-foreground text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">
                          {item.badge}
                        </span>
                      ) : null}
                      {isActive && (
                        <span className="ml-auto w-1 h-1 rounded-full bg-primary shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary border border-border mb-2">
            <Avatar src={user?.photoURL || undefined} fallback="A" size="sm" className="shrink-0 ring-1 ring-primary/30" />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-foreground truncate">Super Admin</p>
              <p className="text-[9px] text-muted-foreground truncate font-mono">{user?.email || "admin@snapevent"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus:outline-none focus:ring-1 focus:ring-destructive/50"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile/Tablet Drawer using Framer Motion */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay (black/50 opacity) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 z-40 w-[280px] bg-card text-card-foreground border-r border-border flex flex-col shadow-2xl"
            >
              {/* Logo */}
              <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="bg-primary p-1.5 rounded-lg text-primary-foreground shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-black text-sm text-foreground tracking-tight block">SnapEvent</span>
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Admin Console</span>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-grow overflow-y-auto p-3 space-y-5 scrollbar-none">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest px-2 mb-1.5">
                      {group.title}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 group focus:outline-none focus:ring-1 focus:ring-primary ${
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                            }`}
                          >
                            <item.icon
                              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                            {item.badge && item.badge > 0 ? (
                              <span className="ml-auto bg-destructive text-destructive-foreground text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="p-3 border-t border-border shrink-0">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary border border-border mb-2">
                  <Avatar src={user?.photoURL || undefined} fallback="A" size="sm" className="shrink-0 ring-1 ring-primary/30" />
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold text-foreground truncate">Super Admin</p>
                    <p className="text-[9px] text-muted-foreground truncate font-mono">{user?.email || "admin@snapevent"}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus:outline-none focus:ring-1 focus:ring-destructive/50"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content Area: Responsive left margin on desktop */}
      <div className="flex-grow flex flex-col transition-all duration-300 lg:pl-[280px] min-h-screen">
        {/* Header bar: menu, logo, search, notifications, profile */}
        <header className="h-14 bg-card/90 border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Menu Button - Mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open menu drawer"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Logo - Mobile only */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="bg-primary p-1 rounded-lg text-primary-foreground shrink-0">
                <Camera className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-xs text-foreground tracking-tight">SnapEvent</span>
            </div>

            {/* Breadcrumbs - Desktop only */}
            <nav className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/admin/dashboard" className="hover:text-foreground transition-colors">
                SnapEvent
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <ChevronRight className="h-3 w-3 shrink-0 text-border" />
                  <Link
                    href={crumb.href}
                    className={`transition-colors ${crumb.isLast ? "text-foreground font-bold" : "hover:text-foreground"}`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>

            {/* Current title on mobile instead of breadcrumbs */}
            <h1 className="lg:hidden text-xs font-black text-foreground ml-2">{currentPageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick search */}
            <div className="hidden md:flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground hover:border-border/80 transition-colors cursor-pointer w-44">
              <Search className="h-3 w-3 shrink-0" />
              <span>Quick search...</span>
              <kbd className="ml-auto text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>

            {/* Theme toggle */}
            <ThemeToggle variant="admin" />

            {/* Real-time Notifications bell */}
            {user?.uid && (
              <NotificationBell userId={user.uid} variant="admin" />
            )}

            {/* Admin Profile Dropdown */}
            <Dropdown
              trigger={
                <Avatar
                  fallback="A"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground ring-1 ring-primary/40 hover:ring-2 hover:ring-primary transition-all cursor-pointer shrink-0"
                />
              }
              items={[
                {
                  label: "Settings",
                  href: "/admin/settings",
                  icon: <Settings className="h-3.5 w-3.5" />,
                },
                {
                  label: "Audit Logs",
                  href: "/admin/audit-logs",
                  icon: <ScrollText className="h-3.5 w-3.5" />,
                },
                {
                  label: "Sign Out",
                  onClick: handleLogout,
                  icon: <LogOut className="h-3.5 w-3.5" />,
                  variant: "destructive",
                },
              ]}
              align="right"
            />
          </div>
        </header>

        {/* Main content with framer-motion Page Transitions */}
        <main className="flex-grow p-4 md:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-semibold shrink-0">
          <span>SnapEvent Admin Console v2.0</span>
          <span>© 2025 SnapEvent. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}
export default AdminDashboardLayout;
