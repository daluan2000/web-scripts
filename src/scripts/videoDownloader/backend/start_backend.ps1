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
    Write-Host "Installing backend dependencies..."
    & $VenvPython -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies."
    }
}

$EnvironmentFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot ".env.example") -Destination $EnvironmentFile
    Write-Host "Created .env from .env.example"
}

Write-Host "Starting Video Downloader backend with app\main.py"
& $VenvPython (Join-Path $PSScriptRoot "app\main.py")
exit $LASTEXITCODE
