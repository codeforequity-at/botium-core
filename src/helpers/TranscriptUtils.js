import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import { parse as csvParseSync } from 'csv-parse/sync'

/**
 * Find transcription for an audio file: .txt same base name, or transcript.csv in parent dirs.
 * @param {string} baseDir - Base directory for resolving paths
 * @param {string} audioFile - Relative path to audio file
 * @param {object} [options] - Optional: { csvCache: {}, onError: (msg) => {} }
 * @returns {string|null} Transcription text or null
 */
export function findTranscription (baseDir, audioFile, options = {}) {
  const { csvCache = {}, onError } = options
  const transcriptionFilename = `${audioFile.substring(0, audioFile.lastIndexOf('.'))}.txt`
  const transcriptionFilenameAbs = path.resolve(baseDir, transcriptionFilename)
  try {
    if (fs.existsSync(transcriptionFilenameAbs)) {
      return fs.readFileSync(transcriptionFilenameAbs, { encoding: 'utf-8' }).trim()
    }
  } catch (err) {
    if (onError) onError(`Transcription File ${transcriptionFilenameAbs} not readable: ${err.message}`)
    throw new Error(`Reading transcription file ${transcriptionFilename} for ${audioFile} failed`)
  }
  if (csvCache[audioFile]) {
    return csvCache[audioFile]
  }
  const audioFileComponents = audioFile.split('/')
  for (let parentIndex = audioFileComponents.length - 1; parentIndex >= 0; parentIndex--) {
    const csvDirectory = audioFileComponents.slice(0, parentIndex)
    const csvFilename = path.join(...csvDirectory, 'transcript.csv')
    const csvFilenameAbs = path.resolve(baseDir, csvFilename)
    try {
      if (fs.existsSync(csvFilenameAbs)) {
        const records = csvParseSync(fs.readFileSync(csvFilenameAbs, { encoding: 'utf-8' }).trim(), {
          columns: ['filename', 'transcription'],
          delimiter: [',', ';', ':', '\t'],
          trim: true,
          skip_empty_lines: true
        })
        if (records && records.length > 0) {
          for (const record of records) {
            const fnKey = path.join(...csvDirectory, record.filename)
            csvCache[fnKey] = record.transcription
          }
        }
      }
    } catch (err) {
      if (onError) onError(`Transcription CSV File ${csvFilenameAbs} not readable: ${err.message}`)
      throw new Error(`Reading transcription CSV file for ${csvFilename} failed`)
    }
    if (csvCache[audioFile]) {
      return csvCache[audioFile]
    }
  }
  return null
}

/**
 * Derive transcription text from audio filename (basename without extension, underscores/hyphens → spaces).
 * @param {string} audioFile - Path or filename of audio file
 * @returns {string}
 */
export function transcriptionFromFilename (audioFile) {
  const filename = path.basename(audioFile, path.extname(audioFile))
  return filename.split(/[_-]+/).join(' ')
}

export function hasWaitForBotTimeout (transciptError) {
  if (!transciptError) {
    return false
  }
  const str = transciptError.message || (_.isString(transciptError) ? transciptError : null)
  if (!str) {
    return false
  }
  return str.indexOf(': error waiting for bot - Bot did not respond within') > 0
}

export default {
  findTranscription,
  transcriptionFromFilename,
  hasWaitForBotTimeout
}
