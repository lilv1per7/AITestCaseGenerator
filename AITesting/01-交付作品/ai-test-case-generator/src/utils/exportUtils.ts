import * as XLSX from 'xlsx';
import { TestCase } from '../types';

// 获取当前日期的格式化字符串 YYYYMMDD
const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export function exportToExcel(testCases: TestCase[]) {
  // 1. 准备主数据：测试用例
  const excelData = testCases.map(tc => ({
    'ID': tc.id,
    '标题': tc.title,
    '模块': tc.module,
    '优先级': tc.priority,
    '类型': tc.type,
    '前置条件': tc.preCondition || '',
    '操作步骤': tc.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    '预期结果': tc.expectedResult,
    '测试数据': tc.data || '',
    '自动化': tc.automation
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);

  // 设置列宽
  const wscols = [
    { wch: 10 }, // ID
    { wch: 30 }, // 标题
    { wch: 15 }, // 模块
    { wch: 10 }, // 优先级
    { wch: 15 }, // 类型
    { wch: 25 }, // 前置条件
    { wch: 40 }, // 操作步骤
    { wch: 30 }, // 预期结果
    { wch: 20 }, // 测试数据
    { wch: 15 }  // 自动化
  ];
  ws['!cols'] = wscols;

  // 设置简单的样式（xlsx 基础版不支持丰富的单元格样式，如需更复杂样式需要 xlsx-js-style，这里利用默认生成即可）
  // 为了换行生效，xlsx 会默认识别文本中的 \n
  
  // 2. 准备统计数据
  const priorityCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  
  testCases.forEach(tc => {
    priorityCount[tc.priority] = (priorityCount[tc.priority] || 0) + 1;
    typeCount[tc.type] = (typeCount[tc.type] || 0) + 1;
  });

  const statsData = [
    { '统计维度': '总用例数', '数量': testCases.length },
    { '统计维度': '', '数量': '' },
    { '统计维度': '--- 按优先级统计 ---', '数量': '' },
    ...Object.entries(priorityCount).map(([key, value]) => ({ '统计维度': key, '数量': value })),
    { '统计维度': '', '数量': '' },
    { '统计维度': '--- 按测试类型统计 ---', '数量': '' },
    ...Object.entries(typeCount).map(([key, value]) => ({ '统计维度': key, '数量': value })),
  ];

  const statsWs = XLSX.utils.json_to_sheet(statsData);
  statsWs['!cols'] = [{ wch: 25 }, { wch: 15 }];

  // 3. 创建 Workbook 并添加工作表
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "测试用例");
  XLSX.utils.book_append_sheet(wb, statsWs, "统计");

  // 4. 触发下载
  const filename = `测试用例_${getFormattedDate()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportToMarkdown(testCases: TestCase[]) {
  const dateStr = new Date().toLocaleString('zh-CN', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  let mdContent = `# AI 生成测试用例\n\n`;
  mdContent += `> 生成时间：${dateStr}\n> 总用例数：${testCases.length}\n\n`;
  
  mdContent += `## 测试用例列表\n\n`;
  
  // 表头
  mdContent += `| ID | 标题 | 模块 | 优先级 | 类型 | 前置条件 | 操作步骤 | 预期结果 | 测试数据 | 自动化 |\n`;
  mdContent += `|---|---|---|---|---|---|---|---|---|---|\n`;

  // 表格内容
  testCases.forEach(tc => {
    // 替换文本中的换行符和管道符，防止破坏 Markdown 表格结构
    const escapeMd = (str: string) => str ? str.replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
    
    const stepsStr = tc.steps.map((step, idx) => `${idx + 1}. ${step}`).join('<br>');
    
    mdContent += `| ${escapeMd(tc.id)} | ${escapeMd(tc.title)} | ${escapeMd(tc.module)} | ${escapeMd(tc.priority)} | ${escapeMd(tc.type)} | ${escapeMd(tc.preCondition)} | ${escapeMd(stepsStr)} | ${escapeMd(tc.expectedResult)} | ${escapeMd(tc.data || '')} | ${escapeMd(tc.automation)} |\n`;
  });

  // 创建 Blob 并下载
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `测试用例_${getFormattedDate()}.md`;
  document.body.appendChild(a);
  a.click();
  
  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
