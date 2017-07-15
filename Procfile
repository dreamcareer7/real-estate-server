web:     node_modules/forever/bin/forever start --colors index.js
workers: node_modules/forever/bin/forever start --colors scripts/workers.js
google:  node_modules/forever/bin/forever scripts/geocoding/google_update_latlong.js
bing:    node_modules/forever/bin/forever scripts/geocoding/bing_update_latlong.js
ntreis:  node_modules/forever/bin/forever start --colors scripts/mls/schedule.js