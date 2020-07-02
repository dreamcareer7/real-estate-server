const config = require('../../../config')

const { getContext } = require('../context/get')

const getAddress = deal => {
  const street_number = getContext(deal, 'street_number', '')
  const street_name = getContext(deal, 'street_name', '')
  const street_prefix = getContext(deal, 'street_prefix', '')
  const street_suffix = getContext(deal, 'street_suffix', '')
  const unit = getContext(deal, 'unit_number', '')

  let address = `${street_name}${street_suffix}${street_prefix}${street_number}`

  if (unit)
    address += `Unit${unit}`

  let first_part

  if (address)
    first_part = address
  else
    first_part = 'deal'

  first_part = first_part
    .replace(/[^a-zA-Z0-9]+/g, '')


  return `${first_part}-${deal.number}@${config.mailgun.General.domain}`
}

module.exports = { getAddress }
