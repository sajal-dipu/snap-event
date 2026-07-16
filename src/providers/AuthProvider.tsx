"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function AuthProviderWrapper({ children }: Props) {
  return <AuthProvider>{children}</AuthProvider>;
}

export default AuthProviderWrapper;
