const zlib = require('node:zlib');

const S3 = require('aws-sdk/clients/s3')
const { ManagedDownloader } = require('@aws/s3-managed-downloader')

/**
 * @param {string} key 
 */
const k = (key) => ({
  Bucket: 'rechat-public',
  Key: key
})

const MANIFEST = k('__GHOLI__/rechat-listing-photos/weekly-report/2022-10-17T00-00Z/manifest.json')

const s3 = new S3({
  region: 'us-east-1',
})
const downloader = new ManagedDownloader(s3)

async function downloadManifest() {
  const stream = await downloader.getObjectStream(MANIFEST)
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

async function main() {
  const manifest = await downloadManifest()
  console.log(manifest.files.length)
}

main().catch(ex => console.error(ex))
