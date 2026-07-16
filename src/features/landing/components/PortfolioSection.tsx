"use client";

import { motion } from "framer-motion";
import { getPlaceholderImage } from "@/utils/helpers";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useUiStore } from "@/store/ui-store";

export function PortfolioSection() {
  const { lightbox, openLightbox, closeLightbox, nextImage, prevImage } = useUiStore();

  const portfolioPhotos = [
    getPlaceholderImage("wedding", 0),
    getPlaceholderImage("portrait", 0),
    getPlaceholderImage("event", 0),
    getPlaceholderImage("scenery", 0),
    getPlaceholderImage("wedding", 1),
    getPlaceholderImage("portrait", 1),
    getPlaceholderImage("event", 1),
    getPlaceholderImage("scenery", 1),
  ];

  return (
    <section className="py-20 bg-background" id="portfolio">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Portfolio Showcase</h2>
          <p className="text-muted-foreground">
            A sneak peek at high-quality captures uploaded by verified SnapEvent photographers.
          </p>
        </div>

        {/* Masonry Layout grid */}
        <div className="columns-2 md:columns-4 gap-4 space-y-4">
          {portfolioPhotos.map((photo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              onClick={() => openLightbox(portfolioPhotos, index)}
              className="relative overflow-hidden rounded-xl border border-border group cursor-zoom-in break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Showcase item"
                className="w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <ZoomIn className="text-white h-7 w-7" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal Render */}
      {lightbox.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-white rounded-lg p-2 bg-white/5 border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white rounded-full p-2 md:p-3 bg-white/5 border border-white/10 z-10"
          >
            <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.images[lightbox.currentIndex]}
            alt="Expanded showcase view"
            className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-white/10"
          />

          <button
            onClick={nextImage}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white rounded-full p-2 md:p-3 bg-white/5 border border-white/10 z-10"
          >
            <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
          </button>
        </div>
      )}
    </section>
  );
}
