import * as React from "react";
import { ShieldCheck, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PrivacyNoticeProps {
  onAccept?: () => void;
  showDismiss?: boolean;
}

export function PrivacyNotice({ onAccept, showDismiss = false }: PrivacyNoticeProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (!isOpen) return null;

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
            Biometric Data & Privacy Notice
          </h4>
        </div>
        {showDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="text-xs leading-relaxed text-muted-foreground space-y-2.5 font-medium">
        <p>
          To help you find your photos, this virtual event room utilizes secure AI Face Recognition. 
          When you upload or capture a selfie, the system analyzes facial landmarks to generate an anonymous mathematical face embedding.
        </p>
        
        <div className="flex gap-2 p-3 bg-primary/[0.03] border border-primary/10 rounded-xl text-primary-foreground dark:text-primary">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug font-semibold text-zinc-600 dark:text-zinc-400">
            <strong>In-Memory Processing:</strong> Your selfie image is processed immediately and is **NEVER** stored on our servers. The face embedding vector is used for real-time similarity matching and is discarded immediately after matching.
          </p>
        </div>

        <p>
          By proceeding with taking or uploading a selfie, you consent to the processing of your temporary face data solely for matching your photos in this event room.
        </p>
      </div>

      {onAccept && (
        <div className="pt-1">
          <Button
            onClick={onAccept}
            className="w-full bg-primary text-primary-foreground font-extrabold text-xs shadow-md shadow-primary/10 rounded-xl h-10"
          >
            I Accept & Consent
          </Button>
        </div>
      )}
    </div>
  );
}
export default PrivacyNotice;
