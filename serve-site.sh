#!/bin/bash
cd "$(dirname "$0")"

RUBY_BIN="$(brew --prefix ruby)/bin"
if [ ! -x "$RUBY_BIN/bundle" ]; then
  echo "Homebrew ruby not found. Run: brew install ruby"
  exit 1
fi
export PATH="$RUBY_BIN:$PATH"

# -sTCP:LISTEN matters: a bare `lsof -ti tcp:$PORT` also matches *clients*
# connected to the port, so any browser tab still holding a keep-alive socket to
# a long-dead server would look like the port was occupied.
for PORT in 4000 35729; do
  PIDS=$(lsof -ti tcp:$PORT -sTCP:LISTEN 2>/dev/null)
  for PID in $PIDS; do
    if ps -p "$PID" -o command= | grep -qi 'jekyll\|ruby'; then
      echo "clearing stale jekyll on port $PORT (pid $PID)"
      kill "$PID" 2>/dev/null
    else
      echo "port $PORT is used by a non-jekyll process (pid $PID). Stop it first."
      exit 1
    fi
  done
done
sleep 1

bundle config set --local path vendor/bundle >/dev/null
bundle check >/dev/null 2>&1 || bundle install

# _config.yml mirrors what GitHub Pages derives for a user site, so paths here
# match production exactly. Do not override --baseurl — that only hides baseurl
# bugs until they are deployed.
echo
echo "Jekyll site -> http://localhost:4000/  (same paths as production)"
echo "Stop with Ctrl+C"
bundle exec jekyll serve --livereload
