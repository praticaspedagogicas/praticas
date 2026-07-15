#!/bin/bash
cd "$(dirname "$0")" || exit 1
PORT=8000
python3 -m http.server "$PORT" >/tmp/debrief_v41_forms_http.log 2>&1 &
SERVER_PID=$!
sleep 1
open "http://localhost:${PORT}/?v=forms-$(date +%s)"
wait "$SERVER_PID"
