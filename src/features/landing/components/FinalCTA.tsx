"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-zinc-950 text-white">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Ready to Capture Every Moment?
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">
            Create an account today to discover expert photographers or start sharing event photos instantly with our AI facial matching engine.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/photographers" className="w-full sm:w-auto">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto font-bold gap-2">
                Book Photographer <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup?role=photographer" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold border-zinc-800 text-white hover:bg-zinc-900 hover:text-white">
                Join as Photographer
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
