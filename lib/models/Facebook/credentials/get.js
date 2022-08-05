const getAll = require('./getAll')
/**
 * @param {UUID} id
 */
const get = async (id) => {
  const facebookPages = await getAll([id])
  if (!facebookPages.length) {
    throw Error.ResourceNotFound(`Facebook credential with id ${id} not found`)
  }

  return facebookPages[0]
}

module.exports = get