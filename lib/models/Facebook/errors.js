class FacebookError extends Error {  
  constructor(msg, code) {    
    super(msg)
    this.code = code
  }
}

class FacebookPageIsNotConnectedException extends Error {
  constructor() {
    super('facebook page is not connected')
  }
}

class InstagramAccountIsNotConnectedException extends Error {
  constructor() {
    super('instagram account is not connected')
  }
}

class OAuthFetchingAccessTokenException extends Error {
  constructor() {
    super('OAuthFetchingAccessTokenException')
  }
}

class OAuthFetchingPagesException extends Error {
  constructor() {
    super('OAuthFetchingPagesException')
  }
}

class OAuthFetchingInstagramIDException extends Error {
  constructor() {
    super('OAuthFetchingInstagramIDException')
  }
}

class OAuthFetchingInstagramInfoException extends Error {
  constructor() {
    super('OAuthFetchingInstagramInfoException')
  }
}

class OAuthFetchingFacebookProfileException extends Error {
  constructor() {
    super('OAuthFetchingFacebookProfileException')
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
}
