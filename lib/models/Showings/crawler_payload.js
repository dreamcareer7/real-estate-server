const config = require('../../config')


const getLoginPayLoad = async function(data) {
  const selectedLocation = data.selected_location || '6%2C1%2CDFW'
  const selectedLocationString = data.selected_location_string || 'Dallas%2FFort+Worth'
  const loginGoTo = '%2FClassicReport%2FShowingsOnYourListings%2F'

  const loginPayload = `SelectedLocation=${selectedLocation}`
                    + `&SelectedLocationString=${selectedLocationString}`
                    + `&UserName=${data.username}`
                    + `&Password=${data.password}`
                    + `&GoTo=${loginGoTo}&RememberMe=true`

  return loginPayload
}

const getAjaxPayLoad = async function(action, customDate) {
  const daysBack = config.showings.recurring_crawl_days_back

  const fixedPayLoadOne = '&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='
  const fixedPayLoadTwo = '&SortType=&ListingGUID=&mode=SFB&ShowingsWithNoFeedbackOnly=&ShowingsWithFeedbackOnly=&ActivePropertiesOnly=&UseAdvanceSettings=&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px&StartDate=&EndDate='

  const customDateFixedPayLoadOne = 'DaysBack=&SortType=&ListingGUID=&mode=SOL&ShowingsWithNoFeedbackOnly=false&ShowingsWithFeedbackOnly=false&ActivePropertiesOnly=false&UseAdvanceSettings=True&OrderBy=&RenderAsSLRReport=false&CacheGuid=&EmailWindowHeight=427px'
  const customDateFixedPayLoadTwo = ''

  const payloadOne = `DaysBack=${daysBack}${fixedPayLoadOne}`
  const payloadTwo = `DaysBack=${daysBack}${fixedPayLoadTwo}`

  if( action === 'showings' ) {
    if(customDate) {
      const customDatePayloadOne = `${customDateFixedPayLoadOne}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`
      return customDatePayloadOne
    }
    
    return payloadOne
  }

  if( action === 'appoinmentsForBuyers' ) {
    if(customDate) {
      const customDatePayloadTwo = `${customDateFixedPayLoadTwo}&StartDate=${customDate.startDate}&EndDate=${customDate.endDate}`
      return customDatePayloadTwo
    }
    
    return payloadTwo
  }
}


module.exports = {
  getLoginPayLoad, 
  getAjaxPayLoad
}