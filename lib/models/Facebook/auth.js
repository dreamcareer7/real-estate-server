const sdk = require('./facebook-sdk')
const Context = require('../Context')
const url = require('url')
const config      = require('../../config.js')
const AttachedFile = require('../AttachedFile')
const upsertFacebook = require('./credentials/upsert')
const upsertInstagrams = require('./pages/upsert_many')
const { FacebookPageIsNotConnectedException, InstagramAccountIsNotConnectedException, EmptyCodeException, UnknownOauthException, UnauthorizedException, FacebookError } = require('./errors')
const { scope } = require('./constants')
const Slack = require('../Slack')
const Url = require('../Url')
const promisify = require('../../utils/promisify')

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
  // 
  if (config.facebook.webAppHost) {
    return url.format({
      protocol: config.webapp.protocol,
      port: config.webapp.port,
      hostname: config.facebook.webAppHost,
      pathname: '/api/facebook/auth-result',
      query
    })
  }   
  
  return Url.web({ uri: '/api/facebook/auth-result', query })  
}


const auth = async ({ error, code, state }) => {
  Context.log(`getting user information from facebook with code = ${code} & error = ${error} & state = ${state}`)

  const parsedState = sdk.validateAndParseState(state)
  const {isValid, brandId, userId } = parsedState
  
  if (isValid) {
    Context.log(`Facebook state successfully parsed for userId: ${userId} and brandId: ${brandId}`)
  }
  
  try {
       
    if (error) {    
      throw new UnknownOauthException(error)
    }
  
    if (!code) {
      throw new EmptyCodeException()
    }
  
    if (
      !isValid
    ) {      
      throw new UnauthorizedException()
    }   
    
    Context.log(`Trying to obtain Access token for user id '${userId}' and brandId: ${brandId}`)
    const access_token = await sdk.getAccessToken({code}) 
    
    const fb = sdk.init({accessToken: access_token})
    
    Context.log(`Trying to obtain facebook profile  for user id '${userId}' and brandId: ${brandId}`)
    const facebookProfile = await fb.getFacebookProfile()  
    
    Context.log(`Trying to obtain facebook pages for user id '${userId}' and brandId: ${brandId}`)
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
  
        // profile_picture_url get expired after some time for this reason we upload
        // it in our server
        let avatarFile
        if (res.profile_picture_url) {
          Context.log('uploading instagram avatar in our own server')
          avatarFile = await promisify(AttachedFile.saveFromUrl)({
            url: res.profile_picture_url,
            filename: 'profile.jpg',
            relations: [],
            path: `${userId}/instagramAvatars`,
            user: userId,
            public: true,
          })
        }

        instagramAccounts.push({
          access_token: page.access_token,
          name: page.name,
          facebook_page_id: page.id,
          instagram_business_account_id: res.id,
          instagram_username: res.username,
          instagram_profile_picture_url: avatarFile?.url,
          instagram_profile_picture_file: avatarFile?.id,
        })
      }
    }
    
    if (!instagramAccounts.length) {
      throw new InstagramAccountIsNotConnectedException()
    }
    
    Context.log(`creating facebook credential for user id '${userId}' and brandId: ${brandId}`)
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
    
    Context.log(`creating facebook pages for user id '${userId}' and brandId: ${brandId}`)
    await upsertInstagrams({
      facebookCredentialId: facebookId,
      instagramAccounts
    }) 
    
    Slack.send({
      channel: '6-support',
      text: `User with id '${userId}' and facebook email '${facebookProfile.email}' has connected instagram account successfully`,
      emoji: ':busts_in_silhouette:'
    })

    return getRedirectionLink()
  } catch (error) {
    Context.log(`There is a error while connecting instagram account for user '${userId}'`)
    Context.log(error)
    let type = 'Unknown'
    const msg = error.message
    if (error instanceof FacebookError) {      
      type = error.code
    } 

    Slack.send({
      channel: '6-support',
      text: `
      There is a error while connecting instagram account for user '${userId}'
      error code: '${type}'
      error message: ${msg}
      `,
      emoji: ':skull:'
    })

    return getRedirectionLink({ type, msg })
  }
    
}

module.exports = auth
