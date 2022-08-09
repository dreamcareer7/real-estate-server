const request = require('request-promise-native')
const sharp = require('sharp')
const path = require('path')
const db = require('../../utils/db')
const AttachedFile = require('../AttachedFile')
const { lock } = require('./lock')
const { get } = require('./get')
const { get: getTemplateInstance } = require('../Template/instance/get')
const { get: getTemplate } = require('../Template/get')
const { get: getFile } = require('../AttachedFile/get')
const getFacebookCredential = require('../Facebook/credentials/get')
const { get: getFacebookPage } = require('../Facebook/pages/get')
const Context = require('../Context')
const sdk = require('../Facebook/facebook-sdk')
const updateWorkerResult = require('./updateWorkerResult')
const { FacebookError, SocialPostError } = require('../Facebook/errors')
const Slack = require('../Slack')

if (process.env.NODE_ENV === 'tests') {
  require('./mock')
}

const saveError = async (id, error) => {
  return db.query.promise('social_post/save-error', [id, error])
}

const uploadFile = async ({ buffer, filename, path, user }) => {
  Context.log(`Attaching file with filename ${filename}`)
  // @ts-ignore
  return AttachedFile.saveFromBuffer({
    buffer,
    filename,
    relations: [],
    path,
    user,
    public: true,
  })
}

const format = 'jpeg'

const convertPngToJpeg = async (url) => {
  const downloadImage = (url) => {
    Context.log(`Downloading image with url ${url}`)
    return request.get({
      url,
      encoding: null,
    })
  }

  const convert = (buffer) => {
    Context.log(`Converting image to ${format}`)
    return sharp(buffer).toFormat(format).toBuffer()
  }

  return downloadImage(url).then(convert)
}

/**
 * @param {UUID} id
 */
const markAsExecuted = async (id) => {
  await db.query.promise('social_post/mark-as-executed', [id])
}

const excludeExtensionFromFilename = (filename) => {
  const extension = path.extname(filename)
  return path.basename(filename, extension)
}

/**
 * @param {UUID} id
 */
const send = async (id) => {
  Context.log(`Getting Social Post with id ${id}`)
  const post = await get(id)
  await lock(post.id)
  try {
    if (!post || post.deleted_at) {
      throw new SocialPostError('Facebook page is disconnected')
    }

    Context.log(`Getting Template instance for Social Post with template id ${post.template_instance} for job ${id}`)
    const templateInstance = await getTemplateInstance(post.template_instance)

    const template = await getTemplate(templateInstance.template)

    Context.log(`Getting FacebookPage with id ${post.facebook_page} for job ${id}`)
    const fbPage = await getFacebookPage(post.facebook_page)

    Context.log(`Getting Facebook credential with id ${fbPage.facebook_credential} for job ${id}`)
    const fbCredential = await getFacebookCredential(fbPage.facebook_credential)

    Context.log(`Getting Template file with file id ${templateInstance.file} for job ${id}`)
    
    const isVideo = template.video

    let url
    let targetFile
    let mediaContainerId  = post.media_container_id

    if (!mediaContainerId) {
      if (isVideo) {
        targetFile = await getFile(templateInstance.file)
        url = targetFile.url
      } else {
        // image
        const pngFile = await getFile(templateInstance.file)
  
        const jpegBuffer = await convertPngToJpeg(pngFile.url)
    
        targetFile = await uploadFile({
          buffer: jpegBuffer,
          filename: `${excludeExtensionFromFilename(pngFile.name)}.${format}`,
          path: 'templates/instances',
          user: post.created_by,
        })
  
        url = targetFile.url
      }
    }
   
    const fb = sdk.init({
      accessToken: fbCredential.access_token,
    })

    const igUserId = fbPage.instagram_business_account_id
    const caption = post.caption

    

    if (!mediaContainerId) {
      Context.log(
        `Creating a media container in instagram with igUserId ${igUserId} and caption '${caption}' for job ${id}`
      )

      mediaContainerId = await fb.createMediaContainer({
        igUserId,
        caption,
        url,
        isVideo
      })

      await updateWorkerResult({
        id,
        mediaContainerId,
        fileId: targetFile.id
      })
   
      Context.log(
        `media container id is created and stored with id ${mediaContainerId} and file id ${targetFile.id} for job ${id}`
      )
    }

    const containerStatusCode = await fb.getMediaContainerStatus({ mediaContainerId })

    Context.log(`Media container status is ${containerStatusCode} for job ${id}`)

    if (containerStatusCode !== 'IN_PROGRESS') {
      Context.log(
        `Publishing the media with igUserId ${igUserId} and mediaContainerId ${mediaContainerId} for job ${id}`
      )
      const publishedMediaContainerId = await fb.publishMedia({
        igUserId,
        mediaContainerId,
      })
  
      Context.log(`Getting permalink with publishedId ${publishedMediaContainerId} for job ${id}`)
      const permalink = await fb.getMediaInfo({
        publishedMediaContainerId,
      })
  
      Context.log(
        `Updating worker result for post id ${id} with link ${permalink} , publishedMediaId ${publishedMediaContainerId} for job ${id}`
      )
  
      await updateWorkerResult({
        id,
        postLink: permalink,
        publishedMediaId: publishedMediaContainerId,
      })
      
      await markAsExecuted(post.id)

      Context.log(`Finished posting on instagram ${id} .`)
    }

  } catch (error) {
    Context.log(`There is a error while publishing instagram post with '${id}'`)
    Context.error(error)
    let msg = 'Internal Server Error'
    const isFacebookError = error instanceof FacebookError
    if (isFacebookError) {
      msg = error.message
    }

    Slack.send({
      channel: '6-support',
      text: `
      There is a error while publishing instagram post with '${id}'
      user error message: '${msg}'
      actual error: '${error.message}'
      ${isFacebookError ? `
      since this is the facebook error, you can check these links:
      https://developers.facebook.com/docs/graph-api/guides/error-handling/
      https://developers.facebook.com/docs/instagram-api/reference/error-codes
      ` : ''}
      `,
      emoji: ':skull:'
    })
    
    await markAsExecuted(post.id)
    // TODO ask 'Internal Server Error' from Product
    await saveError(id, msg)
  }
}

module.exports = {
  lock,
  send,
}
