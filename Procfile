web:     npx pm2 start index.js -- cluster && npx pm2 logs --raw
workers: npx pm2 start scripts/workers/ecosystem.config.yaml && npx pm2 logs --raw
google:  npx pm2 start scripts/geocoding/google_update_latlong.js
bing:    npx pm2 start scripts/geocoding/bing_update_latlong.js
ntreis:  npx pm2 start scripts/mls/schedule.js
