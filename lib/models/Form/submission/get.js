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

const getServiceUrl = created_at => {
  return created_at && created_at < 1627955983 ? 'https://forms.rechat.com/generate.pdf' : 'https://forms-wahuot5mja-uc.a.run.app/generate.pdf'
}

module.exports = {
  get,
  getAll,
  getRevision,
  getAllRevisions,
  getServiceUrl
}
