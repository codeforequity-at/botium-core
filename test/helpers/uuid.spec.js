const assert = require('chai').assert
const { uuidv1, uuidv4 } = require('../../src/helpers/Uuid')

const UUID_V1 = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('helpers.uuid', function () {
  it('should generate RFC4122 version 1 uuids', function () {
    const id = uuidv1()
    assert.match(id, UUID_V1)
    assert.lengthOf(id, 36)
  })

  it('should generate unique version 1 uuids', function () {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv1()))
    assert.equal(ids.size, 100)
  })

  it('should generate RFC4122 version 4 uuids', function () {
    const id = uuidv4()
    assert.match(id, UUID_V4)
    assert.lengthOf(id, 36)
  })

  it('should generate unique version 4 uuids', function () {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv4()))
    assert.equal(ids.size, 100)
  })
})
