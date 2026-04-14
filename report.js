import path from 'path'
import os from 'os'
import { readFileSync } from 'fs'
import { pathToFileURL } from 'url'
import https from 'https'
import http from 'http'

const botiumAnalyticsHost = process.env.BOTIUM_ANALYTICS_HOST || 'v1.license.botium.cyaraportal.us'
const botiumAnalyticsPort = process.env.BOTIUM_ANALYTICS_PORT || 443
const httpsOrHttp = botiumAnalyticsPort === 443 ? https : http

const execTimeout = 10000

function logIfVerbose (toLog, stream) {
  if (process.env.BOTIUM_ANALYTICS_VERBOSE === 'true') {
    (stream || console.log)(toLog)
  }
}

async function reportPostInstall () {
  if (process.env.BOTIUM_ANALYTICS === 'false') return

  const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

  const infoPayload = {
    rawPlatform: os.platform(),
    rawArch: os.arch(),
    library: packageJson.name,
    version: packageJson.version
  }

  const data = JSON.stringify(infoPayload)
  logIfVerbose(`Botium analytics payload: ${data}`)

  const reqOptions = {
    host: botiumAnalyticsHost,
    port: botiumAnalyticsPort,
    method: 'POST',
    path: '/metrics/installation/core',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: execTimeout
  }
  await new Promise((resolve, reject) => {
    const req = httpsOrHttp.request(reqOptions, (res) => {
      logIfVerbose(`Response status: ${res.statusCode}`)
      resolve()
    })

    req.on('error', error => {
      logIfVerbose(error, console.error)
      reject(error)
    })

    req.on('timeout', error => {
      logIfVerbose(error, console.error)
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url

if (isMain) {
  try {
    reportPostInstall().catch(e => {
      logIfVerbose(`\n\n${e}`, console.error)
    }).finally(() => {
      process.exit(0)
    })
  } catch (e) {
    logIfVerbose(`\n\nTop level error: ${e}`, console.error)
    process.exit(0)
  }
}
