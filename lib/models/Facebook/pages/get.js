const db = require('../../../utils/db.js')
const { getAll } = require('./getAll')

/**
 * @param {UUID} user
 * @param {UUID} brand
 * @returns {Promise<UUID[]>}
 */
const findByUserBrand = (user, brand) => {
  return db.selectIds('facebook/facebook_pages/get_by_user', [user, brand])
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 * @typedef {import('../types').DBFacebookPage} DBFacebookPage 
 * @returns {Promise<DBFacebookPage[]>}
 */
const getByUser = async (user, brand) => {
  const ids = await findByUserBrand(user, brand)
  
  if (ids.length < 1) {
    return []
  }
  
  return getAll(ids)
}

/**
 * @param {UUID} id  
 * @returns {Promise<DBFacebookPage>}
 */
const get = async (id) => {
  const facebookPages = await getAll([id])
  if (!facebookPages.length) {
    throw Error.ResourceNotFound(`Facebook page with id ${id} not found`)
  }

  return facebookPages[0]
}

module.exports = {
  getByUser,
  get
}
