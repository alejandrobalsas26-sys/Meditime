#!/usr/bin/env bash
# generate-assets.sh — MediTime PRO
# Generates all Android and iOS icons and splash screens via @capacitor/assets.
# Usage: bash generate-assets.sh

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()  { echo -e "\n${CYAN}▶ $*${NC}"; }

# ── Source asset paths (relative to project root) ────────────────────────────
ICON_SRC="assets/icon.png"
SPLASH_SRC="assets/splash.png"

# Minimum recommended dimensions
MIN_ICON_DIM=1024
MIN_SPLASH_DIM=2732

# ── 1. Pre-flight: verify source files exist ──────────────────────────────────
step "Verifying source assets"

if [[ ! -f "$ICON_SRC" ]]; then
  error "Missing: $ICON_SRC"
  error "Provide a square PNG of at least ${MIN_ICON_DIM}×${MIN_ICON_DIM} px with no transparency."
  exit 1
fi
info "Found $ICON_SRC"

if [[ ! -f "$SPLASH_SRC" ]]; then
  error "Missing: $SPLASH_SRC"
  error "Provide a PNG of at least ${MIN_SPLASH_DIM}×${MIN_SPLASH_DIM} px."
  exit 1
fi
info "Found $SPLASH_SRC"

# ── 2. Optional dimension check via ImageMagick ───────────────────────────────
if command -v identify &>/dev/null; then
  step "Checking image dimensions (ImageMagick)"

  ICON_W=$(identify -format "%w" "$ICON_SRC" 2>/dev/null || echo 0)
  ICON_H=$(identify -format "%h" "$ICON_SRC" 2>/dev/null || echo 0)
  SPLASH_W=$(identify -format "%w" "$SPLASH_SRC" 2>/dev/null || echo 0)
  SPLASH_H=$(identify -format "%h" "$SPLASH_SRC" 2>/dev/null || echo 0)

  if (( ICON_W < MIN_ICON_DIM || ICON_H < MIN_ICON_DIM )); then
    error "$ICON_SRC must be at least ${MIN_ICON_DIM}×${MIN_ICON_DIM} px (got ${ICON_W}×${ICON_H})."
    exit 1
  fi
  info "icon.png  — ${ICON_W}×${ICON_H} px  ✓"

  if (( SPLASH_W < MIN_SPLASH_DIM || SPLASH_H < MIN_SPLASH_DIM )); then
    warn "$SPLASH_SRC is smaller than recommended ${MIN_SPLASH_DIM}×${MIN_SPLASH_DIM} px (got ${SPLASH_W}×${SPLASH_H})."
    warn "Generation will continue, but edge crops may appear on large devices."
  else
    info "splash.png — ${SPLASH_W}×${SPLASH_H} px  ✓"
  fi
else
  warn "ImageMagick not found — skipping dimension validation."
  warn "Install it with: brew install imagemagick  or  apt-get install imagemagick"
fi

# ── 3. Verify native project folders exist ────────────────────────────────────
step "Checking native project folders"
MISSING_PLATFORMS=()

if [[ ! -d "ios" ]]; then
  MISSING_PLATFORMS+=("ios")
  warn "ios/ folder not found. Run: npx cap add ios"
fi

if [[ ! -d "android" ]]; then
  MISSING_PLATFORMS+=("android")
  warn "android/ folder not found. Run: npx cap add android"
fi

if [[ ${#MISSING_PLATFORMS[@]} -eq 2 ]]; then
  error "Neither ios/ nor android/ project folders exist."
  error "Run 'npx cap add ios' and/or 'npx cap add android' first, then re-run this script."
  exit 1
fi

for p in "${MISSING_PLATFORMS[@]}"; do
  warn "Assets for $p will be skipped (folder missing)."
done

# ── 4. Ensure @capacitor/assets is installed ─────────────────────────────────
step "Checking @capacitor/assets"

if [[ ! -d "node_modules/@capacitor/assets" ]]; then
  info "@capacitor/assets not found in node_modules — installing..."
  npm install --save-dev @capacitor/assets
  info "@capacitor/assets installed."
else
  PKG_VERSION=$(node -p "require('./node_modules/@capacitor/assets/package.json').version" 2>/dev/null || echo "unknown")
  info "@capacitor/assets@${PKG_VERSION} found."
fi

# ── 5. Generate assets ────────────────────────────────────────────────────────
step "Generating icons and splash screens"

npx @capacitor/assets generate \
  --iconBackgroundColor      '#0D9488' \
  --iconBackgroundColorDark  '#0D9488' \
  --splashBackgroundColor    '#F0FDFA' \
  --splashBackgroundColorDark '#0D9488'

# ── 6. Post-generation summary ────────────────────────────────────────────────
step "Done"
info "All assets generated successfully."
echo ""
echo "  Next steps:"
echo "  1. Review generated files in ios/ and android/ inside your IDE."
echo "  2. Run:  npx cap sync"
echo "  3. Rebuild the native project in Xcode / Android Studio."
echo ""
