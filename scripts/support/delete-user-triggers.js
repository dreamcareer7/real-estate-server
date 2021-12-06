#!/usr/bin/env node

const { runInContext } = require('../../lib/models/Context/util')
const Trigger = {
  ...require('../../lib/models/Trigger/filter'),
  ...require('../../lib/models/Trigger/delete'),
}
const Flow = {
  ...require('../../lib/models/Flow/filter'),
  ...require('../../lib/models/Flow/stop')
}

const brandId = process.argv[2]
const userId = process.argv[3]

runInContext(`delete-user-triggers-${new Date().toLocaleTimeString('en-us')}`, async () => {
  const flowIds = await Flow.filter({ brand: brandId, created_by: userId })
  for (let i = 0; i < flowIds.length; i++) {
    await Flow.stop(userId, flowIds[i])
  }
  const triggers = await Trigger.filter({
    brand: brandId,
    created_by: userId,
    deleted_at: null
  })
  await Trigger.delete(triggers, userId)
})
