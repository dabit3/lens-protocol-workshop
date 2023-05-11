'use client'
import './globals.css'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { mainnet, polygon } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { LensProvider, LensConfig, production } from '@lens-protocol/react-web'
import { bindings as wagmiBindings } from '@lens-protocol/wagmi'
const { provider, webSocketProvider } = configureChains([polygon, mainnet], [publicProvider()])

const client = createClient({
  autoConnect: true,
  provider,
  webSocketProvider,
});

const lensConfig: LensConfig = {
  bindings: wagmiBindings(),
  environment: production,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <WagmiConfig client={client}>
        <LensProvider config={lensConfig}>
          <body>{children}</body>
        </LensProvider>
     </WagmiConfig>
    </html>
  )
}