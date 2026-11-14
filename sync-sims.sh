#!/bin/sh
# Copy the simulation kit and every finished simulation into the site, so build/site is
# self-contained. Run it again whenever a scene in ../sims changes or a new one lands.
#
# A scene counts as finished when its folder holds index.html and sim.js. The script writes
# sims/available.js, the list the pages read: a slot whose scene is not listed shows a quiet
# placeholder frame instead.
set -eu
site=$(cd "$(dirname "$0")" && pwd)
build=$(cd "$site/.." && pwd)
# The sources sit next to the site as simkit/ and sims/, or as simkit-src/ and sims-src/ (this review snapshot).
kit="$build/simkit"; [ -d "$kit" ] || kit="$build/simkit-src"
scenes="$build/sims"; [ -d "$scenes" ] || scenes="$build/sims-src"

rm -rf "$site/simkit" "$site/sims"
mkdir -p "$site/simkit" "$site/sims"
# The kit declares Overpass at ../fonts/, which is the site's own fonts/ once it sits in simkit/ here.
# simkit.js and simkit.css are the kit; stills.js and poster.js draw the still plates on the pages.
cp "$kit/simkit.js" "$kit/simkit.css" "$kit/stills.js" "$kit/poster.js" "$site/simkit/"

names=""
for dir in "$scenes"/*/; do
  name=$(basename "$dir")
  if [ -f "$dir/index.html" ] && [ -f "$dir/sim.js" ]; then
    cp -R "$dir" "$site/sims/$name"
    names="$names${names:+, }'$name'"
  fi
done
printf '/* Written by sync-sims.sh: the scenes copied into this site. */\nwindow.VZ_SIMS = [%s];\n' "$names" > "$site/sims/available.js"
echo "simkit copied; scenes: ${names:-none}"
