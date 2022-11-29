const Brand = require('../Brand/get')
const Branch = require('../Branch')
const Url = require('../Url')

const BRANCH_ACTION = 'RedirectToListing'

const getDefaultLink = listing => {
  return Url.web({
    uri: `/dashboard/mls/${listing.id}`
  })
}

const getLink = listing => {
  let brand = Brand.getCurrent()
  if (!brand)
    return getDefaultLink(listing)


  while (brand) {
    const url = brand?.messages?.listing_url
    if (url)
      return url.replace('%1', listing.mls_number)

    brand = brand.parent
  }

  return getDefaultLink(listing)
}

/**
 * @param {IModel} listing
 * @returns {Promise<string>}
 */
async function getBranchLink (listing) {
  const desktopUrl = getDefaultLink(listing)

  return Branch.createURL({
    action: BRANCH_ACTION,
    listing: listing.id,
    $desktop_url: desktopUrl,
    $fallback_url: desktopUrl,
  })
}

module.exports = {
  getDefaultLink,
  getLink,
  getBranchLink,
}
