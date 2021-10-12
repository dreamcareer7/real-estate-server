const config = require('../../../config')
const { Api } = require('./api')

const HOUR = 3600 * 1000

class ShowingHubClient extends Api {
  lastTokenTimestamp = -Infinity
  /** @type {string | null | undefined} */
  token = null

  constructor(apiConfig = {}) {
    super({
      baseUrl: config.showinghub.base_url,
      ...apiConfig,
    })

    const baseRequest = this.request.bind(this)

    this.getToken = async () => {
      if (Date.now() - 23 * HOUR > this.lastTokenTimestamp) {
        const tokenResp = await this.tokenList({ apiKey: config.showinghub.api_key })
        this.token = tokenResp.data.token
        this.lastTokenTimestamp = Date.now()
      }

      return this.token
    }

    this.tokenList = (query, params = {}) => {
      return baseRequest({
        path: `/api/token`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      })
    }

    this.request = async (params) => {
      const token = await this.getToken()
      console.log(`using token ${token}`)
      return baseRequest({
        ...params,
        headers: {
          ...params.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    }
  }
}

module.exports = {
  ShowingHubClient,
}
