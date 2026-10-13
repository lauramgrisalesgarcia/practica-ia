import { describeTeacherLessonServiceContract } from '../../test/contracts/teacherLessonServiceContract'
import { createMockTeacherLessonService } from './mockTeacherLessonService'

describe('mockTeacherLessonService', () => {
  describeTeacherLessonServiceContract((lessons) => createMockTeacherLessonService({ lessons, delayMs: 0 }))
})
