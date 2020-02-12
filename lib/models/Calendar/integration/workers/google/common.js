const belt = require('../../../../../utils/belt')


const generateGoogleCalendarEvent = async (event) => {
  // const Contact    = require('../../../../Contact')
  // const contactIds = event.people.map(p => p.id)
  // const contacts   = await Contact.getAll(contactIds)
  // const attendees  = contacts.map(c => ({ 'email': c.email, 'displayName': c.display_name }))

  const allDay     = (event.object_type === 'crm_task') ? false : true
  const start_date = belt.epochToDate(event.timestamp)
  const end_date   = belt.epochToDate(event.end_date)

  const start = {
    date: start_date.toISOString().slice(0,10),
    timeZone: 'America/Los_Angeles'
  }

  const end = {
    date: end_date.toISOString().slice(0,10),
    timeZone: 'America/Los_Angeles'
  }

  if (!allDay) {
    delete start.date
    delete end.date

    start.dateTime = start_date.toISOString()
    end.dateTime   = end_date.toISOString()
  }


  // check refrences object to reduce DB-IO-Call
  const attendees = event.people.map(p => ({ 'email': p.email, 'displayName': p.display_name }))

  const overrides = event.full_crm_task.reminders.map(r => ({
    method: 'email',
    minutes: Math.round(((r.timestamp * 1000) - (new Date().getTime())) / 1000 / 60)
  }))

  const reminders = {
    useDefault: ( overrides.length > 0 ) ? false : true,
    overrides
  }


  return {
    summary: event.title,
    description: '',
    status: (event.status === 'DONE') ? 'cancelled' : 'confirmed',

    start,
    end,
    attendees,
    reminders,
  
    extendedProperties: {
      shared: {
        origin: 'rechat',
        object_type: event.object_type,
        event_type: event.event_type
      }
    }
  }
}


module.exports = generateGoogleCalendarEvent


