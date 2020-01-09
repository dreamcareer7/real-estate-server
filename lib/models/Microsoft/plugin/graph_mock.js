const config = require('../../../config')

const CREDENTIALS = config.microsoft_integration.credential


function MGraph(){
  this.credentials   = CREDENTIALS
  this.client_id     = CREDENTIALS.client_id
  this.client_secret = CREDENTIALS.client_secret
  this.auth_uri      = CREDENTIALS.auth_uri
  this.redirect_uri  = CREDENTIALS.redirect_to_uri

  this.response_type = 'code'
  this.response_mode = 'query'
  this.prompt        = 'login'
}


// Profile
MGraph.prototype.getProfileNative = async function() {
  return {}
}

MGraph.prototype.getProfile = async function() {
  return {}
}

MGraph.prototype.getProfileAvatar = async function () {
  return {}
}



module.exports.setupClient = async function(credential) {
  return new MGraph()
}
