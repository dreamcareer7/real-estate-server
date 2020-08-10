const { expect } = require('../../../utils/validator')
const db = require('../../../utils/db')
const Context = require('../../Context')

const insertContext = async ({deal, definition, value, user, approved, checklist}) => {
  expect(checklist).to.be.uuid

  try {
    await db.query.promise('deal/context/insert', [
      definition,
      deal,
      user,
      checklist,
      Boolean(approved),
      value
    ])

  } catch(e) {
    Context.log(e)
    throw new Error.Validation(`Cannot save ${definition}:${value}`)
  }
}

const saveContext = async ({deal, user, context}) => {
  for (const item of context) {
    expect(item).to.be.an('object')

    const { value, approved, checklist, definition } = item
    const c = {
      definition,
      value,
      approved,
      deal,
      user,
      checklist
    }

    await insertContext(c)
  }
}

const setContextApproval = ({context, approved, user}, cb) => {
  db.query('deal/context/set_approved', [
    context,
    approved,
    user
  ], cb)
}

module.exports = {
  saveContext,
  setContextApproval
}
