const Orm = require('../../Orm/registry')
const htmlToText = require('html-to-text')

const { getAll } = require('./get')

const publicize = model => {
  model.text = htmlToText.fromString(model.body, {
    ignoreImage: true,
    noLinkBrackets: true
  })
}

Orm.register('brand_email', 'BrandEmail', {
  getAll,
  publicize
})
