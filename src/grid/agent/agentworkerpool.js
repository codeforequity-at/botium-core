const path = require('path')

const AgentWorker = require('./AgentWorker')

const agentWorkers = new Array(process.env.BOTIUM_WORKER_COUNT ? parseInt(process.env.BOTIUM_WORKER_COUNT) : 10)

const getStatus = () => {
  return {
    software: 'Botium Agent',
    version: require(path.resolve(__dirname, '..', '..', '..', 'package.json')).version,
    maxWorkers: agentWorkers.length,
    currentWorkers: agentWorkers.filter((wp) => wp).length
  }
}

const allocate = (workerArgs = {}) => {
  return new Promise((resolve, reject) => {
    const slot = agentWorkers.findIndex((wp) => !wp)

    if (slot < 0) {
      reject(new Error('no worker slot available'))
    } else {
      const worker = new AgentWorker({ ...workerArgs, slot })
      agentWorkers[slot] = worker
      resolve(worker)
    }
  })
}

const get = (slot) => {
  if (agentWorkers[slot]) {
    return Promise.resolve(agentWorkers[slot])
  } else {
    return Promise.reject(new Error(`worker slot ${slot} not available`))
  }
}

const free = (worker) => {
  return new Promise((resolve, reject) => {
    worker.Clean()
      .then(() => {
        const slot = agentWorkers.findIndex((wp) => wp === worker)

        if (slot >= 0) {
          agentWorkers[slot] = null
        }
        resolve()
      })
      .catch(reject)
  })
}

module.exports = {
  getStatus,
  allocate,
  get,
  free
}
