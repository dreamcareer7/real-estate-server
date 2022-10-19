const ImgixClient = require('@imgix/js-core')
const getUrls = require('get-urls')
const config = require('../../../config')
const { URL } = require('url')

const client = new ImgixClient({
  domain: config.imgix.domain,
  secureURLToken: config.imgix.secureURLToken
});

const shouldCdnize = url => {
  const u = new URL(url)
  return config.imgix.domains.includes(u.hostname.toLowerCase())
}

const replace = (html, url) => {
  const replacement = client.buildURL(url, {
    maxWidth: 800
  })

  return html.replace(url, replacement, 'ig')
}

const cdnize = html => {
  const urls = getUrls(html)

  for (const url of urls) {
    if (!shouldCdnize(url))
      continue

    html = replace(html, url)
  }


  return html
}

module.exports = cdnize
