const getLoginPayLoad = async function(data) {
  const selectedLocation = '6%2C1%2CDFW'
  const selectedLocationString = 'Dallas%2FFort+Worth'
  const loginGoTo = '%2FClassicReport%2FShowingsOnYourListings%2F'

  const lginPayload = `SelectedLocation=${selectedLocation}`
                    + `&SelectedLocationString=${selectedLocationString}`
                    + `&UserName=${data.username}`
                    + `&Password=${data.password}`
                    + `&GoTo=${loginGoTo}&RememberMe=true`

  return lginPayload
}

const getAjaxPayLoad = async function(target, customDate) {
  const daysBack = 90

  const last90DaysFixedPayLoadOne = '&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='
  const last90DaysFixedPayLoadTwo = '&SortType=&ListingGUID=&mode=SFB&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='

  const customDateFixedPayLoadOne = 'DaysBack=&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=false&ShowingsWithFeedbackOnly=false&ActivePropertiesOnly=false&UseAdvanceSettings=True&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px'
  const customDateFixedPayLoadTwo = ''

  const last90DaysPayloadOne = `DaysBack=${daysBack}${last90DaysFixedPayLoadOne}`
  const last90DaysPayloadTwo = `DaysBack=${daysBack}${last90DaysFixedPayLoadTwo}`

  const customDatePayloadOne = `${customDateFixedPayLoadOne}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`
  const customDatePayloadTwo = `${customDateFixedPayLoadTwo}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`


  if( target === 'showings' ) {
    if(customDate)
      return customDatePayloadOne
    
    return last90DaysPayloadOne
  }

  if( target === 'appoinments-for-byuers' ) {
    if(customDate)
      return customDatePayloadTwo
    
    return last90DaysPayloadTwo
  }
}


module.exports = {
  getLoginPayLoad, 
  getAjaxPayLoad
}





