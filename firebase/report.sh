#!/usr/bin/env bash
# Runs a command; if it fails, turns the last lines of its output into GitHub annotations
# (they can be read without access to the full job logs).
title="$1"; shift
log="$(mktemp)"
if "$@" >"$log" 2>&1; then cat "$log"; exit 0; fi
code=$?
cat "$log"
grep -v '^\s*$' "$log" | tail -n 25 | sed -E 's/%/%25/g' | while IFS= read -r line; do echo "::error title=$title::${line:0:400}"; done
exit $code
