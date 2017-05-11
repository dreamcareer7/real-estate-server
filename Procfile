web:     npm install node-nightly && node_modules/node-nightly/cli.js && npm rebuild --nodedir=node_modules/node-nightly/node-nightly && node_modules/node-nightly/node-nightly/bin/node index.js
workers: npm install node-nightly && node_modules/node-nightly/cli.js && npm rebuild --nodedir=node_modules/node-nightly/node-nightly && node_modules/node-nightly/node-nightly/bin/node scripts/workers.js
google:  node_modules/forever/bin/forever scripts/geocoding/google_update_latlong.js
bing:    node_modules/forever/bin/forever scripts/geocoding/bing_update_latlong.js
docs:    NODE_ENV=development npm i && NODE_ENV=production npm run-script docs
ntreis:  node_modules/forever/bin/forever scripts/mls/schedule.js