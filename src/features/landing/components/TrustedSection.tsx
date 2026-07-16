"use client";

import { motion } from "framer-motion";

export function TrustedSection() {
  const stats = [
    { value: "10,000+", label: "Events Covered" },
    { value: "2,500+", label: "Photographers" },
    { value: "500K+", label: "Photos Shared" },
    { value: "99%", label: "Happy Customers" },
  ];

  return (
    <section className="py-12 border-y border-border/60 bg-secondary/20 dark:bg-zinc-900/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="space-y-1.5"
            >
              <h3 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                {stat.value}
              </h3>
              <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
