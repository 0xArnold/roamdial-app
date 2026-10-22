#!/bin/sh
set -eu
node /app/server/init-data.js
exec node /app/server/index.js
