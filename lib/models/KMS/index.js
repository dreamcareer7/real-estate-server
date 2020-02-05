let kms = require('./kms')

if ( process.env.NODE_ENV === 'tests' ) {
  kms = require('./mock')
}

module.exports = kms