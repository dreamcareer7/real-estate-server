const db = require('../../../utils/db')


/**
 * @param {UUID=} brand_id
 * @param {IBrandListInput[]} lists 
 */
const createAll = async (brand_id, lists) =>{
  return db.selectIds('brand/list/create', [
    brand_id,
    JSON.stringify(lists)
  ])
}


module.exports = {
  createAll
}