/*
curl 'https://alpine.api.rechat.com/calendar?low=1573516800&high=1589155199.999
&object_types[]=contact
&object_types[]=contact_attribute
&object_types[]=email_campaign
&object_types[]=deal_context
&object_types[]=crm_task
&associations[]=calendar_event.people
&associations[]=calendar_event.full_crm_task
&associations[]=crm_task.reminders
&associations[]=crm_association.contact' \
-H 'Authorization: Bearer MDczZjRlNDYtNGMzMy0xMWVhLTk5YTMtMDI3ZDMxYTFmN2Ew' -H 'X-RECHAT-BRAND: 2a640514-1fad-11e9-91dc-0a95998482ac'

Exclude these two
  &associations[]=crm_task.assignees
  &associations[]=crm_task.associations


Sample rechat-calendar-events


crm_tasl 
  {
    "id": "bddf305f-b735-4f3a-a3e3-2a334f9f3878",
    "created_by": "8725b638-3b09-11e7-b651-0242ac110003",
    "created_at": 1579024453.27935,
    "updated_at": 1579024453.27935,
    "object_type": "crm_task",
    "event_type": "Other",
    "type_label": "Other",
    "timestamp": 1579046400,
    "date": "2020-01-15T00:00:00.000Z",
    "next_occurence": null,
    "end_date": 1579132800,
    "recurring": false,
    "title": "Recurrent Event",
    "crm_task": "bddf305f-b735-4f3a-a3e3-2a334f9f3878",
    "deal": null,
    "contact": null,
    "campaign": null,
    "credential_id": null,
    "thread_key": null,
    "users": [
      "8725b638-3b09-11e7-b651-0242ac110003"
    ],
    "accessible_to": null,
    "people": [
      {
        "id": "4714b2aa-7367-45c1-b538-aa65c78c9126",
        "display_name": "heshmat.zapata@gmail.com",
        "partner_name": null,
        "sort_field": "heshmat.zapata@gmail.com",
        "last_touch": 1581081725,
        "next_touch": null,
        "touch_freq": null,
        "ios_address_book_id": null,
        "android_address_book_id": null,
        "google_id": null,
        "created_at": 1576068592.37445,
        "updated_at": 1576068586.41874,
        "deleted_at": null,
        "created_for": "microsoft_integration",
        "updated_for": "microsoft_integration",
        "deleted_for": null,
        "title": "Heshmat Zapata",
        "first_name": null,
        "partner_first_name": null,
        "middle_name": null,
        "last_name": null,
        "partner_last_name": null,
        "marketing_name": null,
        "nickname": null,
        "email": "heshmat.zapata@gmail.com",
        "primary_email": "heshmat.zapata@gmail.com",
        "emails": [
          "heshmat.zapata@gmail.com"
        ],
        "partner_email": null,
        "phone_number": null,
        "primary_phone_number": null,
        "phone_numbers": null,
        "company": null,
        "birthday": null,
        "profile_image_url": null,
        "cover_image_url": null,
        "job_title": null,
        "source_type": "Microsoft",
        "source": null,
        "website": null,
        "tags": null,
        "address": null,
        "type": "contact"
      },
      {
        "id": "b4138a7d-e164-413b-9e3b-02a056da3aac",
        "display_name": "Saeed Vayghan",
        "partner_name": null,
        "sort_field": "Vayghan Saeed",
        "last_touch": 1580489147,
        "next_touch": null,
        "touch_freq": null,
        "ios_address_book_id": null,
        "android_address_book_id": null,
        "google_id": "7de32337-862c-4915-9663-92b0ff4551d5",
        "created_at": 1575139178.0336,
        "updated_at": 1575139176.72644,
        "deleted_at": null,
        "created_for": "google_integration",
        "updated_for": "google_integration",
        "deleted_for": null,
        "title": null,
        "first_name": "Saeed",
        "partner_first_name": null,
        "middle_name": null,
        "last_name": "Vayghan",
        "partner_last_name": null,
        "marketing_name": null,
        "nickname": null,
        "email": "saeed.uni68@gmail.com",
        "primary_email": "saeed.uni68@gmail.com",
        "emails": [
          "saeed.uni68@gmail.com"
        ],
        "partner_email": null,
        "phone_number": null,
        "primary_phone_number": null,
        "phone_numbers": null,
        "company": null,
        "birthday": null,
        "profile_image_url": "https://d2dzyv4cb7po1i.cloudfront.net/2a640514-1fad-11e9-91dc-0a95998482ac/avatars/c2c16210-13a0-11ea-adb3-f365f7b1a2a3.jpg",
        "cover_image_url": "https://d2dzyv4cb7po1i.cloudfront.net/2a640514-1fad-11e9-91dc-0a95998482ac/avatars/c2c16210-13a0-11ea-adb3-f365f7b1a2a3.jpg",
        "job_title": null,
        "source_type": "Google",
        "source": null,
        "website": null,
        "tags": null,
        "address": null,
        "type": "contact"
      }
    ],
    "people_len": 2,
    "status": "PENDING",
    "metadata": {
      "status": "PENDING"
    },
    "timestamp_readable": "2020-01-15T00:00:00.000Z",
    "timestamp_midday": "2020-01-15T12:00:00.000Z",
    "type": "calendar_event",
    "full_crm_task": {
      "id": "bddf305f-b735-4f3a-a3e3-2a334f9f3878",
      "created_at": 1579024453.27935,
      "updated_at": 1579024453.27935,
      "deleted_at": null,
      "title": "Recurrent Event",
      "description": "This is descriptio",
      "due_date": 1579046400,
      "end_date": 1579132800,
      "status": "PENDING",
      "task_type": "Other",
      "metadata": null,
      "google_event_id": null,
      "microsoft_event_id": null,
      "reminders": [
        {
          "id": "bf0f7b04-56d1-435c-ae6e-311379a2757c",
          "created_at": 1579024453.27935,
          "updated_at": 1579024453.27935,
          "deleted_at": null,
          "is_relative": true,
          "timestamp": 1578992400,
          "task": "bddf305f-b735-4f3a-a3e3-2a334f9f3878",
          "type": "reminder"
        }
      ],
      "brand": "2a640514-1fad-11e9-91dc-0a95998482ac",
      "type": "crm_task"
    }
  }

contact_attribute
  {
    "id": "63a48811-2f4a-4ee1-a489-2c071a5ed651",
    "created_by": "8725b638-3b09-11e7-b651-0242ac110003",
    "created_at": 1565572646.22176,
    "updated_at": 1565572646.22176,
    "object_type": "contact_attribute",
    "event_type": "birthday",
    "type_label": "Birthday",
    "timestamp": -5361897600,
    "date": "1800-02-02T00:00:00.000Z",
    "next_occurence": "2021-02-02T00:00:00.000Z",
    "end_date": null,
    "recurring": true,
    "title": "Portgas Ace's Birthday",
    "crm_task": null,
    "deal": null,
    "contact": "30a89a9e-8103-4e3e-9ca6-3beb08109679",
    "campaign": null,
    "credential_id": null,
    "thread_key": null,
    "users": [
      "8725b638-3b09-11e7-b651-0242ac110003"
    ],
    "accessible_to": null,
    "people": [
      {
        "id": "30a89a9e-8103-4e3e-9ca6-3beb08109679",
        "display_name": "Portgas Ace",
        "partner_name": null,
        "sort_field": "Ace Portgas",
        "last_touch": 1577114806,
        "next_touch": null,
        "touch_freq": null,
        "ios_address_book_id": null,
        "android_address_book_id": null,
        "google_id": null,
        "created_at": 1565379138.21894,
        "updated_at": 1565572646.18564,
        "deleted_at": null,
        "created_for": "direct_request",
        "updated_for": "direct_request",
        "deleted_for": null,
        "title": "Mr.",
        "first_name": "Portgas",
        "partner_first_name": null,
        "middle_name": "D.",
        "last_name": "Ace",
        "partner_last_name": null,
        "marketing_name": null,
        "nickname": null,
        "email": "jamesnonat2@outlook.com",
        "primary_email": "jamesnonat2@outlook.com",
        "emails": [
          "jamesnonat2@outlook.com",
          "james2@gmail.com"
        ],
        "partner_email": null,
        "phone_number": "832-321-1873",
        "primary_phone_number": "832-321-1873",
        "phone_numbers": [
          "832-321-1873"
        ],
        "company": null,
        "birthday": "1800-02-02T00:00:00.000Z",
        "profile_image_url": null,
        "cover_image_url": null,
        "job_title": null,
        "source_type": "ExplicitlyCreated",
        "source": null,
        "website": null,
        "tags": null,
        "address": null,
        "type": "contact"
      }
    ],
    "people_len": 1,
    "status": null,
    "metadata": {
      "is_partner": false
    },
    "timestamp_readable": "1800-02-02T00:00:00.000Z",
    "timestamp_midday": "1800-02-02T12:00:00.000Z",
    "type": "calendar_event"
  }
*/