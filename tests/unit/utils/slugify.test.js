const { expect } = require('chai')
const isValidHostname = require('is-valid-hostname')

const slugify = require('../../../lib/utils/slugify')

describe('utils/slugify', () => {
  it('returns a url safe string', () => {
    const ROOT_DOMAIN = 'rechat.co'
    const STRINGS = [
      '  a string    with \t\n some \rspaces ',
      '|all|[kinds]<of>(parens){here}',
      '.:commas,and.periods;...\u2026',
      '&+_many#more/*-~\'^\0characters\\"%$here!=`@',
      '\u0440\u0435\u0447\u0435\u043d\u043d\u044f\u0020\u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e\u0020\u043c\u043e\u0432\u043e\u044e',
      '\u06cc\u06a9\u0020\u062c\u0645\u0644\u0647\u0020\u0628\u0647\u0020\u0641\u0627\u0631\u0633\u06cc',
      '\u0027\u6c49\u8bed\u9020\u53e5\u0027',
      '\u0041\u0332\u032c\u0020\u0073\u0306\u034d\u0074\u0324\u030d\u0072\u0343\u030d\u0069\u0325\u035f\u006e\u031f\u0357\u0067\u0319\u0350\u0020\u0077\u0352\u0310\u0069\u0321\u031b\u0074\u0360\u0322\u0068\u0357\u031b\u0020\u0073\u0318\u0315\u006f\u033d\u035a\u006d\u0315\u0315\u0065\u031f\u0349\u0020\u0061\u032b\u0311\u0063\u030f\u0330\u0063\u033b\u035d\u0065\u0362\u0335\u006e\u032b\u0302\u0074\u0314\u034c\u0020\u006d\u031b\u032a\u0061\u0311\u0319\u0072\u0360\u0307\u006b\u035c\u031e\u0073\u0349\u0308',
    ]

    for (const [i, str] of STRINGS.entries()) {
      const subdomain = slugify(str)
      const isValid = isValidHostname(`${subdomain}.${ROOT_DOMAIN}`)

      expect(isValid, `Failed to slugify STRINGS[${i}]`).to.be.true
    }
  })
})
