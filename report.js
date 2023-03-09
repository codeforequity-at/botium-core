const path = require('path')
const os = require('os')

const botiumAnalyticsHost = process.env.BOTIUM_ANALYTICS_HOST || 'v1.license.botium.cyaraportal.us'
const botiumAnalyticsPort = process.env.BOTIUM_ANALYTICS_PORT || 443
const https = botiumAnalyticsPort === 443 ? require('https') : require('http')

const execTimeout = 10000

function logIfVerbose (toLog, stream) {
  if (process.env.BOTIUM_ANALYTICS_VERBOSE === 'true') {
    (stream || console.log)(toLog)
  }
}

async function reportPostInstall () {
  if (process.env.BOTIUM_ANALYTICS === 'false') return

  const packageJson = require(path.join(__dirname, 'package.json'))

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
    const req = https.request(reqOptions, (res) => {
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

if (require.main === module) {
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
