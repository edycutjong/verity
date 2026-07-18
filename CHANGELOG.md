# Changelog

All notable changes to this project will be documented in this file.

## [1.6.1](../../compare/v1.6.0...v1.6.1) (2026-07-18)

### 🐛 Bug Fixes

- **ci:** exclude vendored public/vendor bundle from ESLint (345b103)

### 📝 Documentation

- **pitch:** finals-round accuracy pass — honest integration claims, on-chain proof rows, finalist badges, launch plan, print-to-PDF, self-hosted Tailwind (65bef5a)
- **readme:** add @VouchOnCasper follow badge (#16) (8f85a6b)
- add community health files (code of conduct, contributing, issue + PR templates) (4b8999c)
- **readme:** clarify project coordination context (0828abb)
- **readme:** add step-by-step screenshots walkthrough (832474e)

### 🔧 Chores

- **deps-dev:** bump @vitest/coverage-v8 from 4.1.9 to 4.1.10 (#20) (df2a023)
- **deps-dev:** bump typescript from 5.9.3 to 6.0.3 (#19) (b2c4304)
- **deps-dev:** bump @types/node from 26.1.0 to 26.1.1 (#22) (7c3959f)
- **deps-dev:** bump tailwindcss from 4.3.0 to 4.3.2 (#21) (d7db6af)
- **deps:** bump react-dom from 19.2.4 to 19.2.7 (#18) (bcde425)
- **deps-dev:** bump tsx from 4.22.5 to 4.23.0 (#17) (e3608e5)
- **deps-dev:** bump eslint-config-next from 16.2.9 to 16.2.10 (#15) (ccd88c9)
- **deps-dev:** bump @types/node from 20.19.43 to 26.1.0 (#14) (35dd196)
- **deps-dev:** bump @playwright/test from 1.60.0 to 1.61.1 (#13) (3a373c6)
- **deps-dev:** bump vitest from 4.1.8 to 4.1.10 (#11) (192b2e0)
- **deps:** bump next from 16.2.9 to 16.2.10 (#8) (845772c)
- **deps:** bump react from 19.2.4 to 19.2.7 (#12) (c7e5cbd)
- **deps-dev:** bump @tailwindcss/postcss from 4.3.0 to 4.3.2 (#10) (448b1e0)
- **deps:** bump ethers from 6.16.0 to 6.17.0 (#9) (c4b86b1)
- **deps-dev:** bump @lhci/cli from 0.14.0 to 0.15.1 (#7) (85876f5)
- **deps-dev:** bump tsx from 4.22.4 to 4.22.5 (#6) (781cc22)

### ✅ Tests

- reach 100% statement and branch coverage (02770ec)

## [1.6.0](../../compare/v1.5.0...v1.6.0) (2026-06-27)

### 🚀 Features

- **deck:** embed YouTube walkthrough and add final slide Pitch Video link (bf4c429)

## [1.5.0](../../compare/v1.4.0...v1.5.0) (2026-06-27)

### 🚀 Features

- **docs:** update pitch video link to actual YouTube URL (93de4d2)

## [1.4.0](../../compare/v1.3.1...v1.4.0) (2026-06-27)

### 🚀 Features

- **ui:** map raw source IDs to Bloomberg, Reuters, and Binance in reasoning logs (2d9c8f6)

## [1.3.1](../../compare/v1.3.0...v1.3.1) (2026-06-27)

### 🐛 Bug Fixes

- **ui:** resolve collapsed layout for reputation over time bars (6ae2c55)

## [1.3.0](../../compare/v1.2.0...v1.3.0) (2026-06-27)

### 🚀 Features

- **ui:** use brand icon.svg logo in top left (3d5b98f)

### 💄 Style

- **pitch:** replace custom SVGs with premium icon.svg, remove globe emoji (bed880d)
- **pitch:** redesign conclusion buttons with premium glowing glassmorphism theme (b794db7)

### 📝 Documentation

- **pitch:** update Slide 12 Live Website links to match custom edycu.dev domains from README (ec65d77)
- **pitch:** add live website and github codebase links on conclusion slide (5bfc9ab)
- **pitch:** update Slide 8 to display full hashes and links to cspr.live (a8e6930)

## [1.2.0](../../compare/v1.1.0...v1.2.0) (2026-06-27)

### 🚀 Features

- **casper:** support loading raw PEM key from environment variable (bec21c2)

### 📝 Documentation

- adjust logo width in README (acb9413)
- move referenced design documents to docs root (33761b7)

### 🔧 Chores

- re-trigger ci run with corrected token (6dda1fe)
- trigger ci run with new secrets (ef56e85)

## [1.1.0](../../compare/HEAD~50...v1.1.0) (2026-06-27)

### 🚀 Features

- initial commit of Verity reputation-scored RWA oracle engine (d5ffb63)

### 🐛 Bug Fixes

- **contract:** use abs_diff to resolve manual_abs_diff clippy warning (7ac037c)

