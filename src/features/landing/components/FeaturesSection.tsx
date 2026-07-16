"use client";

import { motion } from "framer-motion";
import { ScanFace, QrCode, CloudLightning, ShieldCheck, CalendarRange, Star, LineChart, Cpu } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";

export function FeaturesSection() {
  const features = [
    { title: "AI Face Recognition", desc: "Instant matching scans. Guests scan QR and find only their photos automatically.", icon: ScanFace, color: "text-indigo-500 bg-indigo-500/10" },
    { title: "QR Event Sharing", desc: "Generate printable or digital room QR codes. Scan to join galleries instantly.", icon: QrCode, color: "text-purple-500 bg-purple-500/10" },
    { title: "Secure Photo Downloads", desc: "Photographers approve or reject request codes. Watermark controls included.", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10" },
    { title: "Verified Professionals", desc: "Browse pre-screened photographers with certified profiles and ratings.", icon: Cpu, color: "text-blue-500 bg-blue-500/10" },
    { title: "Instant Booking", desc: "Check calendar slots, select event packages, and pay securely in seconds.", icon: CalendarRange, color: "text-amber-500 bg-amber-500/10" },
    { title: "Rating & Reviews", desc: "Verified customer testimonials ensure premium work and service quality.", icon: Star, color: "text-pink-500 bg-pink-500/10" },
    { title: "Fast Cloud Delivery", desc: "Global CDN delivery guarantees superfast page loading and photo fetches.", icon: CloudLightning, color: "text-cyan-500 bg-cyan-500/10" },
    { title: "Professional Dashboard", desc: "Manage bookings, download requests, review counts, and upload rooms.", icon: LineChart, color: "text-rose-500 bg-rose-500/10" },
  ];

  return (
    <section className="py-20 bg-background" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SnapEvent?</h2>
          <p className="text-muted-foreground">
            A state-of-the-art photography booking engine fused with AI delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Card className="hover:border-indigo-500/20 bg-card hover:shadow-lg dark:hover:shadow-black/5 transition-all duration-300 h-full">
                <CardHeader className="p-6">
                  <div className={`p-3.5 rounded-xl w-fit mb-4 flex items-center justify-center ${f.color}`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-bold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
