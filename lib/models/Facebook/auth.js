const sdk = require('./facebook-sdk')
const Context = require('../Context')
const upsertFacebook = require('./credentials/upsert')
const upsertInstagrams = require('./pages/upsert_many')
const { FacebookPageIsNotConnectedException, InstagramAccountIsNotConnectedException, EmptyCodeException, UnknownOauthException, UnauthorizedException, FacebookError } = require('./errors')
const { scope } = require('./constants')
const Url = require('../Url')

const getRedirectionLink = ({ type, msg } = {type: undefined, msg: undefined }) => {
  let query
  if (type) {
    query = {
      error: type,
    }

    if (msg) {
      query = {
        ...query,
        msg,
      }
    }     
  }  
  const url = Url.web({ uri: '/api/facebook/auth-result', query })
  return url
}


const auth = async ({ error, code, state }) => {
  try {
    Context.log(`start getting user information from facebook with code = ${code} & error = ${error} & state = ${state}`)   
    if (error) {    
      throw new UnknownOauthException(error)
    }
  
    if (!code) {
      throw new EmptyCodeException()
    }
    
    Context.log('validate and parse state')   
    const {isValid, userId, brandId } = sdk.validateAndParseState(state)
    
    if (
      !isValid
    ) {      
      throw new UnauthorizedException()
    }   
  
    const access_token = await sdk.getAccessToken({code}) 
    
    const fb = sdk.init({accessToken: access_token})
    
    const facebookProfile = await fb.getFacebookProfile()  
  
    const facebookPages = await fb.getPages() 
  
    if (!facebookPages.length) {
      throw new FacebookPageIsNotConnectedException()
    }
  
    const instagramAccounts = []
    for (let i = 0; i < facebookPages.length; i++) {
      const page = facebookPages[i]
      const igID = await fb.getInstagramId({ pageId: page.id })
     
      if (igID) {      
        const res = await fb.getInstagramInfo({
          igID,        
        })
  
        instagramAccounts.push({
          access_token: page.access_token,
          name: page.name,
          facebook_page_id: page.id,
          instagram_business_account_id: res.id,
          instagram_username: res.username,
          instagram_profile_picture_url: res.profile_picture_url        
        })
      }
    }
    
    if (!instagramAccounts.length) {
      throw new InstagramAccountIsNotConnectedException()
    }
    
    Context.log('creating facebook credential') 

    const facebookId = await upsertFacebook({
      brand: brandId,
      user: userId,
      facebook_email: facebookProfile.email,
      first_name: facebookProfile.first_name,
      last_name: facebookProfile.last_name,
      scope,
      facebook_id: facebookProfile.id,
      access_token: access_token
    })
    
    Context.log('creating facebook pages') 
    
    await upsertInstagrams({
      facebookCredentialId: facebookId,
      instagramAccounts
    }) 
    
    return getRedirectionLink()
  } catch (error) {
    Context.log('Error on getting facebook credential')
    Context.log(error)
    let type = 'Unknown'
    let msg = ''
    if (error instanceof FacebookError) {      
      type = error.code
      msg = error.message
    } 
    return getRedirectionLink({ type, msg })
  }
    
}

module.exports = auth
