web:     node_modules/forever/bin/forever start index.js
workers: node_modules/forever/bin/forever start scripts/workers.js
ntreis:  node_modules/forever/bin/forever start scripts/ntreis/update.js -e -p -r
google:  node_modules/forever/bin/forever start scripts/geocoding/google_update_latlong.js
bing:    node_modules/forever/bin/forever start scripts/geocoding/bing_update_latlong.js
docs:    npm run-script docs