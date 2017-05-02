web:     node_modules/forever/bin/forever index.js
workers: node_modules/forever/bin/forever scripts/workers.js
ntreis:  node_modules/forever/bin/forever scripts/mls/schedule.js
google:  node_modules/forever/bin/forever scripts/geocoding/google_update_latlong.js
bing:    node_modules/forever/bin/forever scripts/geocoding/bing_update_latlong.js
docs:    NODE_ENV=development npm i && NODE_ENV=production npm run-script docs