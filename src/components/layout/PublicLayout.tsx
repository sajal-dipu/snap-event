"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full glass border-b border-border transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              SnapEvent
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/photographers" className="hover:text-foreground transition-colors">Find Photographer</Link>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                {user?.role === "photographer" && (
                  <Link href="/dashboard">
                    <Button variant="outline">Go to Dashboard</Button>
                  </Link>
                )}
                {(user?.role === "user" || user?.role === "customer") && (
                  <Link href="/user/dashboard">
                    <Button variant="outline">My Dashboard</Button>
                  </Link>
                )}
                <Button variant="ghost" onClick={logout}>Sign Out</Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline">Sign Up</Button>
                </Link>
                <Link href="/signup?role=photographer">
                  <Button variant="gradient">Become Photographer</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 backdrop-blur-lg md:hidden border-t border-border flex flex-col p-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-5 text-lg font-semibold mb-8">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/photographers" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">
              Find Photographer
            </Link>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">
              Features
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex flex-col gap-3 mt-auto">
            {isAuthenticated ? (
              <>
                {user?.role === "photographer" && (
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-12">Go to Dashboard</Button>
                  </Link>
                )}
                {(user?.role === "user" || user?.role === "customer") && (
                  <Link href="/user/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-12">My Dashboard</Button>
                  </Link>
                )}
                <Button variant="ghost" onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full h-12 border border-border">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-12">Login</Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full h-12">Sign Up</Button>
                </Link>
                <Link href="/signup?role=photographer" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="gradient" className="w-full h-12 justify-center gap-2">
                    Become Photographer <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Common Footer */}
      <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-900 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-2 rounded-lg text-primary-foreground">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">
                  SnapEvent
                </span>
              </Link>
              <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                A modern photographer booking and AI event photo sharing platform. Capture, match, and share seamlessly.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/photographers" className="hover:text-white transition-colors">Find Photographers</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors">AI Matching</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press Kit</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
            <p>&copy; {new Date().getFullYear()} SnapEvent Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-zinc-400">Instagram</a>
              <a href="#" className="hover:text-zinc-400">Twitter</a>
              <a href="#" className="hover:text-zinc-400">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default PublicLayout;
