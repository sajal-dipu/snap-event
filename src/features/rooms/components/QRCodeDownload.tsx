"use client";

import * as React from "react";
import { Download, Share2, Printer, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface QRCodeDownloadProps {
  qrCodeUrl: string;
  roomName: string;
}

export function QRCodeDownload({ qrCodeUrl, roomName }: QRCodeDownloadProps) {
  const [copied, setCopied] = React.useState(false);
  const [isSvgDownloading, setIsSvgDownloading] = React.useState(false);
  const [isPngDownloading, setIsPngDownloading] = React.useState(false);

  // Generate QR APIs dynamically from qrCodeUrl
  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrCodeUrl)}`;
  const qrServerSvgUrl = `${qrServerUrl}&format=svg`;

  /**
   * Copies the raw scan URL to clipboard
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      toast.success("Scan URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy link");
    }
  };

  /**
   * Downloads the QR code as a Vector SVG file by fetching it from the API
   */
  const handleDownloadSVG = async () => {
    setIsSvgDownloading(true);
    try {
      const response = await fetch(qrServerSvgUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const svgText = await response.text();

      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `qrcode_${roomName.toLowerCase().replace(/\s+/g, "_")}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("SVG download started!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download SVG QR Code.");
    } finally {
      setIsSvgDownloading(false);
    }
  };

  /**
   * Downloads the QR code as a PNG file by rendering it on a canvas
   */
  const handleDownloadPNG = async () => {
    setIsPngDownloading(true);
    try {
      const img = new Image();
      // Enable cross-origin for canvas operations
      img.crossOrigin = "anonymous";
      img.src = qrServerUrl;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          // Fill background white
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const url = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = url;
          link.download = `qrcode_${roomName.toLowerCase().replace(/\s+/g, "_")}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("PNG download started!");
        } else {
          throw new Error("Could not get canvas context");
        }
        setIsPngDownloading(false);
      };

      img.onerror = () => {
        throw new Error("Could not load image");
      };
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PNG QR Code.");
      setIsPngDownloading(false);
    }
  };

  /**
   * Triggers browser print workflow for a beautiful printable poster
   */
  const handlePrintPoster = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocker prevented printing poster.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Poster - ${roomName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #ffffff;
              color: #18181b;
              text-align: center;
              padding: 40px;
            }
            .poster-card {
              border: 3px solid #18181b;
              border-radius: 24px;
              padding: 50px 30px;
              max-width: 500px;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            h1 {
              font-size: 32px;
              margin: 0 0 10px 0;
              font-weight: 800;
              letter-spacing: -0.025em;
            }
            h2 {
              font-size: 18px;
              color: #71717a;
              margin: 0 0 40px 0;
              font-weight: 500;
            }
            .qr-wrapper {
              background-color: #f4f4f5;
              padding: 20px;
              border-radius: 20px;
              margin-bottom: 30px;
            }
            img {
              width: 320px;
              height: 320px;
              display: block;
            }
            p.info {
              font-size: 16px;
              color: #3f3f46;
              margin: 0;
              font-weight: 600;
            }
            p.url {
              font-size: 14px;
              color: #a1a1aa;
              margin: 10px 0 0 0;
              font-family: monospace;
            }
            @media print {
              body {
                padding: 0;
                height: auto;
              }
              .poster-card {
                border: none;
                box-shadow: none;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            <h1>Scan & View Gallery</h1>
            <h2>${roomName}</h2>
            <div class="qr-wrapper">
              <img src="${qrServerUrl}" alt="Event QR Code" />
            </div>
            <div style="margin-top: 10px;">
              <p class="info">Scan to search photos using Face Recognition</p>
              <p class="url">${qrCodeUrl}</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              // close temporary tab after printing
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPNG}
        disabled={isPngDownloading}
        className="flex-1 min-w-[130px] gap-2 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Download className="h-4 w-4" />
        {isPngDownloading ? "PNG..." : "Download PNG"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadSVG}
        disabled={isSvgDownloading}
        className="flex-1 min-w-[130px] gap-2 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Download className="h-4 w-4" />
        {isSvgDownloading ? "SVG..." : "Download SVG"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="flex-1 min-w-[130px] gap-2 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        Share Scan Link
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrintPoster}
        className="flex-1 min-w-[130px] gap-2 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Printer className="h-4 w-4" />
        Print Poster
      </Button>
    </div>
  );
}
export default QRCodeDownload;
