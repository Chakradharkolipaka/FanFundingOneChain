# 🎨 FanFunding – OneChain

> Support your favorite creators by donating **OCT** to their NFTs on **OneChain** (Move-based blockchain).

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Move](https://img.shields.io/badge/Move-Smart%20Contracts-blue)
![OneChain](https://img.shields.io/badge/OneChain-Testnet-orange)

---

## 📖 Overview

FanFunding is a decentralized creator-support platform built on **OneChain**. Creators mint NFTs (images or videos), and fans can donate OCT tokens directly to those NFTs. Video NFTs support **pay-per-view** — fans pay to unlock exclusive video content.

### Features

- 🖼️ **Mint Image NFTs** — Upload art to IPFS (Pinata) and mint on-chain
- 🎬 **Mint Video NFTs** — Upload videos with configurable watch prices
- ❤️ **Donate OCT** — Fans can donate OCT to any NFT
- 🎟️ **Pay-Per-View** — Pay to watch video NFTs, receive a ViewTicket as proof
- 💰 **Creator Withdrawals** — Creators can withdraw accumulated donations
- 🌓 **Dark/Light Mode** — Theme toggle with next-themes
- 📱 **Responsive** — Mobile-first design with bottom navigation

---

## 🏗️ Architecture

```
FanFundingOneChain/
├── contracts/fan_funding/          # Move smart contracts
│   ├── Move.toml
│   └── sources/
│       ├── nft_donation.move       # NFT minting + donations + withdrawals
│       └── pay_per_view.move       # Pay-per-view with ViewTicket
├── src/                            # Next.js 14 frontend
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Dashboard — lists all NFTs
│   │   ├── mint/page.tsx           # Mint page — upload & mint
│   │   ├── providers.tsx           # Sui dapp-kit + React Query + Theme
│   │   ├── theme-provider.tsx
│   │   ├── globals.css
│   │   └── api/pinata/upload/      # Server-side Pinata upload
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── NFTCard.tsx             # Card with donate + pay-to-watch
│   │   ├── SkeletonCard.tsx
│   │   ├── PageTransitionWrapper.tsx
│   │   ├── theme-toggle.tsx
│   │   └── ui/                     # shadcn/ui components
│   ├── constants/index.ts          # Package & Registry IDs
│   └── lib/
│       ├── utils.ts                # cn() utility
│       └── ipfs.ts                 # Pinata upload + IPFS gateway helpers
├── scripts/publish.sh              # Deploy Move contracts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- **Sui CLI** (compatible with OneChain's Move VM)
- A **Pinata** account (free tier works) for IPFS uploads
- **OneChain Software Wallet** browser extension

### 1. Clone & Install

```bash
cd FanFundingOneChain
npm install
```

### 2. Deploy Move Contracts

```bash
# Configure Sui CLI for OneChain testnet
sui client new-env --alias onechain --rpc https://rpc.testnet.onechain.fun
sui client switch --env onechain

# Get testnet OCT
# (use OneChain faucet)

# Deploy
chmod +x scripts/publish.sh
./scripts/publish.sh
```

Copy the **Package ID** and **Registry Object ID** from the output.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_ONECHAIN_RPC_URL=https://rpc.testnet.onechain.fun
NEXT_PUBLIC_PACKAGE_ID=0x<your_package_id>
NEXT_PUBLIC_REGISTRY_ID=0x<your_registry_object_id>
PINATA_JWT=<your_pinata_jwt>
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📝 Smart Contract Functions

### `nft_donation.move`

| Function | Description |
|----------|-------------|
| `mint_nft(registry, name, desc, uri)` | Mint an image NFT |
| `mint_video_nft(registry, name, desc, uri, price)` | Mint a video NFT with watch price |
| `donate(registry, nft, payment)` | Donate OCT to an NFT |
| `withdraw(nft)` | Creator withdraws donations |

### `pay_per_view.move`

| Function | Description |
|----------|-------------|
| `pay_to_watch(nft, payment, clock)` | Pay to watch a video NFT; get a ViewTicket |

---

## 🔧 Tech Stack

- **Blockchain**: OneChain (Move-based, Sui-compatible)
- **Smart Contracts**: Move language
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Wallet**: @mysten/dapp-kit (Sui dApp Kit)
- **IPFS**: Pinata Cloud
- **Animations**: Framer Motion + react-confetti

---

## 📄 License

MIT — see [LICENSE](./LICENSE)
