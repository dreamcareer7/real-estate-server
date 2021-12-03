#!/usr/bin/env node

const { runInContext } = require('../../lib/models/Context/util')
const Trigger = {
  ...require('../../lib/models/Trigger/filter'),
  ...require('../../lib/models/Trigger/delete'),
}

const brandId = process.argv[2]
const userId = process.argv[3]

runInContext(`delete-user-triggers-${new Date().toLocaleTimeString('en-us')}`, async () => {
  const triggers = await Trigger.filter({
    brand: brandId,
    created_by: userId,
    deleted_at: null
  })
  await Trigger.delete(triggers, userId)
})
