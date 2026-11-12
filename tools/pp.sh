#!/bin/sh
# usage: tools/pp.sh [filter] [big] [stages e.g. 6,8]   -> rebuilds the preview served on :8765
node "$(dirname "$0")/plant_preview.mjs" "$TEMP/plantsite/index.html" "$1" "$2" "$3"
