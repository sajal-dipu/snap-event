"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  LayoutDashboard,
  User,
  FolderKanban,
  Image as ImageIcon,
  CalendarDays,
  FileDown,
  Star,
  LogOut,
  Menu,
  ChevronRight,
  X,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useUiStore } from "@/store/ui-store";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/common/NotificationBell";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { toast } from "sonner";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function PhotographerDashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { user, isLoading, logout } = useAuth();
  const [isGuardLoading, setIsGuardLoading] = React.useState(true);
  const [pendingBookingsCount, setPendingBookingsCount] = React.useState(0);

  React.useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "bookings"),
      where("photographerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending" || data.bookingStatus === "pending") {
          count++;
        }
      });
      setPendingBookingsCount(count);
    }, (error) => {
      console.error("Error listening to pending bookings count:", error);
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (isLoading) return;

    if (!user?.uid || user.role !== "photographer") {
      setIsGuardLoading(false);
      router.push("/login");
      return;
    }
    setIsGuardLoading(false);
  }, [user, isLoading, router]);

  const menuItems = [
    { label: "🏠 Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "📁 Virtual Rooms", href: "/dashboard/rooms", icon: FolderKanban },
    { label: "📅 Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { label: "🛒 Marketplace", href: "/dashboard/marketplace", icon: ShoppingBag },
    { label: "👤 Profile", href: "/dashboard/profile", icon: User },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, label: string) => {
    // Navigates naturally
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

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

  // Simple breadcrumb builder based on path
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace("-", " ");
      return { label, href, isLast: idx === segments.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  // Bottom navigation items on mobile (Dashboard, Rooms, Bookings, Profile)
  const bottomNavItems = [
    { label: "🏠 Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "📁 Rooms", href: "/dashboard/rooms", icon: FolderKanban },
    { label: "📅 Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { label: "🛒 Marketplace", href: "/dashboard/marketplace", icon: ShoppingBag },
    { label: "👤 Profile", href: "/dashboard/profile", icon: User },
  ];
  if (isLoading || isGuardLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
            <Camera className="h-6 w-6" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-zinc-50 dark:border-zinc-950 animate-pulse" />
        </div>
        <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-2">Validating session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      {/* Sidebar - Desktop: Always visible on desktop, fixed left, 280px width */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-[280px] bg-card text-card-foreground border-r border-border flex-col">
        {/* Logo Area */}
        <div className="h-16 px-6 border-b border-border flex items-center gap-2 shrink-0">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Camera className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">SnapEvent</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.label)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.href === "/dashboard/bookings" && pendingBookingsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {pendingBookingsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile / Logout bottom */}
        <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary border border-border">
            <Avatar src={user?.photoURL || undefined} fallback={user?.displayName || "Photographer"} size="sm" />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-foreground truncate">{user?.displayName || "Photographer Studio"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || "studio@snapevent.com"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10 gap-3 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile/Tablet: Slide-in drawer using Framer Motion */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay (black/50 opacity) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black backdrop-blur-xs"
            />
            {/* Drawer (left-aligned, 280px width) */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 z-40 w-[280px] bg-card border-r border-border flex flex-col shadow-2xl"
            >
              {/* Logo Area */}
              <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-lg text-foreground tracking-tight">SnapEvent</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation links */}
              <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.label)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.href === "/dashboard/bookings" && pendingBookingsCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {pendingBookingsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User profile / Logout bottom */}
              <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary border border-border">
                  <Avatar src={user?.photoURL || undefined} fallback={user?.displayName || "Photographer"} size="sm" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.displayName || "Photographer Studio"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || "studio@snapevent.com"}</p>
                  </div>
                </div>
                <Button variant="ghost" className="justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10 gap-3" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area: Responsive left margin on desktop */}
      <div className="flex-grow flex flex-col transition-all duration-300 lg:pl-[280px] pb-16 lg:pb-0 min-h-screen">
        {/* Header bar: menu, logo, notifications, profile */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Menu Button - Mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open menu drawer"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo - Mobile only */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
                <Camera className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-base text-foreground tracking-tight">SnapEvent</span>
            </div>

            {/* Breadcrumbs - Desktop only */}
            <nav className="hidden lg:flex items-center gap-2 text-xs font-medium text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                SnapEvent
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <Link
                    href={crumb.href}
                    className={`transition-colors ${
                      crumb.isLast ? "text-foreground font-semibold" : "hover:text-foreground"
                    }`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Quick Actions (Notifications / Profile) */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle variant="photographer" />

            {/* Real-time Notifications bell */}
            {user?.uid && (
              <NotificationBell userId={user.uid} variant="photographer" />
            )}

            {/* Profile avatar */}
            <Link href="/dashboard/profile" aria-label="View Profile">
              <Avatar src={user?.photoURL || undefined} fallback={user?.displayName || "P"} size="sm" className="ring-1 ring-primary/25 hover:ring-2 hover:ring-primary transition-all shrink-0" />
            </Link>
          </div>
        </header>

        {/* Dashboard Main View with framer-motion Page Transitions */}
        <main className="p-4 sm:p-6 lg:p-8 flex-grow">
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
      </div>

      {/* Sticky Bottom Navigation - Visible on mobile/tablet, hidden on desktop */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-md border-t border-border flex items-center justify-around py-2 px-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const actualLabel = item.label.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.label)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 relative ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] leading-none">{actualLabel}</span>
              {item.href === "/dashboard/bookings" && pendingBookingsCount > 0 && (
                <span className="absolute top-1 right-3 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  {pendingBookingsCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
export default PhotographerDashboardLayout;
