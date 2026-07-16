import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthProviderWrapper } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnapEvent | AI Event Photo Sharing & Photographer Booking Platform",
  description:
    "Discover and book professional photographers. Share event photos securely via QR codes and find your photos instantly using AI face recognition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="snappevent-theme">
            <AuthProviderWrapper>
              {children}
              <ToastProvider />
            </AuthProviderWrapper>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
