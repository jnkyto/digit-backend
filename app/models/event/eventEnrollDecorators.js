const filter = require('lodash/filter')
const reduce = require('lodash/reduce')

const decoratePublic = eventEnroll => {
  const { event_enroll_id: id, event_id: eventId, event_enroll_data, fields } = eventEnroll
  const { isSpare, values = {} } = event_enroll_data
  const publicFields = filter(fields, 'public')
  const publicValues = publicFields.reduce((acc, field) => ({ ...acc, [field.name]: values[field.name] }), {})
  return {
    id,
    eventId,
    values: publicValues,
    isSpare
  }
}

const decorate = eventEnroll => {
  const { event_enroll_id: id, event_id: eventId, event_enroll_data } = eventEnroll
  const { isSpare = false, values } = event_enroll_data
  return {
    id,
    eventId,
    values,
    isSpare
  }
}

const decorateList = events =>
  events.map(decorate)

const decoratePublicList = events =>
  events.map(decoratePublic)

module.exports = {
  decorate,
  decoratePublic,
  decorateList,
  decoratePublicList
}
