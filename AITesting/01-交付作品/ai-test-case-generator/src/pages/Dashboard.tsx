import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'AI 智能生成',
      description: '基于需求自动生成覆盖全面的测试用例',
    },
    {
      title: '结构化输出',
      description: '包含前置条件、操作步骤、预期结果等完整字段',
    },
    {
      title: '一键导出',
      description: '支持 Excel 和 Markdown 格式导出',
    },
  ];

  return (
    <div className="min-h-full flex flex-col items-center text-center px-4">
      <h1 className="text-3xl font-bold text-white mt-20">
        AI 测试用例生成器
      </h1>
      <p className="text-gray-400 mt-2">
        输入需求文档，AI 自动生成结构化测试用例
      </p>

      <button
        onClick={() => navigate('/generate')}
        className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg text-lg transition-colors"
      >
        开始生成
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto w-full">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500 transition-colors duration-300 text-left"
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-400 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
