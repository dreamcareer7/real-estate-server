const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('microsoft/mail_folders/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const records = await getAll([id])

  if (records.length < 1) {
    return null
  }

  return records[0]
}

/**
 * @param {UUID} cid credential_id
 */
const getByCredential = async (cid) => {
  const result = await db.selectIds('microsoft/mail_folders/get_by_credential', [cid])

  if ( result.length === 0 ) {
    return null
  }

  return get(result[0])
}


module.exports = {
  getAll,
  get,
  getByCredential
}