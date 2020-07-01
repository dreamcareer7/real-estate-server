const numeral = require('numeral')
const cu = require('convert-units')

const getStatusHTMLColorCode = status => {
  switch (status) {
    case 'Active':
      return '#35b863'

    case 'Coming Soon':
      return '#00f0ff'

    case 'Pending':
    case 'Active Contingent':
    case 'Active Kick Out':
    case 'Active Option Contract':
      return '#f8b619'

    case 'Leased':
    case 'Expired':
    case 'Sold':
    case 'Cancelled':
      return '#db3821'

    default:
      return '#9b9b9b'
  }
}


const priceHumanReadable = price => {
  if (!price || typeof (price) !== 'number')
    return ''

  return '$' + numeral(price).format('0,0')
}

const getSquareFeet = square_meters => {
  if (!square_meters || typeof (square_meters) !== 'number')
    return 'N/A'

  return numeral(cu(square_meters).from('m2').to('ft2')).format('0') + 'ft²'
}

module.exports = {
  getStatusHTMLColorCode,
  priceHumanReadable,
  getSquareFeet
}
