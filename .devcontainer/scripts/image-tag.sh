#!/bin/bash
#ddev-generated
# Print the config hash used to tag prebuilt devcontainer images
# (wunderio/ddev-agents-devcontainer:php<PHP>-node<NODE>-<HASH>).
#
# The hash covers the build template and local features, so a project whose
# build config differs from the published one gets no prebuilt match and falls
# back to a local build. Used by both CI and `ddev build-devcontainer`; the
# output must be identical on Linux and macOS.
#
# Usage: image-tag.sh [<devcontainer-dir>]   (defaults to this script's parent)

set -euo pipefail

DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$DIR"

if command -v sha256sum &>/dev/null; then
    SHA256="sha256sum"
else
    SHA256="shasum -a 256"
fi

# Hash path + content of each input file, in a locale-independent order.
# Dotfiles (.DS_Store etc.) are ignored so OS metadata never changes the hash.
{
    echo devcontainer.build.json
    find features -type f ! -name '.*' | LC_ALL=C sort
} | while IFS= read -r f; do
    printf '%s\0' "$f"
    cat "$f"
done | $SHA256 | cut -c1-12
