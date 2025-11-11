# Installation Instructions

## ⚠️ npm Cache Issue

There's currently a permission issue with the npm cache on this system. To proceed with installation, you have two options:

### Option 1: Fix npm Cache Permissions (Recommended)

Run this command in your terminal:

```bash
sudo chown -R $(whoami) ~/.npm
```

Then install dependencies:

```bash
cd /Users/esbenpro/Documents/KlasseChatten
npm install --legacy-peer-deps
```

### Option 2: Use pnpm (Recommended)

Install pnpm globally (you may need sudo):

```bash
sudo npm install -g pnpm@9.1.0
```

Then restore the workspace protocol in package.json files and install:

```bash
cd /Users/esbenpro/Documents/KlasseChatten
pnpm install
```

### Option 3: Use Yarn

```bash
npm install -g yarn
cd /Users/esbenpro/Documents/KlasseChatten
yarn install
```

## After Installation

Once dependencies are installed, you can:

1. **Build shared packages**:
   ```bash
   npm run build
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

3. **Run specific apps**:
   ```bash
   # Web app
   cd apps/web && npm run dev
   
   # Mobile app
   cd apps/mobile && npm run dev
   ```

## Project Structure

The monorepo is fully scaffolded with:
- ✅ Turborepo configuration
- ✅ Next.js 16 web app (apps/web)
- ✅ Expo mobile app (apps/mobile)
- ✅ Shared packages (types, validation, lib)
- ✅ TypeScript, ESLint, and Prettier configs
- ✅ npm workspaces configuration

All code is ready to run once dependencies are installed!
