const { get } = require('../Facebook/pages/get')
const { get: getSocialPost } = require('./get')
/**
 * @param {Object} obj 
 * @param {UUID} obj.facebookPage - facebook_page id
 * @param {UUID} obj.brand - brand id 
 * @returns {Promise<boolean>}
 */
const hasAccessForCreate = async ({ facebookPage, brand }) => {
  // for some reason that I don't know, we can not check access control over the template instanceID
  const dbFacebookPage = await get(facebookPage)
  return dbFacebookPage.brand === brand    
}

/**
 * @param {Object} obj 
 * @param {UUID} obj.id - social_post id
 * @param {UUID} obj.brand - brand id 
 * @returns {Promise<boolean>}
 */
const hasAccessForUpdate = async ({ id, brand }) => {  
  const socialPost = await getSocialPost(id)
  return socialPost.brand === brand    
}

const hasAccessForDelete = async ({ id, brand }) => {
  const socialPost = await getSocialPost(id)
  return socialPost.brand === brand     
}

module.exports = {
  hasAccessForCreate,
  hasAccessForUpdate,
  hasAccessForDelete
}
