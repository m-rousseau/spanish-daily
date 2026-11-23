#!/usr/bin/env bash
# Runs on Marc's Mac (launchd, daily): copies the server's nightly backups off the server,
# so a failed server disk loses nothing. Tries the home network first, then Tailscale.
set -uo pipefail
DEST="$HOME/Backups/espanol-diario"
mkdir -p "$DEST"
for host in slave-lan slave-tailscale; do
  if rsync -a --timeout=30 -e "ssh -o BatchMode=yes -o ConnectTimeout=10" "$host:espanol-diario/backups/data-*.tgz" "$DEST/"; then
    # Keep the newest 90 copies here.
    ls -1t "$DEST"/data-*.tgz 2>/dev/null | tail -n +91 | xargs -r rm --
    echo "$(date -Iseconds) pulled from $host: $(ls -1 "$DEST" | wc -l | tr -d ' ') archives"
    exit 0
  fi
done
echo "$(date -Iseconds) FAILED: server unreachable" >&2
exit 1
