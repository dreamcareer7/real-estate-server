const getFields = function (justBody = false) {
  /*
    id,threadId,labelIds,historyId,internalDate,sizeEstimate,
    payload(partId,mimeType,filename,headers,body(size,attachmentId),
      parts(partId,mimeType,filename,body(size,attachmentId),
        parts(partId,mimeType,filename,body(size,attachmentId),
          parts(partId,mimeType,filename,body(size,attachmentId)))))
  */

  if (justBody)
    return '&fields=id,labelIds,snippet,payload(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data)))))'
    
  const rootElements  = 'id,threadId,historyId,labelIds,internalDate'
  const subElements_1 = 'partId,mimeType,filename,headers,body(size,attachmentId)'
  const subElements_2 = 'partId,mimeType,filename,headers,body(size,attachmentId)'

  const fields = `&fields=${rootElements},payload(${subElements_1},parts(${subElements_2},parts(${subElements_2},parts(${subElements_2}))))`

  return fields
}


module.exports = {
  getFields
}