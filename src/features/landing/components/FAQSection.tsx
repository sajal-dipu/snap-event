"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import * as React from "react";

export function FAQSection() {
  const faqs = [
    { q: "How does the AI face recognition photo matching work?", a: "When you join a room by scanning its QR code, you take a quick secure selfie. Our AI system matches the mathematical patterns of your face profile to only return photos from the photographer containing your face, ensuring absolute privacy." },
    { q: "Are my photos kept secure and private from other guests?", a: "Yes. By default, guests can only view and request download access for photos containing their own face. Guests cannot browse another guest's sorted gallery, keeping everyone's photos secure." },
    { q: "How do photographers approve download requests?", a: "Once a guest requests to download their matched photos, the photographer receives a request code in their Professional Dashboard. They can review the requested count and approve/reject instantly." },
    { q: "Can I use SnapEvent for free as a customer?", a: "Absolutely! Event guests can scan QR codes, search for their photos using AI, and request downloads for free. Photographers pay a monthly subscription depending on active event rooms and photo volume." },
    { q: "Is there a limit on photos I can upload?", a: "The Pro Photographer plan supports up to 5,000 photo uploads per month. The Studio plan raises this limit to 30,000 photos, and the Enterprise plan supports custom limits." },
    { q: "How are photographers verified on the platform?", a: "All photographers requesting verification must submit identity proofs and portfolio verification credentials. Only qualified professionals who clear review receive the 'Verified' badge." },
    { q: "What happens if a photographer cancels my booking?", a: "Bookings are protected by our cancellation policy. If a photographer cancels, you are issued an immediate full refund to your booking payment method." },
    { q: "Do photo matching records get saved forever?", a: "SnapEvent archives room data based on the photographer's plan. Standard rooms are active for 30 days, while Pro rooms remain archived for up to 1 year." },
    { q: "Does the platform support custom watermarks?", a: "Yes, Studio and Enterprise plans allow photographers to upload custom transparent PNG watermarks that are dynamically overlaid on low-res preview files." },
    { q: "How fast is photo delivery?", a: "All uploads and downloads are served from global edge nodes, ensuring instantaneous preview fetches and high-res downloads anywhere in the world." },
  ];

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-zinc-50 dark:bg-zinc-900/30" id="faq">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">
            Everything you need to know about AI sorting, booking protection, and pricing.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index;
            return (
              <div key={index} className="border-b border-border py-4">
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between text-left font-bold text-base md:text-lg text-foreground hover:text-primary transition-colors py-2"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <Minus className="h-5 w-5 shrink-0 ml-4 text-primary" /> : <Plus className="h-5 w-5 shrink-0 ml-4 text-muted-foreground" />}
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm md:text-base text-muted-foreground pt-2.5 pb-2 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
