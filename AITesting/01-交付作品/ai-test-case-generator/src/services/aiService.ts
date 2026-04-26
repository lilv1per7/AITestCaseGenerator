import { TestCase, ReviewReport } from '../types';

const API_URL = '/api/v1/chat/completions';

const getHeaders = () => {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 API Key，请在 .env 文件中设置 VITE_DEEPSEEK_API_KEY');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
};

const getModel = () => {
  return import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3';
};

export async function generateTestCasesStream(
  requirement: string, 
  testType: string, 
  count: number,
  onUpdate: (testCases: TestCase[]) => void
): Promise<void> {
  const systemPrompt = `你是一位拥有10年经验的资深测试专家。请基于以下需求文档，使用等价类划分、边界值分析、错误推测法生成约 ${count} 条结构化测试用例。
必须严格返回JSON数组，且包裹在一个对象的 "testCases" 属性中。
每个元素包含：
- id (用例编号，如 TC001)
- title (用例标题)
- module (所属模块)
- priority (优先级，如 P0, P1, P2, P3)
- type (测试类型：${testType})
- preCondition (前置条件)
- steps (测试步骤数组，元素为字符串)
- expectedResult (预期结果)
- data (测试数据，可选)
- automation (自动化程度：可自动化, 需人工, 暂不适用)

示例格式：
{
  "testCases": [
    {
      "id": "TC001",
      "title": "...",
      ...
    }
  ]
}
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `需求说明：\n${requirement}\n\n期望测试类型重点关注：${testType}` }
        ],
        stream: true,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 请求失败: ${response.status} ${response.statusText} ${errorData.message || ''}`);
    }

    if (!response.body) throw new Error('ReadableStream not supported.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let jsonString = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const message = line.replace(/^data: /, '').trim();
        if (message === '[DONE]') continue;
        if (!message) continue;

        try {
          const parsed = JSON.parse(message);
          const contentDelta = parsed.choices[0]?.delta?.content || '';
          jsonString += contentDelta;
          
          // 尝试尽力解析当前已接收到的部分 JSON
          // 使用简单的正则匹配出已经闭合的 JSON 对象，或者简单尝试修复 JSON 结尾
          try {
            // 简单的流式 JSON 解析策略：
            // 因为返回格式是 {"testCases": [ {..}, {..} ...
            // 我们寻找最后一次闭合的 "}" 来截断不完整的 JSON
            let validJsonToParse = jsonString;
            if (!validJsonToParse.endsWith('}')) {
               // 尝试补全 JSON 结构用于预览
               const lastBraceIndex = validJsonToParse.lastIndexOf('}');
               if (lastBraceIndex !== -1) {
                 validJsonToParse = validJsonToParse.substring(0, lastBraceIndex + 1) + ']}';
               } else {
                 continue; // 还没接收到完整的对象，跳过
               }
            }

            const parsedObj = JSON.parse(validJsonToParse);
            if (parsedObj && parsedObj.testCases && Array.isArray(parsedObj.testCases)) {
              // 过滤掉还未生成完 id 和 title 的残缺用例
              const validCases = parsedObj.testCases.filter((tc: any) => tc.id && tc.title);
              if (validCases.length > 0) {
                 onUpdate(validCases as TestCase[]);
              }
            }
          } catch (e) {
            // 忽略流式解析过程中的临时 JSON 语法错误
          }
        } catch (e) {
          console.error('Error parsing stream message', e, message);
        }
      }
    }

    // 最终结束后再做一次全量解析确保数据完整
    try {
       const finalObj = JSON.parse(jsonString);
       if (finalObj && finalObj.testCases) {
          onUpdate(finalObj.testCases as TestCase[]);
       }
    } catch(e) {
       console.error("最终 JSON 解析失败:", e);
    }
  } catch (error) {
    console.error('流式生成测试用例失败:', error);
    throw new Error(error instanceof Error ? error.message : '生成测试用例时发生未知错误');
  }
}

export async function reviewTestCases(testCases: TestCase[], requirement: string): Promise<ReviewReport> {
  try {
    const systemPrompt = `你是一位拥有10年经验的资深测试专家。请基于原始需求和给定的测试用例列表，评审用例的质量、覆盖率、遗漏场景，并给出改进建议。
必须返回JSON格式对象，包含以下属性：
- score (整体评分，0-100)
- issues (发现的问题列表，每个问题包含 type, description, suggestion, 相关的 relatedCaseId)
- improvements (整体改进建议列表，字符串数组)
- overallComment (总体评价)

示例格式：
{
  "score": 85,
  "issues": [
    {
      "type": "遗漏边界值",
      "description": "未考虑输入为空的情况",
      "suggestion": "增加为空的测试用例",
      "relatedCaseId": "TC001"
    }
  ],
  "improvements": ["建议增加性能测试用例"],
  "overallComment": "用例覆盖了主要功能，但在异常场景下有欠缺。"
}
`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `【原始需求】\n${requirement}\n\n【测试用例】\n${JSON.stringify(testCases, null, 2)}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 请求失败: ${response.status} ${response.statusText} ${errorData.message || ''}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('API 返回内容为空');
    }

    const parsedContent = JSON.parse(content);
    return parsedContent as ReviewReport;
  } catch (error) {
    console.error('评审测试用例失败:', error);
    throw new Error(error instanceof Error ? error.message : '评审测试用例时发生未知错误');
  }
}
