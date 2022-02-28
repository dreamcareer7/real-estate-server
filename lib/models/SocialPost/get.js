const db = require('../../utils/db')
const { filter } = require('./filter')

/**
 * @param {UUID[]} ids
 * @typedef {import('./types').Post} Post
 * @returns {Promise<Post[]>}
 */
const getAll = async (ids) => {
  return db.select('social_post/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<Post>}
 */
const get = async (id) => {
  const posts = await getAll([id])

  if (posts.length < 1) throw Error.ResourceNotFound(`social post ${id} not found`)

  return posts[0]
}

/**
 * Get all social posts assigned to current brand
 * @param {UUID} brand - brand id
 * @typedef {import('./types').Filter} Filter
 * @param {Filter} filter options
 * @returns {Promise<Post[]>}
 */

const getByBrand = async (brand, { user, executed, start, limit }) => {  
  const result = await filter(brand, { user, executed, start, limit })
  if (!result.total) {
    return []
  }

  const posts = await getAll(result.ids)

  // @ts-ignore
  posts[0].total = result.total
  return posts
}

module.exports = {
  get,
  getAll,
  getByBrand,
}
