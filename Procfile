web:     npx pm2 start index.js -i $CLUSTER_WORKERS && npx pm2 logs --raw
workers: npx pm2 start scripts/workers/ecosystem.config.yaml && npx pm2 logs --raw
workers_singular: npx pm2 start scripts/workers/singular.js && npx pm2 logs --raw
ntreis:  npx pm2 start scripts/mls/schedule.js && npx pm2 logs --raw
