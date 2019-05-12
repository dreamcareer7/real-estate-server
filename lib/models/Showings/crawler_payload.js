const getLoginPayLoad = async function(data) {
  const selectedLocation = '6%2C1%2CDFW'
  const selectedLocationString = 'Dallas%2FFort+Worth'
  const loginGoTo = '%2FClassicReport%2FShowingsOnYourListings%2F'

  const loginPayload = `SelectedLocation=${selectedLocation}`
                    + `&SelectedLocationString=${selectedLocationString}`
                    + `&UserName=${data.username}`
                    + `&Password=${data.password}`
                    + `&GoTo=${loginGoTo}&RememberMe=true`

  return loginPayload
}

const getAjaxPayLoad = async function(action, customDate) {
  const daysBack = 3

  const lastThreeDaysFixedPayLoadOne = '&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='
  const lastThreeDaysFixedPayLoadTwo = '&SortType=&ListingGUID=&mode=SFB&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='

  const customDateFixedPayLoadOne = 'DaysBack=&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=false&ShowingsWithFeedbackOnly=false&ActivePropertiesOnly=false&UseAdvanceSettings=True&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px'
  const customDateFixedPayLoadTwo = ''

  const lastThreeDaysPayloadOne = `DaysBack=${daysBack}${lastThreeDaysFixedPayLoadOne}`
  const lastThreeDaysPayloadTwo = `DaysBack=${daysBack}${lastThreeDaysFixedPayLoadTwo}`

  const customDatePayloadOne = `${customDateFixedPayLoadOne}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`
  const customDatePayloadTwo = `${customDateFixedPayLoadTwo}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`


  if( action === 'showings' ) {
    if(customDate)
      return customDatePayloadOne
    
    return lastThreeDaysPayloadOne
  }

  if( action === 'appoinmentsForBuyers' ) {
    if(customDate)
      return customDatePayloadTwo
    
    return lastThreeDaysPayloadTwo
  }
}


module.exports = {
  getLoginPayLoad, 
  getAjaxPayLoad
}