import { describeTeacherLessonServiceContract, PDF_CONTENT } from '../../../test/contracts/teacherLessonServiceContract'
import { createMockTeacherLessonService } from './mockTeacherLessonService'

describe('mockTeacherLessonService', () => {
  describeTeacherLessonServiceContract(({ lessonsByStudent, lessons }) =>
    createMockTeacherLessonService({ lessonsByStudent, lessons, pdfContent: PDF_CONTENT, delayMs: 0 }),
  )
})
