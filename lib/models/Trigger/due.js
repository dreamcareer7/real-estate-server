const db = require('../../utils/db')

const { execute } = require('./worker')

const getDueTriggers = () => {
  return db.selectIds('trigger/due')
}

const executeDue = async () => {
  const due = await getDueTriggers()

  for (const id of due)
    await execute(id)
}

module.exports = {
  getDueTriggers,
  executeDue,
}
