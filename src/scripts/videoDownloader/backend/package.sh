#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SKIP_DEPENDENCY_INSTALL=false
for argument in "$@"; do
  case "$argument" in
    --skip-dependency-install)
      SKIP_DEPENDENCY_INSTALL=true
      ;;
    -h|--help)
      echo "Usage: ./package.sh [--skip-dependency-install]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $argument" >&2
      exit 2
      ;;
  esac
done

if [[ -r /proc/version ]] && grep -qi microsoft /proc/version; then
  VENV_DIR="$SCRIPT_DIR/.venv-wsl"
else
  VENV_DIR="$SCRIPT_DIR/.venv"
fi
CREATED_VENV=false

if [[ -n "${VD_PYTHON_COMMAND:-}" ]]; then
  SYSTEM_PYTHON="$VD_PYTHON_COMMAND"
elif command -v python >/dev/null 2>&1; then
  SYSTEM_PYTHON="$(command -v python)"
elif command -v python3 >/dev/null 2>&1; then
  SYSTEM_PYTHON="$(command -v python3)"
else
  echo "Python was not found. Install Python 3 and ensure python or python3 is on PATH." >&2
  exit 1
fi

if [[ -x "$VENV_DIR/bin/python" ]]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
else
  echo "Creating virtual environment: $VENV_DIR"
  "$SYSTEM_PYTHON" -m venv "$VENV_DIR"
  CREATED_VENV=true

  if [[ -x "$VENV_DIR/bin/python" ]]; then
    VENV_PYTHON="$VENV_DIR/bin/python"
  elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
  else
    echo "The virtual environment was created without a usable Python executable." >&2
    exit 1
  fi
fi

if [[ "$CREATED_VENV" == true || "$SKIP_DEPENDENCY_INSTALL" == false ]]; then
  echo "Installing packaging dependencies..."
  "$VENV_PYTHON" -m pip install -r "$SCRIPT_DIR/requirements-build.txt"
fi

DIST_DIR="$SCRIPT_DIR/dist"
BUILD_DIR="$SCRIPT_DIR/build"
ENTRY_POINT="$SCRIPT_DIR/app/main.py"

echo "Packaging Video Downloader backend..."
"$VENV_PYTHON" -m PyInstaller \
  --noconfirm \
  --clean \
  --onefile \
  --name "video-downloader-backend" \
  --distpath "$DIST_DIR" \
  --workpath "$BUILD_DIR" \
  --specpath "$SCRIPT_DIR" \
  --collect-all "yt_dlp" \
  --collect-submodules "uvicorn" \
  "$ENTRY_POINT"

PACKAGE_PATH="$DIST_DIR/video-downloader-backend"
if [[ -f "${PACKAGE_PATH}.exe" ]]; then
  PACKAGE_PATH="${PACKAGE_PATH}.exe"
fi

if [[ ! -f "$PACKAGE_PATH" ]]; then
  echo "Packaging completed without producing the expected executable: $PACKAGE_PATH" >&2
  exit 1
fi

cp "$SCRIPT_DIR/.env.example" "$DIST_DIR/.env.example"
echo "Package created: $PACKAGE_PATH"
