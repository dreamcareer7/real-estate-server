const chargebee = require('../chargebee')
const Url = require('../../Url')

const getCheckoutUrl = async (subscription, options) => {
  const { embed } = options

  const uri = `dashboard/billing/${subscription.brand}`

  const redirect_url = Url.web({
    uri
  })

  const data = {
    subscription: {
      id: subscription.chargebee_id
    },
    embed,
    redirect_url
  }

  const { hosted_page } = await chargebee.hosted_page.checkout_existing(data).request()
  return hosted_page.url
}

module.exports = {
  getCheckoutUrl
}
