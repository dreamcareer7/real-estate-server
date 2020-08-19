const chargebee = require('../chargebee')
const Url = require('../../Url')

const getCheckoutUrl = async (subscription, options) => {
  const { embed } = options

  const uri = `/brands/${subscription.brand}/hook`

  const redirect_url = Url.web({
    uri,
    query: {
      success: true
    }
  })

  const cancel_url = Url.web({
    uri,
    query: {
      cancel: true
    }
  })

  const data = {
    subscription: {
      id: subscription.chargebee_id
    },
    embed,
    redirect_url,
    cancel_url
  }

  const { hosted_page } = await chargebee.hosted_page.checkout_existing(data).request()
  return hosted_page.url
}

module.exports = {
  getCheckoutUrl
}
