[CmdletBinding()]
param(
    [switch]$SkipDependencyInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

$VenvDirectory = Join-Path $PSScriptRoot ".venv"
$VenvPython = Join-Path $VenvDirectory "Scripts\python.exe"
$CreatedVenv = $false

if (-not (Test-Path -LiteralPath $VenvPython -PathType Leaf)) {
    $SystemPython = Get-Command python -ErrorAction Stop
    Write-Host "Creating virtual environment: $VenvDirectory"
    & $SystemPython.Source -m venv $VenvDirectory
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the Python virtual environment."
    }
    $CreatedVenv = $true
}

if ($CreatedVenv -or -not $SkipDependencyInstall) {
    Write-Host "Installing packaging dependencies..."
    & $VenvPython -m pip install -r (Join-Path $PSScriptRoot "requirements-build.txt")
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install packaging dependencies."
    }
}

$DistDirectory = Join-Path $PSScriptRoot "dist"
$BuildDirectory = Join-Path $PSScriptRoot "build"
$EntryPoint = Join-Path $PSScriptRoot "app\main.py"

Write-Host "Packaging Video Downloader backend..."
& $VenvPython -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --name "video-downloader-backend" `
    --distpath $DistDirectory `
    --workpath $BuildDirectory `
    --specpath $PSScriptRoot `
    --collect-all "yt_dlp" `
    --collect-submodules "uvicorn" `
    $EntryPoint

if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller packaging failed."
}

$Executable = Join-Path $DistDirectory "video-downloader-backend.exe"
if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
    throw "Packaging completed without producing the expected executable: $Executable"
}

Copy-Item `
    -LiteralPath (Join-Path $PSScriptRoot ".env.example") `
    -Destination (Join-Path $DistDirectory ".env.example") `
    -Force

Write-Host "Package created: $Executable"
