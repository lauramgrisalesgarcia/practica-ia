import { describeStudentInsightsServiceContract } from '@/test/contracts/studentInsightsServiceContract'
import { createMockStudentInsightsService } from './mockStudentInsightsService'

describe('mockStudentInsightsService', () => {
  describeStudentInsightsServiceContract((insights) => createMockStudentInsightsService({ insights, delayMs: 0 }))
})
