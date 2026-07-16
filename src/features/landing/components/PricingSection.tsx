"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function PricingSection() {
  const plans = [
    {
      name: "Customer",
      price: "Free",
      desc: "For event guests and booking clients.",
      features: [
        "Scan QR Codes to join rooms",
        "AI face search to find photos",
        "Low-res photo downloads",
        "Request high-res downloads",
        "Book photographers directly",
      ],
      cta: "Join as Guest",
      highlighted: false,
      href: "/signup",
    },
    {
      name: "Pro Photographer",
      price: "$29",
      period: "/mo",
      desc: "For independent professional photographers.",
      features: [
        "Everything in Customer",
        "Active bookings management",
        "Generate 10 active QR rooms/mo",
        "Upload up to 5,000 photos/mo",
        "AI facial recognition sorting",
        "Approve/reject download requests",
      ],
      cta: "Go Pro",
      highlighted: true,
      href: "/signup?role=photographer",
    },
    {
      name: "Studio",
      price: "$79",
      period: "/mo",
      desc: "For growing photography agencies.",
      features: [
        "Everything in Pro",
        "Unlimited active QR rooms",
        "Upload up to 30,000 photos/mo",
        "Agency developer API access",
        "Custom watermark branding",
        "Priority live chat support",
      ],
      cta: "Join Studio Plan",
      highlighted: false,
      href: "/signup?role=photographer",
    },
  ];

  return (
    <section className="py-20 bg-background animate-fade-in" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing Tiers</h2>
          <p className="text-muted-foreground">
            Select a tier that scales with your events and team size.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="h-full"
            >
              <Card
                className={`h-full flex flex-col justify-between border-border bg-card shadow-lg hover:shadow-xl transition-all duration-300 relative ${
                  plan.highlighted ? "border-indigo-500 ring-1 ring-indigo-500 scale-[1.03]" : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-[10px] uppercase tracking-wider py-1 px-3.5 rounded-full">
                    Most Popular
                  </div>
                )}

                <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    {plan.desc}
                  </CardDescription>

                  <div className="flex items-baseline mt-6 mb-2">
                    <span className="text-4xl font-black text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm font-semibold text-muted-foreground">{plan.period}</span>}
                  </div>
                </CardHeader>

                <CardContent className="px-8 pb-8 pt-0 flex-grow">
                  <ul className="space-y-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="p-8 border-t border-border/40">
                  <a href={plan.href} className="w-full">
                    <Button variant={plan.highlighted ? "default" : "outline"} className="w-full font-bold">
                      {plan.cta}
                    </Button>
                  </a>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
