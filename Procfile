web:     node_modules/pm2/bin/pm2 start index.js
workers: node_modules/pm2/bin/pm2 start scripts/workers.js
ntreis:  node_modules/pm2/bin/pm2 start scripts/ntreis/update.js -e -p -r
google:  node_modules/pm2/bin/pm2 start scripts/geocoding/google_update_latlong.js
bing:    node_modules/pm2/bin/pm2 start scripts/geocoding/bing_update_latlong.js
docs:    npm run-script docs