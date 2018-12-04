const { NotFound } = require('http-errors')
const moment = require('moment')
const isNil = require('lodash/isNil')
const { db } = require('../../../db/pgp')

const event = {}
event.findById = id => {
  if(!id) {
    throw new NotFound('Event not found')
  }
  return db.one('SELECT * FROM event WHERE event_id = $1', id)
}
event.findAll = activeOnly => {
  return db.any(`SELECT * FROM event ${!isNil(activeOnly)
    ? `WHERE (event_data->>'activeAt')::timestamp < $[currentTime] AND (event_data->>'activeUntil')::timestamp > $[currentTime] AND (event_data->>'isVisible')::boolean IS TRUE`
    : ''}`,
  { currentTime: moment().format() })
}

event.save = (data, id) => id ? update(data, id) : create(data)

const create = data => {
  const sql = `INSERT INTO event (event_data)
      VALUES ($[data]) RETURNING event_id`
  const params = { data }
  return db.one(sql, params)
    .then(result => event.findById(result.event_id))
}

const update = ({ id, ...data }) => {
  const sql = `UPDATE event 
  SET event_data = $[data]
  WHERE event_id = $[id] RETURNING event_id`
  const params = {
    id,
    data
  }
  return db.one(sql, params)
    .then(result => {
      if(!result) { throw new NotFound('Event not found') }
      return event.findById(result.event_id)
    })
}

event.remove = id => {
  if(!id) { throw new NotFound('Event not found') }
  return db.one('DELETE FROM event WHERE event_id = $1 RETURNING event_id', id)
}

module.exports = event