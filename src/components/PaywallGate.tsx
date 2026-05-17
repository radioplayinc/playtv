import { type ReactNode } from "react";

// Paywall disabled — all content is free during launch
export function PaywallGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
