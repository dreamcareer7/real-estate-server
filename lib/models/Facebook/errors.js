class FacebookError extends Error {  
  constructor(msg, code) {    
    super(msg)
    this.code = code
  }
}
class SocialPostError extends FacebookError {  
  constructor(msg) {    
    super(msg)
    this.code = 'SocialPostException'
  }
}
class FacebookPageIsNotConnectedException extends FacebookError {
  constructor() {
    super('facebook page is not connected', 'FacebookPageIsNotConnected')
  }
}

class InstagramAccountIsNotConnectedException extends FacebookError {
  constructor() {
    super('instagram account is not connected', 'InstagramIsNotConnected')
  }
}

class OAuthFetchingAccessTokenException extends FacebookError {
  constructor() {
    super('error while getting access token', 'OAuthException')
  }
}

class OAuthFetchingPagesException extends FacebookError {
  constructor() {
    super('error while getting pages', 'OAuthException')
  }
}

class OAuthFetchingInstagramIDException extends FacebookError {
  constructor() {
    super('error while getting instagram id', 'OAuthException')
  }
}

class OAuthFetchingInstagramInfoException extends FacebookError {
  constructor() {
    super('error while getting instagram info', 'OAuthException')
  }
}

class OAuthFetchingFacebookProfileException extends FacebookError {
  constructor() {
    super('error in getting facebook profile', 'OAuthException')
  }
}

class EmptyCodeException extends FacebookError {
  constructor() {
    super('code is not provided', 'OAuthException')
  }
}

class UnknownOauthException extends FacebookError {
  constructor(error) {
    super(error, 'OAuthException')
  }
}

class UnauthorizedException extends FacebookError {
  constructor() {
    super('something went wrong', 'Unauthorized')
  }
}

module.exports = {
  FacebookPageIsNotConnectedException,  
  InstagramAccountIsNotConnectedException,  
  OAuthFetchingAccessTokenException,
  OAuthFetchingPagesException,
  OAuthFetchingInstagramIDException,
  OAuthFetchingInstagramInfoException,
  OAuthFetchingFacebookProfileException, 
  FacebookError,    
  EmptyCodeException,
  UnknownOauthException,
  UnauthorizedException,
  SocialPostError  
}
