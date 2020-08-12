const db = require('../../../utils/db')

/**
 * @param {number[]} ids 
 * @returns {Promise<IContactDuplicateCluster[]>}
 */
async function getAll(ids) {
  return db.select('contact/duplicate/get', [ ids ])
}

async function get(id) {
  const [cluster] = await getAll([id])

  if (!cluster) throw Error.ResourceNotFound(`Cluster ${id} was not found.`)

  return cluster
}

module.exports = {
  getAll,
  get,
}
