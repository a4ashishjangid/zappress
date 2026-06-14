# =============================================================
#  ZapPress — Release Packager
#  Usage:  .\package-plugin.ps1
#          .\package-plugin.ps1 -Version "1.2.0"
#          .\package-plugin.ps1 -SkipBuild
# =============================================================

param (
    [string] $Version    = "",       # Override version (optional)
    [switch] $SkipBuild  = $false,   # Skip npm build step
    [switch] $NoDev      = $false    # Strip src/ from zip as well
)

# ── Config ────────────────────────────────────────────────────
$PluginSlug   = "zappress"
$PluginFile   = "zappress.php"
$AdminDir     = "admin"
$ReleasesDir  = "releases"

# ── Resolve version ──────────────────────────────────────────
if ($Version -eq "") {
    # Auto-read from plugin header
    $header  = Get-Content $PluginFile -Raw
    if ($header -match "Version:\s+([\d.]+)") {
        $Version = $Matches[1]
    } else {
        $Version = "1.0.0"
    }
}

$ZipName = "$PluginSlug-v$Version.zip"
$OutPath  = "$ReleasesDir\$ZipName"

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "  ZapPress — Packager"          -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "  Version  : v$Version"
Write-Host "  Output   : $OutPath"
Write-Host ""

# ── Step 1: Build front-end assets ───────────────────────────
if (-not $SkipBuild) {
    Write-Host "[1/4] Building React admin UI..." -ForegroundColor Yellow
    Push-Location $AdminDir
    npm run build
    $buildResult = $LASTEXITCODE
    Pop-Location

    if ($buildResult -ne 0) {
        Write-Host "`n  ERROR: npm build failed. Aborting." -ForegroundColor Red
        exit 1
    }
    Write-Host "      Build complete." -ForegroundColor Green
} else {
    Write-Host "[1/4] Skipping build (--SkipBuild flag set)." -ForegroundColor DarkGray
}

# ── Step 2: Create releases directory ────────────────────────
Write-Host "[2/4] Preparing releases directory..." -ForegroundColor Yellow
if (-not (Test-Path $ReleasesDir)) {
    New-Item -ItemType Directory -Path $ReleasesDir | Out-Null
}

# Remove previous zip for same version if exists
if (Test-Path $OutPath) {
    Remove-Item $OutPath -Force
    Write-Host "      Removed old zip: $ZipName" -ForegroundColor DarkGray
}

# ── Step 3: Collect files to include ─────────────────────────
Write-Host "[3/4] Collecting plugin files..." -ForegroundColor Yellow

# Temp staging folder
$TempDir = "$env:TEMP\$PluginSlug-release"
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir\$PluginSlug" | Out-Null

$Dest = "$TempDir\$PluginSlug"

# ✅ Files & folders to INCLUDE
$Includes = @(
    "zappress.php",
    "readme.txt",
    "includes",
    "admin\build",
    "admin\class-zappress-admin.php"
)

foreach ($item in $Includes) {
    if (-not (Test-Path $item)) {
        Write-Host "      SKIP (not found): $item" -ForegroundColor DarkGray
        continue
    }

    $destItem = Join-Path $Dest $item

    if (Test-Path $item -PathType Container) {
        # It's a directory — copy recursively
        $destParent = Split-Path $destItem -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }
        Copy-Item $item -Destination $destItem -Recurse -Force
        Write-Host "      + $item\" -ForegroundColor White
    } else {
        # It's a file
        $destParent = Split-Path $destItem -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }
        Copy-Item $item -Destination $destItem -Force
        Write-Host "      + $item" -ForegroundColor White
    }
}

# ── Step 4: Compress into zip ────────────────────────────────
Write-Host "[4/4] Creating zip archive..." -ForegroundColor Yellow

Compress-Archive -Path "$TempDir\$PluginSlug" -DestinationPath $OutPath -CompressionLevel Optimal
Remove-Item $TempDir -Recurse -Force

# ── Done ─────────────────────────────────────────────────────
$ZipSize = [math]::Round((Get-Item $OutPath).Length / 1MB, 2)

Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "  Package ready!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host "  File  : $OutPath"
Write-Host "  Size  : $ZipSize MB"
Write-Host ""
Write-Host "  Install via: WordPress Admin → Plugins → Add New → Upload Plugin" -ForegroundColor Cyan
Write-Host ""
