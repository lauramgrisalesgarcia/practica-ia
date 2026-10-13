import { describeTeacherServiceContract } from '../../../test/contracts/teacherServiceContract'
import { createMockTeacherService } from './mockTeacherService'

describe('mockTeacherService', () => {
  describeTeacherServiceContract((students) => createMockTeacherService({ students, delayMs: 0 }))
})
