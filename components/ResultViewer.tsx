
import React from 'react';
import { Question } from '../types';

interface ResultViewerProps {
  questions: Question[];
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ questions }) => {
  // 分野（category）ごとにグループ化
  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const copyToClipboard = () => {
    const element = document.getElementById('printable-content');
    if (element) {
      const range = document.createRange();
      range.selectNode(element);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
      alert('クリップボードにコピーしました。Word等に貼り付けてください。\n（分野間は2行、問題間は1行の改行が維持されます）');
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
        指定された条件に合致する問題は見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={copyToClipboard}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Word形式でコピー
        </button>
      </div>

      <div id="printable-content" className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm leading-relaxed text-slate-800">
        {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([category, qs], catIndex) => (
          <div key={category}>
            {/* 分野間の2行改行 (最初の分野以外) */}
            {catIndex > 0 && (
              <div style={{ userSelect: 'none' }}>
                <br />
                <br />
              </div>
            )}
            
            <h2 className="text-2xl font-bold border-b-4 border-slate-900 pb-2 mb-8 text-slate-900">【{category}】</h2>
            
            {qs.map((q, qIndex) => (
              <div key={q.displayNumber}>
                {/* 問題間の1行改行 (最初の問題以外) */}
                {qIndex > 0 && (
                  <div style={{ userSelect: 'none' }}>
                    <br />
                  </div>
                )}
                
                <div className="mb-8 border-l-4 border-slate-100 pl-6">
                  <p className="font-bold text-lg mb-3">問題 {q.displayNumber}</p>
                  <div className="mb-4 whitespace-pre-wrap text-lg leading-relaxed">{q.body}</div>
                  
                  {q.imageDescription && (
                    <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        【画像解析（スクリーンショット内容）】
                      </div>
                      <p className="text-blue-800 text-sm italic">{q.imageDescription}</p>
                    </div>
                  )}

                  <div className="space-y-1 ml-4 mb-4">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-bold">{i + 1}.</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 font-medium italic">（4校正答率: {q.accuracyRate}%）</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="mt-20 pt-10 border-t-4 border-slate-900">
          <h2 className="text-xl font-bold mb-8">【正解一覧】</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-y-4 gap-x-8">
            {[...questions].sort((a,b) => a.displayNumber.localeCompare(b.displayNumber, undefined, {numeric: true})).map((q) => (
              <div key={q.displayNumber} className="text-sm border-b border-slate-100 pb-1">
                <span className="font-bold mr-2">{q.displayNumber}:</span>
                <span className="text-blue-700 font-bold">{q.correctAnswer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
