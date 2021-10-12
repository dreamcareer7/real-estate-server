const config = require('../../../config')
const { Api } = require('./api')

class ShowingHubClient extends Api {
  tokenPromise = null

  constructor(apiConfig = {}) {
    super({
      baseUrl: config.showinghub.base_url,
      ...apiConfig
    })

    const baseRequest = this.request.bind(this)

    this.getToken = async () => {
      const tokenResp = await this.api.tokenList({ apiKey: config.showinghub.api_key })
      return tokenResp.data.token
    }

    this.request = async (params) => {
      const token = ''
      return baseRequest({
        ...params,
        headers: {
          ...params.headers,
          'Authorization': `Bearer ${token}`
        }
      })
    }
  }
}

module.exports = {
  ShowingHubClient
}
