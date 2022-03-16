const { get } = require('../Facebook/pages/get')
/**
 * @param {Object} obj 
 * @param {UUID} obj.facebookPage - facebook_page id
 * @param {UUID} obj.brand - brand id 
 * @returns {Promise<boolean>}
 */
const hasAccessForCreate = async ({ facebookPage, brand }) => {  
  const dbFacebookPage = await get(facebookPage)
  return dbFacebookPage.brand === brand    
}

/**
 * @param {Object} obj 
 * @param {import('./types').Post} obj.socialPost 
 * @param {UUID} obj.brand - brand id 
 * @returns {boolean}
 */
const hasAccessForUpdate = ({ socialPost, brand }) => {    
  return socialPost.brand === brand    
}

/**
 * @param {Object} obj 
 * @param {import('./types').Post} obj.socialPost 
 * @param {UUID} obj.brand - brand id 
 * @returns {boolean}
 */

const hasAccessForDelete = ({ socialPost, brand }) => {    
  return socialPost.brand === brand    
}

module.exports = {
  hasAccessForCreate,
  hasAccessForUpdate,
  hasAccessForDelete
}
