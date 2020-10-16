const db = require('../../utils/db')

const { execute } = require('./worker')

const getDue = () => {
  return db.selectIds('trigger/due')
}

const executeDue = async () => {
  const due = await getDue()

  for (const id of due)
    await execute(id)
}

module.exports = {
  getDue,
  executeDue,
}
