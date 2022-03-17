const db = require('../../../utils/db.js')
const { decrypt } = require('../../../utils/kms')
const Context = require('../../Context')
/**
 * @param {UUID[]} ids
 * @typedef {import('../types').FacebookCredential} FacebookCredential 
 * @returns {Promise<FacebookCredential[]>}
 */
const getAll = async (ids) => {
  let recs = await db.select('facebook/facebook_credentials/get', [ids])
  if (recs && recs.length) {
    recs = recs.map(async (row) => {
      // we might as well use Promise.all to prevent async command in this loop
      // however we won't have a large number of records here hopefully :) 
      Context.log(`decrypt access token '${row.access_token}'`)   
      const decryptedToken = await decrypt(row.access_token)
      return {...row, access_token: decryptedToken }
    })
  }
  return recs
}


module.exports = getAll