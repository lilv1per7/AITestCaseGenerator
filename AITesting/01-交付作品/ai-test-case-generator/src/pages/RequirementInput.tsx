import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestCase } from '../types';
import { generateTestCasesStream } from '../services/aiService';
import { exportToExcel, exportToMarkdown } from '../utils/exportUtils';

const MOCK_TEST_CASES: TestCase[] = [
  {
    id: "TC001",
    title: "用户名有效等价类测试-正常长度",
    module: "用户登录",
    priority: "P0",
    type: "功能测试",
    preCondition: "系统已启动，处于登录页面",
    steps: [
      "在用户名输入框输入8位字母数字混合字符（如：user_123）",
      "在密码输入框输入正确密码（如：pass1234）",
      "点击登录按钮"
    ],
    expectedResult: "登录成功，跳转到系统首页",
    data: "username: user_123, password: password1234",
    automation: "可自动化"
  },
  {
    id: "TC002",
    title: "用户名边界值测试-刚好3位",
    module: "用户登录",
    priority: "P1",
    type: "边界值测试",
    preCondition: "系统已启动，处于登录页面",
    steps: [
      "在用户名输入框输入3位字母（如：abc）",
      "在密码输入框输入正确密码",
      "点击登录按钮"
    ],
    expectedResult: "登录成功，跳转到系统首页",
    data: "username: abc, password: password1234",
    automation: "可自动化"
  },
  {
    id: "TC003",
    title: "密码有效等价类测试-包含特殊字符",
    module: "用户登录",
    priority: "P1",
    type: "功能测试",
    preCondition: "系统已启动，处于登录页面",
    steps: [
      "在用户名输入框输入正确的用户名",
      "在密码输入框输入包含特殊字符的密码（如：pass@123）",
      "点击登录按钮"
    ],
    expectedResult: "登录成功，跳转到系统首页",
    data: "username: user_123, password: pass@123",
    automation: "需人工"
  },
  {
    id: "TC004",
    title: "异常测试-密码错误达到5次",
    module: "用户登录",
    priority: "P0",
    type: "异常测试",
    preCondition: "系统已启动，处于登录页面",
    steps: [
      "连续5次使用错误的密码尝试登录同一有效账号",
      "第6次尝试使用正确的密码登录"
    ],
    expectedResult: "前5次提示密码错误。第6次提示账号已被锁定，需等待30分钟，且无法登录成功",
    data: "username: user_123, password: wrong_password",
    automation: "可自动化"
  },
  {
    id: "TC005",
    title: "功能测试-记住我免登录功能验证",
    module: "用户登录",
    priority: "P2",
    type: "功能测试",
    preCondition: "系统已启动，处于登录页面",
    steps: [
      "输入正确的用户名和密码",
      "勾选【记住我7天免登录】选项",
      "点击登录按钮成功进入系统",
      "关闭浏览器后重新打开并访问系统"
    ],
    expectedResult: "重新访问系统时，无需重新输入账号密码，直接进入系统首页",
    data: "username: user_123, password: password1234",
    automation: "暂不适用"
  }
];

