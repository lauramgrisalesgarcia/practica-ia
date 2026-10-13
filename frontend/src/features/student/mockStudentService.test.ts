import { describeStudentServiceContract, PDF_CONTENT } from '../../test/contracts/studentServiceContract'
import { createMockStudentService } from './mockStudentService'

describe('mockStudentService', () => {
  describeStudentServiceContract(({ lessons, materials }) =>
    createMockStudentService({ lessons, materials, pdfContent: PDF_CONTENT, delayMs: 0 }),
  )
})
