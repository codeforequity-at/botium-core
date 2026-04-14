import BaseRepo from './BaseRepo.js'

export default class NoRepo extends BaseRepo {
  Validate () {
    return super.Validate()
  }

  Prepare () {
    return super.Prepare()
  }
};
