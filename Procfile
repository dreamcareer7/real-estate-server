web:     npx pm2 start index.js -i $CLUSTER_WORKERS && npx pm2 logs --raw
workers_common: npx pm2 start scripts/workers/pm2/workers-common.config.yaml && npx pm2 logs --raw
workers_scalable: npx pm2 start scripts/workers/pm2/workers-scalable.config.yaml && npx pm2 logs --raw
workers: npx pm2 start scripts/workers/pm2/workers-non-scalable.config.yaml && npx pm2 logs --raw
pollers: npx pm2 start scripts/workers/pm2/pollers.config.yaml && npx pm2 logs --raw
workers_singular: npx pm2 start scripts/workers/index.js && npx pm2 logs --raw
ntreis:  npx pm2 start scripts/mls/schedule.js && npx pm2 logs --raw
