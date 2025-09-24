"use client";

import type { ReactNode } from "react";
import { MetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider
        initialMockChains={{ 11155111: "https://sepolia.infura.io/v3/ef295e63c00d424db525257d56a9d657" }}
      >
        <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}
