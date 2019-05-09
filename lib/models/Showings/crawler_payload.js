const getLoginPayLoad = async function(data) {
  const selectedLocation = '6%2C1%2CDFW'
  const selectedLocationString = 'Dallas%2FFort+Worth'
  const loginGoTo = '%2FClassicReport%2FShowingsOnYourListings%2F'

  const lginPayload = `SelectedLocation=${selectedLocation}`
                    + `&SelectedLocationString=${selectedLocationString}`
                    + `&UserName=${data.username}`
                    + `&Password=${data.password}`
                    + `&GoTo=${loginGoTo}`
                    + '&RememberMe=true'

  return lginPayload
}

const getAjaxPayLoad = async function(target) {
  const daysBack = 90

  const payloadOne = `DaysBack=${daysBack}`
                    + '&SortType= '
                    + '&ListingGUID='
                    + '&mode=SOL'
                    + '&ShowingsWithNoFeedbackOnly='
                    + '&ShowingsWithFeedbackOnly='
                    + '&ActivePropertiesOnly='
                    + '&UseAdvanceSettings='
                    + '&OrderBy='
                    + '&RenderAsSLRReport=false'
                    + '&CacheGuid='
                    + '&EmailWindowHeight=427px'
                    + '&StartDate='
                    + '&EndDate='

  const payloadTwo = `DaysBack=${daysBack}`
                    + '&SortType='
                    + '&ListingGUID='
                    + '&mode=SFB'
                    + '&ShowingsWithNoFeedbackOnly='
                    + '&ShowingsWithFeedbackOnly='
                    + '&ActivePropertiesOnly='
                    + '&UseAdvanceSettings='
                    + '&OrderBy='
                    + '&RenderAsSLRReport=false'
                    + '&CacheGuid='
                    + '&EmailWindowHeight=427px'
                    + '&StartDate='
                    + '&EndDate='

  if( target === 'showings' )
    return payloadOne

  if( target === 'appoinments-for-byuers' )
    return payloadTwo
}


module.exports = {
  getLoginPayLoad, 
  getAjaxPayLoad
}