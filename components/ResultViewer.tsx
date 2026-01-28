
import React from 'react';
import { Question } from '../types';

interface ResultViewerProps {
  questions: Question[];
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ questions }) => {
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
      alert('クリップボードにコピーしました。Word等に貼り付けてください。');
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center text-slate-400 font-bold italic">
        No questions found matching your criteria.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={copyToClipboard}
          className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-xl transition-all flex items-center gap-2 italic uppercase tracking-widest"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy for Word
        </button>
      </div>

      <div id="printable-content" className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm leading-relaxed text-slate-900 font-serif">
        {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([category, qs], catIndex) => (
          <div key={category} className="mb-20">
            <h2 className="text-2xl font-black border-b-8 border-slate-900 pb-3 mb-10 text-slate-900 italic">【{category}】</h2>
            
            {qs.map((q) => (
              <div key={q.displayNumber} className="mb-14 break-inside-avoid">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-black italic bg-slate-900 text-white px-4 py-1 rounded-lg">No.{q.displayNumber}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">({q.year})</span>
                </div>
                
                <div className="mb-8 text-xl font-bold leading-[1.8] whitespace-pre-wrap">{q.body}</div>
                
                {q.imageUrl && (
                  <div className="mb-8 max-w-2xl">
                    <img 
                      src={q.imageUrl} 
                      alt={`Problem Image ${q.displayNumber}`} 
                      className="rounded-2xl shadow-xl border border-slate-200 max-h-[500px] object-contain"
                    />
                  </div>
                )}

                {!q.imageUrl && q.imageDescription && (
                  <div className="mb-8 p-6 bg-slate-50 border-l-8 border-slate-200 rounded-r-2xl italic text-slate-500 font-bold text-sm">
                    [ 画像内容提示: {q.imageDescription} ]
                  </div>
                )}

                {/* 選択肢の縦並び (Vertical List) */}
                <div className="space-y-4 ml-6 mb-8">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex gap-5 items-start text-xl font-medium">
                      <span className="font-black text-slate-300 w-6 shrink-0">{i + 1}.</span>
                      <span className="border-b border-slate-100 pb-1 w-full">{opt}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-300 font-black italic tracking-widest uppercase ml-6">Accuracy Rate: {q.accuracyRate}%</div>
              </div>
            ))}
          </div>
        ))}

        <div className="mt-24 pt-12 border-t-8 border-slate-900 break-before-page">
          <h2 className="text-2xl font-black italic mb-10 uppercase tracking-tighter">【Correct Answers List】</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-y-6 gap-x-10">
            {[...questions].sort((a,b) => {
               const aVal = a.displayNumber.includes('P') ? 1000 + parseInt(a.displayNumber.replace(/\D/g,'')) : parseInt(a.displayNumber.replace(/\D/g,''));
               const bVal = b.displayNumber.includes('P') ? 1000 + parseInt(b.displayNumber.replace(/\D/g,'')) : parseInt(b.displayNumber.replace(/\D/g,''));
               return aVal - bVal;
            }).map((q) => (
              <div key={q.displayNumber} className="text-sm font-bold border-b-2 border-slate-100 pb-2 flex justify-between">
                <span className="text-slate-400 italic">No.{q.displayNumber}</span>
                <span className="text-blue-600 font-black text-lg">{q.correctAnswer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
