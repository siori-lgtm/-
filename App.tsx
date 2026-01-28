
import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { ResultViewer } from './components/ResultViewer';
import { FilterConfig, ProcessingStatus, ProblemSetResponse, AccuracyRate, FileItem } from './types';
import { processExamPdfs } from './services/geminiService';
import { PT_FIELDS, ACCURACY_OPTIONS } from './constants';

const App: React.FC = () => {
  const [questionPdfs, setQuestionPdfs] = useState<FileItem[]>([]);
  const [dataPdfs, setDataPdfs] = useState<FileItem[]>([]);
  const [config, setConfig] = useState<FilterConfig>({
    accuracyThreshold: '80',
    fields: PT_FIELDS.map(f => f.label) // 初期状態は全選択
  });
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<ProblemSetResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProcess = async () => {
    if (questionPdfs.length === 0 || dataPdfs.length === 0) {
      alert("問題PDFと正答率PDFの両方をアップロードしてください。");
      return;
    }
    if (config.fields.length === 0) {
      alert("抽出する分野を少なくとも1つ選択してください。");
      return;
    }

    setStatus('processing');
    setErrorMessage(null);

    try {
      const data = await processExamPdfs(questionPdfs, dataPdfs, config);
      setResult(data);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setErrorMessage("PDFの解析中にエラーが発生しました。ファイル数を減らすか、PDFの内容を確認してください。");
      setStatus('error');
    }
  };

  const toggleField = (label: string) => {
    setConfig(prev => {
      const isSelected = prev.fields.includes(label);
      return {
        ...prev,
        fields: isSelected 
          ? prev.fields.filter(f => f !== label)
          : [...prev.fields, label]
      };
    });
  };

  const selectAllFields = () => setConfig(prev => ({ ...prev, fields: PT_FIELDS.map(f => f.label) }));
  const deselectAllFields = () => setConfig(prev => ({ ...prev, fields: [] }));

  const removeFile = (id: string, type: 'question' | 'data') => {
    if (type === 'question') {
      setQuestionPdfs(prev => prev.filter(f => f.id !== id));
    } else {
      setDataPdfs(prev => prev.filter(f => f.id !== id));
    }
  };

  // 大項目ごとに分野をグループ化
  const categorizedFields = PT_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof PT_FIELDS>);

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-8 shadow-xl mb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">PT国試問題集メーカー Pro</h1>
              <p className="text-slate-400 text-sm font-medium">4校正答率照合・図表自動解析・分野別一括抽出</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左カラム：設定 */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <h2 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex justify-between items-center">
                1. PDFアップロード
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">最大 30 + 20 枚</span>
              </h2>
              <div className="space-y-6">
                <div>
                  <FileUploader label="問題PDF (最大30枚)" onFilesSelect={(files) => setQuestionPdfs(prev => [...prev, ...files].slice(0, 30))} />
                  {questionPdfs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {questionPdfs.map(f => (
                        <span key={f.id} className="inline-flex items-center bg-slate-100 text-[9px] px-1.5 py-0.5 rounded border border-slate-200">
                          {f.name.slice(0, 10)}...
                          <button onClick={() => removeFile(f.id, 'question')} className="ml-1 text-slate-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <FileUploader label="正答率PDF (最大20枚)" onFilesSelect={(files) => setDataPdfs(prev => [...prev, ...files].slice(0, 20))} />
                  {dataPdfs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dataPdfs.map(f => (
                        <span key={f.id} className="inline-flex items-center bg-blue-50 text-[9px] px-1.5 py-0.5 rounded border border-blue-100">
                          {f.name.slice(0, 10)}...
                          <button onClick={() => removeFile(f.id, 'data')} className="ml-1 text-blue-300 hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <h2 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5">2. 抽出・フィルタ条件</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">4校正答率 閾値</label>
                  <select 
                    value={config.accuracyThreshold}
                    onChange={(e) => setConfig({ ...config, accuracyThreshold: e.target.value as AccuracyRate })}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700"
                  >
                    {ACCURACY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">抽出分野（複数選択可）</label>
                    <div className="flex gap-2">
                      <button onClick={selectAllFields} className="text-[10px] text-blue-600 hover:underline font-bold">全選択</button>
                      <button onClick={deselectAllFields} className="text-[10px] text-slate-400 hover:underline font-bold">解除</button>
                    </div>
                  </div>
                  
                  <div className="max-h-[450px] overflow-y-auto space-y-6 pr-2 custom-scrollbar border-t border-slate-50 pt-4">
                    {Object.entries(categorizedFields).map(([category, fields]) => (
                      <div key={category} className="space-y-2">
                        <div className="text-[11px] font-extrabold text-blue-600 border-l-2 border-blue-600 pl-2 bg-blue-50/50 py-1 rounded-r">{category}</div>
                        <div className="grid grid-cols-1 gap-1">
                          {fields.map(field => (
                            <label key={field.label} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border ${config.fields.includes(field.label) ? 'bg-white border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                              <input 
                                type="checkbox" 
                                checked={config.fields.includes(field.label)}
                                onChange={() => toggleField(field.label)}
                                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <div className="flex flex-col">
                                <span className={`text-xs ${config.fields.includes(field.label) ? 'text-slate-900 font-bold' : 'text-slate-500'} transition-all`}>
                                  {field.label}
                                </span>
                                <span className="text-[9px] text-slate-400 line-clamp-1">{field.details}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcess}
                disabled={status === 'processing' || questionPdfs.length === 0 || dataPdfs.length === 0}
                className={`w-full mt-8 py-4 rounded-xl font-bold shadow-lg transition-all text-sm ${
                  status === 'processing' || questionPdfs.length === 0 || dataPdfs.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-blue-200'
                }`}
              >
                {status === 'processing' ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AIが4校正答率を照合中...
                  </div>
                ) : '分野別問題集を生成する'}
              </button>
            </section>
          </div>

          {/* 右カラム：結果表示 */}
          <div className="lg:col-span-7 xl:col-span-8 min-h-[700px]">
            {status === 'idle' && (
              <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 h-full text-center">
                <div className="bg-slate-50 p-8 rounded-full mb-8">
                  <svg className="w-20 h-20 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-4">国試問題集を自動生成</h3>
                <p className="text-slate-400 max-w-md leading-relaxed">
                  複数の試験問題PDFから、指定された分野と4校正答率に一致する問題を自動抽出します。<br/>
                  図表はAIが解説文として取り込み、Wordへ貼り付け可能な形式で出力します。
                </p>
                <div className="mt-10 grid grid-cols-2 gap-4 text-left">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-blue-600 font-bold text-xs mb-1">形式自動変換</div>
                    <div className="text-[10px] text-slate-500">年度・区分を「60A-4」等へ整形</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-blue-600 font-bold text-xs mb-1">図表の言語化</div>
                    <div className="text-[10px] text-slate-500">画像をスクショ風テキストで再現</div>
                  </div>
                </div>
              </div>
            )}

            {status === 'processing' && (
              <div className="bg-white p-20 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center h-full shadow-inner">
                <div className="relative mb-10">
                  <div className="w-24 h-24 border-8 border-slate-50 rounded-full"></div>
                  <div className="w-24 h-24 border-8 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">PDFを解析・紐付け中</h3>
                <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                  30枚の問題PDFと20枚の正答率データを照合しています。図表が多い場合は解析に時間がかかることがあります。そのままお待ちください。
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 p-12 rounded-3xl border border-red-200 text-center h-full flex flex-col items-center justify-center shadow-inner">
                <div className="bg-white p-4 rounded-full shadow-sm mb-6">
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-800 mb-3">エラーが発生しました</h3>
                <p className="text-red-600 mb-10 max-w-sm text-sm">{errorMessage}</p>
                <button onClick={() => setStatus('idle')} className="bg-white border border-red-300 text-red-600 px-10 py-3 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold shadow-sm">
                  設定をリセットして再試行
                </button>
              </div>
            )}

            {status === 'success' && result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <ResultViewer questions={result.questions} />
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
