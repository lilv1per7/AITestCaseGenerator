export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TestType = '功能测试' | '边界值测试' | '异常测试' | '性能测试' | '兼容性测试';
export type AutomationType = '可自动化' | '需人工' | '暂不适用';

export interface TestCase {
  id: string;
  title: string;
  module: string;
  priority: Priority;
  type: TestType;
  preCondition: string;
  steps: string[];
  expectedResult: string;
  data?: string;
  automation: AutomationType;
}

export interface Issue {
  type: string;
  description: string;
  suggestion: string;
  relatedCaseId?: string;
}

export interface ReviewReport {
  score: number;
  issues: Issue[];
  improvements: string[];
  overallComment: string;
}
