const express = require('express')
const debug = require('debug')('botium-core-agent-routes')

const router = express.Router()
const workerpool = require('./agentworkerpool')

/**
 * @swagger
 * definitions:
 *   AgentStatus:
 *     type: object
 *     properties:
 *       software:
 *         type: string
 *       version:
 *         type: string
 *       maxWorkers:
 *         type: integer
 *       currentWorkers:
 *         type: integer
 *   BotMessage:
 *     type: object
 *     properties:
 *       messageText:
 *         type: string
 *       sender:
 *         type: string
 *       channel:
 *         type: string
 *       sourceData:
 *         type: object
 *       sourceAction:
 *         type: string
 *   KeyValues:
 *     type: object
 *     description: A generic list of Key/Value pairs
 *     additionalProperties: true
 */

/**
 * @swagger
 * /api/status:
 *   get:
 *     description: Returns Botium Agent Status
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: AgentStatus
 *         schema:
 *           $ref: '#/definitions/AgentStatus'
 */
router.get('/api/status', (req, res) => {
  res.json(workerpool.getStatus())
})

/**
 * @swagger
 * /api/build:
 *   post:
 *     description: Builds Botium driver for given capabilities, sources and envs in a separate worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: driverParameters
 *         description: Botium Driver parameters
 *         in: body
 *         required: true
 *         schema:
 *           properties:
 *             Capabilities:
 *               $ref: '#/definitions/KeyValues'
 *             Sources:
 *               $ref: '#/definitions/KeyValues'
 *             Envs:
 *               $ref: '#/definitions/KeyValues'
 *     responses:
 *       200:
 *         description: Botium worker slot
 *         schema:
 *           properties:
 *             slot:
 *               type: integer
 */
router.post('/api/build', (req, res, next) => {
  workerpool.allocate()
    .then((worker) => {
      debug(`agent client connected, worker slot ${worker.args.slot}`)
      worker.Build(req.body.Capabilities, req.body.Sources, req.body.Envs)
        .then(() => {
          res.status(200).json({ slot: worker.args.slot })
        })
        .catch((err) => {
          workerpool.free(worker).catch(debug)
          next(err)
        })
    })
    .catch(next)
})

/**
 * @swagger
 * /api/start/{slot}:
 *   post:
 *     description: Starts Botium driver for given worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Botium driver started
 */
router.post('/api/start/:slot', (req, res, next) => {
  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.Start()
        .then(() => {
          res.status(200).send()
        })
        .catch(next)
    })
    .catch(next)
})

/**
 * @swagger
 * /api/usersays/{slot}:
 *   post:
 *     description: Sends user message to Botium driver for given worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *       - name: msg
 *         description: User message
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/BotMessage'
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/api/usersays/:slot', (req, res, next) => {
  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.UserSays(req.body)
        .then(() => {
          res.status(200).send()
        })
        .catch(next)
    })
    .catch(next)
})

/**
 * @swagger
 * /api/botsays/{slot}:
 *   post:
 *     description: Retrieves bot message from Botium driver for given worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *       - name: args
 *         description: Wait arguments
 *         in: body
 *         required: false
 *         schema:
 *           properties:
 *             channel:
 *               type: string
 *             timeoutMillis:
 *               type: integer
 *     responses:
 *       200:
 *         description: Message retrieved
 *         schema:
 *           $ref: '#/definitions/BotMessage'
 */
router.post('/api/botsays/:slot', (req, res, next) => {
  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.WaitBotSays(req.body.channel, req.body.timeoutMillis)
        .then((botMsg) => {
          res.status(200).json(botMsg || {})
        })
        .catch(next)
    })
    .catch(next)
})

/**
 * @swagger
 * /api/stop/{slot}:
 *   post:
 *     description: Stops Botium driver for given worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Botium driver stopped
 */
router.post('/api/stop/:slot', (req, res, next) => {
  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.Stop()
        .then(() => {
          res.status(200).send()
        })
        .catch(next)
    })
    .catch(next)
})

/**
 * @swagger
 * /api/runscript/{slot}:
 *   post:
 *     description: Run the Botium script for given worker slot, starting and stopping container as needed
 *     produces:
 *       - application/json
 *     consumes:
 *       - text/plain
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *       - name: script
 *         description: Botium script
 *         in: body
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Script successful
 */
router.post('/api/runscript/:slot', (req, res, next) => {
  if (!req.body) return next(new Error('no script body given'))

  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.Start()
        .then(() => worker.RunScript(req.body))
        .then(() => worker.Stop())
        .then(() => {
          res.status(200).send()
        })
        .catch((err) => {
          worker.Stop().then(() => next(err)).catch(next)
        })
    })
    .catch(next)
})

/**
 * @swagger
 * /api/runscript_body/{slot}:
 *   post:
 *     description: Run the Botium script for given worker slot, starting and stopping container as needed
 *     produces:
 *       - application/json
 *     consumes:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *       - name: args
 *         description: Script arguments
 *         in: body
 *         required: true
 *         schema:
 *           properties:
 *             script:
 *               type: string
 *               description: Botium script
 *     responses:
 *       200:
 *         description: Script successful
 */
router.post('/api/runscript_body/:slot', (req, res, next) => {
  if (!req.body || !req.body.script) return next(new Error('no script parameter given'))

  workerpool.get(req.params.slot)
    .then((worker) => {
      worker.Start()
        .then(() => worker.RunScript(req.body.script))
        .then(() => worker.Stop())
        .then(() => {
          res.status(200).send()
        })
        .catch((err) => {
          worker.Stop().then(() => next(err)).catch(next)
        })
    })
    .catch(next)
})

/**
 * @swagger
 * /api/clean/{slot}:
 *   post:
 *     description: Cleans Botium driver for given worker slot and free worker slot
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: slot
 *         description: Worker slot
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Botium driver cleaned and worker slot available
 */
router.post('/api/clean/:slot', (req, res, next) => {
  workerpool.get(req.params.slot)
    .then((worker) => {
      workerpool.free(worker)
        .then(() => {
          res.status(200).send()
        })
        .catch(next)
    })
    .catch(next)
})

module.exports = router
