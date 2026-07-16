"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Camera, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32 flex items-center justify-center">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] -z-10 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] -z-10" />

      <div className="container mx-auto px-4 text-center">
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8 backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Introducing AI Face Recognition Matching</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto mb-6 leading-[1.1]"
        >
          Find the Perfect{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Photographer
          </span>{" "}
          for Every Special Moment
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Book trusted photographers, share event photos securely using QR codes, and let guests instantly find their own photos with AI-powered face recognition.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link href="/photographers">
            <Button variant="gradient" size="lg" className="w-full sm:w-auto font-semibold gap-2">
              Book Photographer <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/signup?role=photographer">
            <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold">
              Become Photographer
            </Button>
          </Link>
        </motion.div>

        {/* Floating Cards Graphic Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-4xl mx-auto rounded-2xl border border-border/80 bg-zinc-900/50 dark:bg-black/35 p-2 shadow-2xl backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&fit=crop"
            alt="SnapEvent platform preview"
            className="rounded-xl w-full object-cover aspect-[16/9] opacity-80"
          />

          {/* Floating badge 1: AI Match */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-6 -left-6 hidden sm:flex items-center gap-3 bg-card border border-border p-3.5 rounded-xl shadow-lg shadow-black/5"
          >
            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
              <ScanFace className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">AI Face Match</p>
              <p className="text-sm font-bold text-foreground">99.4% accuracy</p>
            </div>
          </motion.div>

          {/* Floating badge 2: Room Created */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-6 -right-6 hidden sm:flex items-center gap-3 bg-card border border-border p-3.5 rounded-xl shadow-lg shadow-black/5"
          >
            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500">
              <Camera className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Virtual Room</p>
              <p className="text-sm font-bold text-foreground">Wedding Room Active</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
