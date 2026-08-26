const crypto = require('crypto')

// RFC 4122 UUID v1: 100-ns intervals between Gregorian epoch (1582-10-15) and Unix epoch
const GREGORIAN_OFFSET_MS = 12219292800000

let lastMsecs = 0
let lastNsecs = 0
let clockseq = crypto.randomBytes(2).readUInt16BE(0) & 0x3fff
const nodeId = crypto.randomBytes(6)
nodeId[0] |= 0x01

const formatUuid = (bytes) => {
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const uuidv1 = () => {
  let msecs = Date.now()
  let nsecs = lastNsecs + 1
  const dt = (msecs - lastMsecs) + (nsecs - lastNsecs) / 10000

  if (dt < 0) {
    clockseq = (clockseq + 1) & 0x3fff
  }
  if (dt < 0 || msecs > lastMsecs) {
    nsecs = 0
  }
  if (nsecs >= 10000) {
    throw new Error('uuid v1 clock overflow')
  }

  lastMsecs = msecs
  lastNsecs = nsecs

  msecs += GREGORIAN_OFFSET_MS

  const timeLow = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000
  const timeMidHigh = ((msecs / 0x100000000) * 10000) & 0xfffffff

  const bytes = Buffer.allocUnsafe(16)
  bytes[0] = (timeLow >>> 24) & 0xff
  bytes[1] = (timeLow >>> 16) & 0xff
  bytes[2] = (timeLow >>> 8) & 0xff
  bytes[3] = timeLow & 0xff
  bytes[4] = (timeMidHigh >>> 8) & 0xff
  bytes[5] = timeMidHigh & 0xff
  bytes[6] = ((timeMidHigh >>> 24) & 0xf) | 0x10
  bytes[7] = (timeMidHigh >>> 16) & 0xff
  bytes[8] = (clockseq >>> 8) | 0x80
  bytes[9] = clockseq & 0xff
  nodeId.copy(bytes, 10)

  return formatUuid(bytes)
}

const uuidv4 = () => crypto.randomUUID()

module.exports = { uuidv1, uuidv4 }