export default function RequirementInput() {
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState('');
  const [testType, setTestType] = useState('全部');
  const [count, setCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    
    setLoading(true);
    setTestCases([]); // 清空上次的数据
    try {
      await generateTestCasesStream(requirement, testType, count, (updatedCases) => {
        setTestCases(updatedCases);
      });
    } catch (error) {
      console.error(error);
      alert('AI 生成失败，将展示 Mock 数据。错误信息: ' + (error instanceof Error ? error.message : String(error)));
      setTestCases(MOCK_TEST_CASES);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCases(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-900/50 text-red-400 border-red-800';
      case 'P1': return 'bg-orange-900/50 text-orange-400 border-orange-800';
      case 'P2': return 'bg-blue-900/50 text-blue-400 border-blue-800';
      case 'P3': return 'bg-gray-800 text-gray-400 border-gray-700';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const filteredCases = testCases.filter(tc => {
    const matchPriority = filterPriority === 'all' || tc.priority === filterPriority;
    const matchSearch = searchKeyword === '' || 
      tc.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      tc.module.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchPriority && matchSearch;
  });

  const stats = {
    total: testCases.length,
    p0: testCases.filter(tc => tc.priority === 'P0').length,
    p1: testCases.filter(tc => tc.priority === 'P1').length,
    auto: testCases.filter(tc => tc.automation === '可自动化').length
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* 头部：需求录入区 */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white flex items-center mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </button>

        <h1 className="text-2xl font-bold text-white mb-4">需求录入</h1>
        
        <div className="relative mb-4">
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
            placeholder="示例需求：用户登录功能。用户名3-20位字母数字下划线，密码6-20位。连续5次登录失败锁定30分钟。支持记住我7天免登录。"
          />
          <div className="absolute bottom-3 right-4 text-xs text-gray-500">
            {requirement.length} 字
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">测试类型</label>
            <select 
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
            >
              <option value="全部">全部</option>
              <option value="功能测试">功能测试</option>
              <option value="边界值测试">边界值测试</option>
              <option value="异常测试">异常测试</option>
              <option value="性能测试">性能测试</option>
              <option value="兼容性测试">兼容性测试</option>
            </select>
          </div>

          <div className="flex items-center gap-3 flex-1">
            <label className="text-sm text-gray-400 whitespace-nowrap">期望数量: {count}</label>
            <input 
              type="range" 
              min="10" 
              max="30" 
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-48 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !requirement.trim()}
            className={`px-8 py-2.5 rounded-lg text-white font-medium transition-all
              ${loading || !requirement.trim() 
                ? 'bg-gray-700 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20'}`}
          >
            {loading ? '生成中...' : '生成用例'}
          </button>
        </div>
      </div>

      {/* 下半部分：用例结果区 */}
      {testCases.length > 0 && (
        <div className="animate-fade-in">
          <hr className="border-gray-800 mb-8" />
          
          {/* 统计行 */}
          <div className="flex gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg flex gap-4 text-sm">
              <span className="text-gray-400">共 <strong className="text-white text-base">{stats.total}</strong> 条</span>
              <span className="text-gray-600">|</span>
              <span className="text-red-400">P0: <strong className="text-white text-base">{stats.p0}</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-orange-400">P1: <strong className="text-white text-base">{stats.p1}</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-indigo-400">可自动化: <strong className="text-white text-base">{stats.auto}</strong></span>
            </div>
          </div>

          {/* 筛选与操作行 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="搜索标题或模块..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white w-64 focus:border-indigo-500 outline-none"
              />
              
              <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
                {['all', 'P0', 'P1', 'P2', 'P3'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filterPriority === p 
                        ? 'bg-gray-800 text-white font-medium' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {p === 'all' ? '全部' : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => exportToExcel(filteredCases)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                导出 Excel
              </button>
              <button 
                onClick={() => exportToMarkdown(filteredCases)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                导出 Markdown
              </button>
            </div>
          </div>

          {/* 用例列表 */}
          <div className="space-y-3">
            {filteredCases.map(tc => {
              const isExpanded = expandedCases.has(tc.id);
              return (
                <div key={tc.id} className="bg-gray-900 border border-gray-800 rounded-lg transition-all hover:border-gray-700">
                  {/* 卡片头部（点击可展开） */}
                  <div 
                    className="p-4 flex items-center cursor-pointer select-none"
                    onClick={() => toggleExpand(tc.id)}
                  >
                    <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityColor(tc.priority)} font-mono mr-3`}>
                      {tc.priority}
                    </span>
                    <span className="text-gray-200 font-medium flex-1 truncate pr-4">
                      {tc.id} - {tc.title}
                    </span>
                    <span className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-md mr-4">
                      {tc.type}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* 卡片详情内容 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-800/50 bg-gray-900/30">
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1 uppercase">模块</h4>
                          <p className="text-sm text-gray-300">{tc.module}</p>
                        </div>
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1 uppercase">自动化建议</h4>
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            tc.automation === '可自动化' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                            tc.automation === '需人工' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {tc.automation}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {tc.preCondition && (
                          <div>
                            <h4 className="text-xs text-gray-500 mb-1 uppercase">前置条件</h4>
                            <p className="text-sm text-gray-300 bg-gray-950 p-2 rounded border border-gray-800">{tc.preCondition}</p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-xs text-gray-500 mb-1 uppercase">测试步骤</h4>
                          <ol className="list-decimal list-inside text-sm text-gray-300 bg-gray-950 p-3 rounded border border-gray-800 space-y-1">
                            {tc.steps.map((step, idx) => (
                              <li key={idx} className="pl-1">{step}</li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <h4 className="text-xs text-gray-500 mb-1 uppercase">预期结果</h4>
                          <p className="text-sm text-green-400 bg-gray-950 p-2 rounded border border-gray-800">{tc.expectedResult}</p>
                        </div>

                        {tc.data && (
                          <div>
                            <h4 className="text-xs text-gray-500 mb-1 uppercase">测试数据</h4>
                            <code className="text-xs text-blue-400 bg-gray-950 p-2 rounded border border-gray-800 block font-mono">
                              {tc.data}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredCases.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-lg">
                没有找到符合条件的测试用例
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
