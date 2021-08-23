const fs = require('fs/promises')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.ENV_FILE}`)
})

const request = require('request-promise-native')
const config = require('../../lib/config')
const DOMAIN = 'mail.rechat.com'
const BASE_URL = 'https://sw.api.mailgun.net/v3/domains'

async function main() {
  const key = process.argv[2]
  const url = `${BASE_URL}/${DOMAIN}/messages/${key}`
  const auth = 'Basic ' + Buffer.from('api:' + config.mailgun.api_key).toString('base64')

  const resp = await request.get(url, {
    headers: {
      Authorization: auth,
    },
    json: true
  })

  await fs.writeFile(path.resolve(__dirname, '../../out', `${key}.html`), resp['body-html'], { encoding: 'utf-8' })
}

main()
  .catch((ex) => console.error(ex))
  .finally(() => process.exit())
