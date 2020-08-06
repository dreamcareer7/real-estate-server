const db = require('../../../utils/db.js')


const get = async id => {
  const submissions = await getAll([id])

  if (submissions.length < 1) {
    throw Error.ResourceNotFound(`Submission ${id} not found`)
  }

  return submissions[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('form/submission/get', [ids])

  return rows
}

const getRevision = async id => {
  const revisions = await getAllRevisions([id])

  if (revisions.length < 1) {
    throw Error.ResourceNotFound(`Submission revision ${id} not found`)
  }

  return revisions[0]
}

const getAllRevisions = async revisions => {
  const { rows } = await db.query.promise('form/submission/get_revision', [
    revisions
  ])

  return rows
}


module.exports = {
  get,
  getAll,
  getRevision,
  getAllRevisions
}