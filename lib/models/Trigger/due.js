const db = require('../../utils/db')

const Context = require('../Context')

const { execute } = require('./worker')

const getDueTriggers = () => {
  return db.selectIds('trigger/due')
}

const executeDue = async () => {
  const due = await getDueTriggers()

  for (const id of due) {
    await execute(id)
    Context.log(`Trigger ${id} was queued for execution`)
  }
}

module.exports = {
  getDueTriggers,
  executeDue,
}
