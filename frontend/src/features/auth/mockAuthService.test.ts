import { describeAuthServiceContract } from '../../test/contracts/authServiceContract'
import { createMockAuthService } from './mockAuthService'

describe('mockAuthService', () => {
  describeAuthServiceContract((account) => createMockAuthService({ users: [account], delayMs: 0 }))
})
