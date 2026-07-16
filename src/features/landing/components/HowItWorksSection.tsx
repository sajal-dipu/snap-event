"use client";

import { motion } from "framer-motion";
import { Search, Calendar, FolderPlus, Scan, Brain, Download } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    { title: "Search Photographer", desc: "Discover premium photographers filtered by city, event style, price, and ratings.", icon: Search },
    { title: "Book Event", desc: "Book directly by selecting package slots and securing payment details instantly.", icon: Calendar },
    { title: "Create Virtual Room", desc: "The photographer creates a virtual photo room and generates a sharing QR code.", icon: FolderPlus },
    { title: "Scan QR Room", desc: "Guests scan the event QR code with their mobile devices to access the portal.", icon: Scan },
    { title: "AI Finds Photos", desc: "AI matching engine scans and groups photos containing only that guest's face.", icon: Brain },
    { title: "Download Approvals", desc: "Guests request downloads. The photographer approves downloads to verify access.", icon: Download },
  ];

  return (
    <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How SnapEvent Works</h2>
          <p className="text-muted-foreground">
            A frictionless flow from discoverability to AI matches.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical timeline line (Desktop) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 hidden md:block" />

          <div className="space-y-12">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={index} className="flex flex-col md:flex-row items-center gap-6 relative">
                  {/* Step Card Left (Even index) */}
                  <div className={`w-full md:w-1/2 text-center md:text-right ${isEven ? "md:order-1" : "md:order-3 md:text-left"}`}>
                    <motion.div
                      initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className="glass border border-border p-6 rounded-2xl inline-block max-w-sm text-left shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="bg-primary/10 text-primary p-2.5 rounded-lg w-fit mb-3.5">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-base text-foreground mb-1">
                        Step {index + 1}: {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </motion.div>
                  </div>

                  {/* Center Dot Timeline marker */}
                  <div className="z-10 md:order-2 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      className="h-9 w-9 rounded-full bg-primary border-4 border-background flex items-center justify-center font-bold text-xs text-white shadow-md shadow-primary/20"
                    >
                      {index + 1}
                    </motion.div>
                  </div>

                  {/* Empty space filler for timeline layout (Desktop) */}
                  <div className="w-full md:w-1/2 hidden md:block md:order-3" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
