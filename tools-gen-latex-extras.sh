#!/bin/bash
set -e
cd "$(dirname "$0")"

SRC=_vendor/latex-css/latex.css
OUT=assets/css/latex-extras.scss
# The palette (latex.css :root and .latex-dark) lives here, at :root, so the
# theme switcher can swap it. Nothing below may redeclare those variables.
PALETTE=assets/css/site.scss

{
  echo '---'
  echo '---'
  sed -n '1,26p' "$SRC"
  echo
  echo '/* Custom properties are not declared here — see assets/css/site.scss. */'
  echo '.latex-extras.latex-extras {'
  # figcaption and caption are incremented but never reset upstream either, so
  # every figure and table renders as number 1. Reset them alongside the rest.
  echo '  counter-reset: theorem definition sidenote-counter figcaption caption;'
  echo
  echo '  table { display: table; }'
  echo '  table tr { background-color: transparent; border-top: 0; }'
  echo '  table tr:nth-child(2n) { background-color: transparent; }'
  echo '  table th, table td { border: 0; }'
  echo
  sed -n '242,260p;262,276p;340,480p;482,496p;522,585p;587,609p;615,689p;694,700p;702,710p' "$SRC" \
    | sed 's/^\.indent-pars/\&.indent-pars/' | sed 's/^./  &/'
  echo
  echo '  table:not(.borders-custom) > thead > tr > th {'
  echo '    border-bottom: var(--border-width-thin) solid var(--table-border-color);'
  echo '  }'
  echo '}'
  echo
  echo '.latex-page.latex-page {'
  echo '  max-width: 80ch;'
  echo '  line-height: 1.8;'
  echo '  word-break: keep-all;'
  echo '  overflow-wrap: break-word;'
  echo '}'
} > "$OUT"

echo "generated $OUT ($(wc -l < "$OUT") lines)"
echo
echo "=== variables referenced here but not defined in $PALETTE ==="
grep -o 'var(--[a-z-]*)' "$OUT" | sort -u | sed 's/var(//;s/)//' | while read -r v; do
  grep -q -- "  $v:" "$PALETTE" || echo "MISSING: $v"
done
echo "(nothing above = all defined)"
echo
echo "=== body-scoped selectors (would break under nesting) ==="
grep -n '^\s*body' "$OUT" || echo "(none)"
