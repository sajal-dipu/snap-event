import * as React from "react";
import { Upload, FileImage, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SelfieUploaderProps {
  onFileSelected: (file: File) => void;
}

export function SelfieUploader({ onFileSelected }: SelfieUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    // Validate File Extension: JPEG, PNG, WEBP, HEIC
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      toast.error("Invalid file format. Supports JPEG, PNG, WEBP, or HEIC.");
      return;
    }

    // Validate Maximum Size: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Selfie image is too large. Maximum allowed size is 5MB.");
      return;
    }

    onFileSelected(file);
  };

  const triggerFileBrowser = () => fileInputRef.current?.click();

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={triggerFileBrowser}
      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? "border-primary bg-primary/[0.03] scale-[1.005]"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-card/60"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,.heic"
        className="hidden"
      />

      <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border shadow-inner flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
        <Upload className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
      </div>

      <h3 className="font-extrabold text-sm text-foreground mt-3.5">
        Upload selfie image
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
        Select or drag a selfie photo from your device camera roll.
      </p>

      <div className="flex items-center gap-1.5 mt-4 p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-bold uppercase tracking-wider">
        <AlertCircle className="h-3.5 w-3.5" />
        JPEG, PNG, WEBP, OR HEIC • Max 5MB
      </div>
    </div>
  );
}
export default SelfieUploader;
