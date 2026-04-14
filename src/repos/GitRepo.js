import path from 'path'
import async from 'async'
import { mkdirp } from 'mkdirp'
import Source from '../Source.js'
import BaseRepo from './BaseRepo.js'
import ProcessUtils from '../helpers/ProcessUtils.js'
import createDebug from 'debug'
const debug = createDebug('botium-core-GitRepo')

export default class GitRepo extends BaseRepo {
  Validate () {
    return super.Validate().then(() => {
      this._AssertSourceExists(Source.GITPATH)
      this._AssertSourceExists(Source.GITURL)
      this._AssertSourceExists(Source.GITBRANCH)
      this._AssertSourceExists(Source.GITDIR)
    })
  }

  Prepare () {
    return new Promise((resolve, reject) => {
      async.series([

        (cloneDirectoryCreated) => {
          this.workingDirectory = path.resolve(this.tempDirectory, 'git')

          mkdirp(this.workingDirectory, (err) => {
            if (err) {
              return cloneDirectoryCreated(new Error(`Unable to create clone directory ${this.workingDirectory}: ${err}`))
            }
            cloneDirectoryCreated()
          })
        },

        (cloneReady) => {
          const gitCmdOptions = [
            'clone',
            '-b',
            this.sources[Source.GITBRANCH],
            '--single-branch',
            '--depth',
            '1',
            this.sources[Source.GITURL],
            this.workingDirectory
          ]
          ProcessUtils.childProcessRun(this.sources[Source.GITPATH], gitCmdOptions, false, { cwd: this.workingDirectory })
            .then(() => cloneReady())
            .catch(cloneReady)
        },

        (workingDirectoryChanged) => {
          this.workingDirectory = path.resolve(this.workingDirectory, this.sources[Source.GITDIR])
          workingDirectoryChanged()
        },

        (prepareReady) => {
          if (this.sources[Source.GITPREPARECMD]) {
            ProcessUtils.childCommandLineRun(this.sources[Source.GITPREPARECMD], false, { cwd: this.workingDirectory })
              .then(() => prepareReady())
              .catch(prepareReady)
          } else {
            prepareReady()
          }
        }

      ], (err) => {
        if (err) {
          return reject(err)
        }
        debug(`git checkout out to ${this.workingDirectory}`)
        resolve()
      })
    })
  }
};
