web:     node_modules/forever/bin/forever index.js
workers: node_modules/forever/bin/forever scripts/workers.js
ntreis:  node_modules/forever/bin/forever scripts/ntreis/update.js --all --limit 20000
google:  node_modules/forever/bin/forever scripts/geocoding/google_update_latlong.js
bing:    node_modules/forever/bin/forever scripts/geocoding/bing_update_latlong.js
docs:    npm run-script docs