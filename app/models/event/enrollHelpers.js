const moment = require('moment')
const { BadRequest, Forbidden } = require('http-errors')
const { bifurcateBy } = require('../../helpers/helpers')

const hasStillLimits = event => event.reservedUntil && moment(event.reservedUntil).isAfter(moment())

const isEnrollPossible = (event, previousEnrollResults) => {
  const { maxParticipants, reserveCount } = event
  if(moment().isBefore(moment(event.activeAt))) {
    throw new Forbidden(`Enrolling hasn't stated yet`)
  } else if(moment().isAfter(moment(event.activeUntil))) {
    throw new Forbidden(`Enrolling has ended`)
  }
  if(maxParticipants != null) {
    const eventParticipantLimit = maxParticipants + reserveCount
    if(previousEnrollResults.length >= eventParticipantLimit) {
      throw new BadRequest('Event is full')
    }
  }
  return true
}

const getLimitedFields = fields => fields.reduce((acc, field) =>
  field.options
    ? ({
      ...acc,
      [field.name]: field.options.reduce(reduceOptionReserveCounts, {})
    })
    : null,
  {})

const reduceOptionReserveCounts = (acc, option) =>
  option.reserveCount
    ? ({
      ...acc,
      [option.name]: option.reserveCount
    })
    : null

const determineIsSpare = (event, previousEnrolls, enroll) => {
  const { fields, maxParticipants, reserveCount } = event
  const eventParticipantLimit = maxParticipants + reserveCount

  if(previousEnrolls.length >= eventParticipantLimit) {
    throw new BadRequest('Event is full')
  }

  if(!hasStillLimits(event)) {
    return false
  }

  const limitedFields = getLimitedFields(fields)
  const hasLimitedFields = limitedFields && Object.values(limitedFields).filter(value => !!value).length

  const [spareEnrolls, regularEnrolls] = bifurcateBy(previousEnrolls, enroll => enroll.isSpare)
  if(!hasLimitedFields) {
    if(regularEnrolls.length < maxParticipants) {
      return false
    }
    return true
  }

  // Collect info about field of this particular enroll
  const newEnrollLimitField = Object.entries(limitedFields)
    .map(([key, value]) => ({
      key,
      value: enroll.values[key],
      reserveCount: value[enroll.values[key]]
    }))[0] // FIXME: currently allow only one limiting field

  const spareLimitedEnrolls = spareEnrolls.filter(enroll =>
    enroll.values[newEnrollLimitField.key] === newEnrollLimitField.value
  )
  const regularLimitedEnrolls = regularEnrolls.filter(enroll =>
    enroll.values[newEnrollLimitField.key] === newEnrollLimitField.value
  )
  const noMoreRegularSpace = regularLimitedEnrolls.length >= newEnrollLimitField.reserveCount
  if(noMoreRegularSpace && reserveCount != null && reserveCount <= spareEnrolls) {
    throw new Error('Field limit reached')
  } 
  return noMoreRegularSpace
 
}

const getLimitedFieldIfEnrollMatch = (event, enroll) => {
  const optionFields = event.fields.filter(field => !!field.options)
  const enrollKeyValue = Object.entries(enroll.values)
    .find(([key, value]) =>
      optionFields
        .find(field =>
          field.options.find(option => option.name === value && option.reserveCount != null))
    )
  return enrollKeyValue || []
}

module.exports = {
  isEnrollPossible,
  determineIsSpare,
  hasStillLimits,
  getLimitedFieldIfEnrollMatch,
  getLimitedFields
}