# KlasseChatten Monorepo

A modern monorepo for the KlasseChatten platform with Next.js web app and Expo mobile app.

## 🏗️ Project Structure

```
/apps
  /web        # Next.js 16 (App Router) - SSR/SEO, browser UX, parent/admin, moderation
  /mobile     # Expo (React Native) - iOS/Android mobile apps
/packages
  /types      # Shared TypeScript types for DB and API
  /validation # Zod schemas for payloads and policies
  /lib        # Shared business logic (auth utils, formatters, feature flags)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 10+

### Installation

Install pnpm globally (recommended):

```bash
npm install -g pnpm@9.1.0
```

Or use npm workspaces if pnpm is not available.

Install dependencies:

```bash
# If using pnpm
pnpm install

# If using npm
npm install
```

### Development

Run all apps in development mode:

```bash
npm run dev
```

Or run specific apps:

```bash
# Web app only
cd apps/web
npm run dev

# Mobile app only
cd apps/mobile
npm run dev
```

### Building

Build all packages and apps:

```bash
npm run build
```

Build packages first (required before building apps):

```bash
# Build shared packages
cd packages/types && npm run build
cd ../validation && npm run build
cd ../lib && npm run build

# Then build apps
cd ../../apps/web && npm run build
```

## 📦 Packages

### @klassechatten/types
Shared TypeScript types and interfaces for the entire platform.

### @klassechatten/validation
Zod validation schemas for API payloads and data validation.

### @klassechatten/lib
Shared business logic including:
- Authentication utilities
- Date and text formatters (Danish locale)
- Feature flag management

## 🌐 Apps

### Web App (`apps/web`)
- **Framework**: Next.js 16 with App Router
- **Features**: 
  - SSR/SEO optimization
  - Parent dashboard
  - Admin interface
  - Content moderation
  - Real-time chat with backfill
  - OpenAI moderation integration
  - Emoji reactions to messages
- **Port**: 3000 (default)

### Mobile App (`apps/mobile`)
- **Framework**: Expo (React Native)
- **Platforms**: iOS and Android
- **Features**: 
  - Student and parent mobile experience
  - Real-time chat
  - Push notifications
  - Offline support
  - Emoji reactions to messages

## 🛠️ Development Tools

- **Monorepo**: Turborepo
- **Package Manager**: pnpm (recommended) or npm
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint
- **Formatting**: Prettier

## 📝 Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all code
- `npm run type-check` - Type check all TypeScript code
- `npm run clean` - Clean build artifacts

## 🔧 Configuration

- Turborepo configuration: `turbo.json`
- TypeScript base config: `tsconfig.json`
- Workspace configuration: `pnpm-workspace.yaml` or `package.json` workspaces

## 📱 Mobile Development

### Running on iOS

```bash
cd apps/mobile
npm run ios
```

### Running on Android

```bash
cd apps/mobile
npm run android
```

### Building with EAS

```bash
cd apps/mobile
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

## 🤝 Contributing

This is a monorepo. When adding new features:

1. Add shared types to `packages/types`
2. Add validation schemas to `packages/validation`
3. Add shared logic to `packages/lib`
4. Implement UI in `apps/web` or `apps/mobile`

## 📄 License

Private - All rights reserved

## 📚 Additional Documentation

- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) - Database setup and configuration
- [`EDGE_FUNCTION_DEPLOYMENT.md`](./EDGE_FUNCTION_DEPLOYMENT.md) - Deploy moderation function
- [`REALTIME_CHAT.md`](./REALTIME_CHAT.md) - Real-time chat implementation
- [`INSTALLATION.md`](./INSTALLATION.md) - Installation troubleshooting
