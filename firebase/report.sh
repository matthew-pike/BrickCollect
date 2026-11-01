#!/usr/bin/env bash
# Runs a command; if it fails, turns the last lines of its output into GitHub annotations
# (they can be read without access to the full job logs).
title="$1"; shift
log="$(mktemp)"
"$@" >"$log" 2>&1; code=$?
if [ $code -eq 0 ]; then cat "$log"; exit 0; fi
cat "$log"
# GitHub keeps only 10 annotations per step, so send the last 60 lines as 6 annotations of 10 lines each.
grep -v '^\s*$' "$log" | sed -E 's/\x1b\[[0-9;]*m//g' | tail -n 60 | cut -c1-300 | awk -v t="$title" '{ buf = buf (buf ? " ⏎ " : "") $0 } NR % 10 == 0 { gsub(/%/, "%25", buf); print "::error title=" t "::" buf; buf = "" } END { if (buf) { gsub(/%/, "%25", buf); print "::error title=" t "::" buf } }'
exit $code
