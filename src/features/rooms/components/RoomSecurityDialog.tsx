"use client";

import * as React from "react";
import { Lock, AlertCircle, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { hashPassword } from "@/utils/crypto";

interface RoomSecurityDialogProps {
  roomId: string;
  correctPasswordHash?: string;
  onVerified: () => void;
}

export function RoomSecurityDialog({
  roomId,
  correctPasswordHash,
  onVerified,
}: RoomSecurityDialogProps) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = React.useState(0);

  // Storage keys
  const lockoutUntilKey = `room-lockout-until-${roomId}`;
  const attemptsKey = `room-lockout-attempts-${roomId}`;
  const unlockedKey = `room-gate-unlocked-${roomId}`;

  // Check initial state
  React.useEffect(() => {
    // 1. If session is already unlocked, bypass gate
    const sessionUnlocked = sessionStorage.getItem(unlockedKey) === "true";
    if (sessionUnlocked) {
      onVerified();
      return;
    }

    // 2. Check active lockouts
    const lockoutUntil = parseInt(localStorage.getItem(lockoutUntilKey) || "0", 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      setLockoutTimeLeft(Math.ceil((lockoutUntil - now) / 1000));
    }
  }, [roomId, onVerified, lockoutUntilKey, unlockedKey]);

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutTimeLeft <= 0) return;

    const timer = setInterval(() => {
      const lockoutUntil = parseInt(localStorage.getItem(lockoutUntilKey) || "0", 10);
      const now = Date.now();
      const difference = lockoutUntil - now;

      if (difference <= 0) {
        setLockoutTimeLeft(0);
        localStorage.removeItem(lockoutUntilKey);
        localStorage.setItem(attemptsKey, "0");
        setError(null);
      } else {
        setLockoutTimeLeft(Math.ceil(difference / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutTimeLeft, lockoutUntilKey, attemptsKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;
    if (!password) {
      setError("Please enter the room password.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // 1. Hash the entered password client-side
      const inputHash = await hashPassword(password);

      // 2. Verify with correct password hash
      if (inputHash === correctPasswordHash) {
        // Successful verification
        localStorage.removeItem(attemptsKey);
        localStorage.removeItem(lockoutUntilKey);
        sessionStorage.setItem(unlockedKey, "true");
        onVerified();
      } else {
        // Increment attempts
        const currentAttempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10) + 1;
        localStorage.setItem(attemptsKey, currentAttempts.toString());

        if (currentAttempts >= 5) {
          // Lockout for 60 seconds
          const lockoutUntil = Date.now() + 60000;
          localStorage.setItem(lockoutUntilKey, lockoutUntil.toString());
          setLockoutTimeLeft(60);
          setError("Too many failed attempts. You have been locked out for 60 seconds.");
        } else {
          setError(`Incorrect Password. (${5 - currentAttempts} attempts remaining)`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during password verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md p-8 border border-zinc-800 bg-zinc-900/90 rounded-2xl shadow-2xl text-center">
        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
          {lockoutTimeLeft > 0 ? (
            <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
          ) : (
            <Lock className="h-8 w-8" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Enter Room Password</h2>
        <p className="text-sm text-zinc-400 mt-2">
          This event room is encrypted. Please enter the secure Room Password to proceed.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={lockoutTimeLeft > 0 || isVerifying}
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:ring-primary focus:border-primary text-center text-lg tracking-widest font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-left p-3 rounded-lg border border-red-950/50 bg-red-950/20 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {lockoutTimeLeft > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-zinc-800 text-zinc-400 hover:bg-zinc-800/20"
              disabled
            >
              Locked Out (Retry in {lockoutTimeLeft}s)
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20"
              disabled={isVerifying}
            >
              {isVerifying ? "Verifying security..." : "Unlock Room"}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
export default RoomSecurityDialog;
