
import React, { useState, useMemo, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { ResultViewer } from './components/ResultViewer';
import { FilterConfig, ProcessingStatus, ProblemSetResponse, AccuracyRate, FileItem, AppMode, Question } from './types';
import { processSingleExamPdf, processAccuracyPdf } from './services/geminiService';
import { fetchDriveFileList } from './services/googleDriveService';
import { ACCURACY_OPTIONS, PT_FIELDS } from './constants';
import * as db from './services/db';

type AdminTab = 'problems' | 'accuracy' | 'images';

const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => (
  <div className="w-full mt-4 space-y-2 animate-in fade-in duration-300">
    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
      <span>{label}</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
      <div 
        className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('search');
  const [adminTab, setAdminTab] = useState<AdminTab>('problems');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [searchConfig, setSearchConfig] = useState<FilterConfig>({
    accuracyThreshold: 'all',
    years: [],
    fields: PT_FIELDS.map(f => f.label)
  });
  const [searchResults, setSearchResults] = useState<Question[] | null>(null);

  // --- 管理モード用 ---
  const [targetYear, setTargetYear] = useState('第60回');
  const [questionFiles, setQuestionFiles] = useState<FileItem[]>([]);
  const [accuracyFiles, setAccuracyFiles] = useState<FileItem[]>([]);
  const [folderLink, setFolderLink] = useState('');
  const [imageLinksInput, setImageLinksInput] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [accuracyPreview, setAccuracyPreview] = useState<{displayNumber: string, accuracyRate: number, category: string}[]>([]);

  useEffect(() => { refreshAvailableYears(); }, []);

  const refreshAvailableYears = async () => {
    const years = await db.getAllYears();
    setAvailableYears(years);
    if (years.length > 0 && searchConfig.years.length === 0) {
      setSearchConfig(prev => ({ ...prev, years: [years[0]] }));
    }
  };

  const handleSearch = async () => {
    setStatus('analyzing');
    setProgress(30);
    setProgressLabel('データベースを検索中...');
    try {
      const threshold = searchConfig.accuracyThreshold === 'all' ? 0 : parseInt(searchConfig.accuracyThreshold);
      const results = await db.getFilteredQuestions(searchConfig.years, threshold, searchConfig.fields);
      const sorted = results.sort((a, b) => {
        const aVal = a.displayNumber.includes('P') ? 1000 + parseInt(a.displayNumber.replace(/\D/g,'')) : parseInt(a.displayNumber.replace(/\D/g,''));
        const bVal = b.displayNumber.includes('P') ? 1000 + parseInt(b.displayNumber.replace(/\D/g,'')) : parseInt(b.displayNumber.replace(/\D/g,''));
        return aVal - bVal;
      });
      setSearchResults(sorted);
      setProgress(100);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 500);
    } catch (e) {
      console.error(e);
      alert("検索中にエラーが発生しました。");
      setStatus('idle');
    }
  };

  const handleAnalyzeQuestions = async () => {
    if (questionFiles.length === 0) return;
    setStatus('analyzing');
    setProgress(0);
    setPreviewQuestions([]);
    
    let allQs: Question[] = [];
    try {
      for (let i = 0; i < questionFiles.length; i++) {
        const file = questionFiles[i];
        setProgressLabel(`解析中: ${file.name}`);
        const qs = await processSingleExamPdf(file, targetYear);
        allQs = [...allQs, ...qs];
        setProgress(((i + 1) / questionFiles.length) * 100);
      }
      setPreviewQuestions(allQs);
      setStatus('confirming');
    } catch (e) {
      alert("解析に失敗しました。");
      setStatus('idle');
    }
  };

  const handleAnalyzeAccuracy = async () => {
    if (accuracyFiles.length === 0) return;
    setStatus('analyzing');
    setProgress(20);
    setProgressLabel('統計データを解析中...');
    try {
      const mappings = await processAccuracyPdf(accuracyFiles);
      setAccuracyPreview(mappings);
      setProgress(100);
      setStatus('confirming');
    } catch (e) {
      alert("解析に失敗しました。");
      setStatus('idle');
    }
  };

  const handleApplyAccuracy = async () => {
    if (accuracyPreview.length === 0) return;
    setStatus('saving');
    setProgress(10);
    setProgressLabel('DBに正答率を適用中...');
    try {
      const map: Record<string, { rate: number, category: string }> = {};
      accuracyPreview.forEach(m => {
        map[m.displayNumber.toLowerCase().trim()] = { rate: m.accuracyRate, category: m.category };
      });
      
      const dbInstance = await db.openDB();
      const transaction = dbInstance.transaction('questions', 'readwrite');
      const store = transaction.objectStore('questions');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as Question[];
        let updatedCount = 0;
        all.forEach((q, i) => {
          const key = q.displayNumber.toLowerCase().trim();
          if (map[key]) {
            q.accuracyRate = map[key].rate;
            q.category = map[key].category;
            store.put(q);
            updatedCount++;
          }
          if (i % 10 === 0) setProgress(10 + (i / all.length) * 80);
        });
        
        transaction.oncomplete = () => {
          setProgress(100);
          alert(`${updatedCount}件のデータを更新しました。`);
          setAccuracyPreview([]);
          setAccuracyFiles([]);
          setStatus('idle');
        };
      };
    } catch (e) {
      alert("適用中にエラーが発生しました。");
      setStatus('idle');
    }
  };

  const handleSaveToDB = async () => {
    if (previewQuestions.length === 0) return;
    setStatus('saving');
    setProgress(0);
    setProgressLabel('DBに保存中...');
    try {
      const chunkSize = 20;
      for (let i = 0; i < previewQuestions.length; i += chunkSize) {
        const chunk = previewQuestions.slice(i, i + chunkSize);
        await db.saveQuestions(chunk);
        setProgress(((i + chunk.length) / previewQuestions.length) * 100);
      }
      alert("データベースへの登録が完了しました。");
      setPreviewQuestions([]);
      setQuestionFiles([]);
      setStatus('idle');
      await refreshAvailableYears();
    } catch (e) {
      alert("保存に失敗しました。");
      setStatus('idle');
    }
  };

  const handleBulkLinkImages = async () => {
    if (!imageLinksInput.trim()) return;
    setStatus('linking');
    setProgress(10);
    setProgressLabel('リンクを解析中...');
    try {
      const lines = imageLinksInput.split('\n');
      const fileMap: Record<string, string> = {};
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const url = parts.slice(1).join(':').trim();
          if (key && url) fileMap[key] = url;
        }
      });
      
      setProgress(50);
      setProgressLabel('DBを更新中...');
      await db.updateQuestionImages(fileMap);
      setProgress(100);
      alert("画像の反映が完了しました。");
      setImageLinksInput('');
      setStatus('idle');
    } catch (e: any) {
      alert(`エラー: ${e.message}`);
      setStatus('idle');
    }
  };

  const handleFolderSync = async () => {
    if (!folderLink.trim()) return;
    setStatus('linking');
    setProgress(10);
    setProgressLabel('フォルダをスキャン中...');
    try {
      const apiKey = process.env.API_KEY || "";
      const fileMap = await fetchDriveFileList(folderLink, apiKey);
      setProgress(50);
      setProgressLabel('DBを更新中...');
      await db.updateQuestionImages(fileMap);
      setProgress(100);
      alert("同期が完了しました。");
      setFolderLink('');
      setStatus('idle');
    } catch (e: any) {
      alert(`同期エラー: ${e.message}`);
      setStatus('idle');
    }
  };

  const toggleField = (field: string) => {
    setSearchConfig(prev => {
      const fields = prev.fields.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field];
      return { ...prev, fields };
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white py-6 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-xl font-black italic uppercase">PT Exam DB</h1>
          </div>
          <nav className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setMode('search')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${mode === 'search' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>抽出・閲覧</button>
            <button onClick={() => setMode('admin')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${mode === 'admin' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>管理・登録</button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {mode === 'search' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-4 space-y-6">
              <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 sticky top-28 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
                <h2 className="text-sm font-black text-slate-800 border-b pb-4">抽出フィルタ</h2>
                
                {/* 年度選択 */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">対象年度</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-2xl bg-slate-50/50">
                    {availableYears.length > 0 ? availableYears.map(y => (
                      <button key={y} onClick={() => setSearchConfig(p => ({ ...p, years: p.years.includes(y) ? p.years.filter(v => v !== y) : [...p.years, y] }))} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${searchConfig.years.includes(y) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                        {y}
                      </button>
                    )) : <p className="text-[10px] text-slate-400 italic">年度データがありません</p>}
                  </div>
                </div>

                {/* 分野選択 (大きなチェックボックス形式) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">対象分野</label>
                    <div className="flex gap-4">
                      <button onClick={() => setSearchConfig(p => ({ ...p, fields: PT_FIELDS.map(f => f.label) }))} className="text-[10px] font-bold text-blue-600 hover:underline">全選択</button>
                      <button onClick={() => setSearchConfig(p => ({ ...p, fields: [] }))} className="text-[10px] font-bold text-slate-400 hover:underline">解除</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-1">
                    {PT_FIELDS.map(f => {
                      const isSelected = searchConfig.fields.includes(f.label);
                      return (
                        <label 
                          key={f.label} 
                          className={`
                            relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group
                            ${isSelected 
                              ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/10' 
                              : 'bg-white border-slate-100 hover:border-slate-300'}
                          `}
                        >
                          <div className={`
                            w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                            ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}
                          `}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isSelected}
                            onChange={() => toggleField(f.label)}
                          />
                          <span className={`text-xs font-black ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>
                            {f.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 正答率下限 */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">正答率下限</label>
                  <select value={searchConfig.accuracyThreshold} onChange={(e) => setSearchConfig({ ...searchConfig, accuracyThreshold: e.target.value as AccuracyRate })} className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500">
                    {ACCURACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <button onClick={handleSearch} disabled={searchConfig.years.length === 0 || status === 'analyzing'} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95">
                  {status === 'analyzing' ? '検索中...' : '抽出を開始する'}
                </button>
                {status === 'analyzing' && mode === 'search' && <ProgressBar progress={progress} label={progressLabel} />}
              </section>
            </aside>
            <div className="lg:col-span-8">
              {searchResults ? (
                <ResultViewer questions={searchResults} />
              ) : (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center space-y-4 min-h-[500px]">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 animate-pulse">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="text-slate-400 font-black italic text-2xl uppercase tracking-tighter">Ready to Extract</div>
                  <p className="text-slate-400 text-sm font-medium max-w-xs">
                    年度・分野・正答率を設定し、<br/>ボタンを押すと問題が抽出されます。
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-xl font-black text-slate-800 italic">Database Management</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">国試データの構築</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {(['problems', 'accuracy', 'images'] as AdminTab[]).map(tab => (
                  <button key={tab} onClick={() => setAdminTab(tab)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${adminTab === tab ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>
                    {tab === 'problems' ? '1. 問題登録' : tab === 'accuracy' ? '2. 分野・正答率' : '3. 画像リンク'}
                  </button>
                ))}
              </div>
            </header>

            {/* 問題登録タブ */}
            {adminTab === 'problems' && (
              <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
                <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="text-lg font-black text-slate-800 italic">Step 1: 試験問題の解析</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">年度:</span>
                    <input type="text" value={targetYear} onChange={e => setTargetYear(e.target.value)} className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-black text-rose-600 text-center w-28" />
                  </div>
                </div>
                <div className="max-w-xl mx-auto space-y-4">
                  <FileUploader label="PDFをアップロード（複数可）" onFilesSelect={setQuestionFiles} />
                  <button onClick={handleAnalyzeQuestions} disabled={status !== 'idle' || questionFiles.length === 0} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs shadow-xl">
                    解析を開始する
                  </button>
                  {status === 'analyzing' && adminTab === 'problems' && <ProgressBar progress={progress} label={progressLabel} />}
                </div>
                {(status === 'confirming' || status === 'saving') && previewQuestions.length > 0 && (
                  <div className="mt-8 border-t pt-8 space-y-8 animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex justify-between items-center">
                      <div className="flex gap-10">
                        <div className="text-center"><p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Total</p><p className="text-3xl font-black text-rose-500">{previewQuestions.length}</p></div>
                      </div>
                      <button onClick={handleSaveToDB} disabled={status === 'saving'} className="bg-white text-slate-900 px-10 py-4 rounded-2xl text-xs font-black shadow-xl hover:bg-rose-50">DBに登録・更新</button>
                    </div>
                    {status === 'saving' && <ProgressBar progress={progress} label={progressLabel} />}
                    <div className="max-h-[500px] overflow-y-auto border-2 border-slate-100 rounded-[3rem] bg-slate-50 p-6 space-y-6 custom-scrollbar">
                      {previewQuestions.map((q, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full">{q.displayNumber}</span>
                            <span className="text-[10px] font-black text-rose-600">正解: {q.correctAnswer}</span>
                          </div>
                          <p className="text-sm text-slate-800 font-bold mb-4">{q.body}</p>
                          <div className="pl-4 border-l-4 border-slate-100 space-y-2">
                            {q.options.map((opt, i) => (
                              <div key={i} className="text-xs text-slate-500 font-medium flex gap-2">
                                <span className="font-black text-slate-300">{i+1}.</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 分野・正答率タブ */}
            {adminTab === 'accuracy' && (
              <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
                <div className="border-b pb-6"><h3 className="text-lg font-black text-slate-800 italic">Step 2: 正答率・分野のマッピング</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 space-y-4">
                    <FileUploader label="正答率データPDF" onFilesSelect={setAccuracyFiles} />
                    <button onClick={handleAnalyzeAccuracy} disabled={status !== 'idle' || accuracyFiles.length === 0} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">データ抽出実行</button>
                    {status === 'analyzing' && adminTab === 'accuracy' && <ProgressBar progress={progress} label={progressLabel} />}
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">プレビュー ({accuracyPreview.length})</h4>
                      {accuracyPreview.length > 0 && <button onClick={handleApplyAccuracy} disabled={status === 'saving'} className="text-xs font-black bg-rose-600 text-white px-6 py-2 rounded-xl">DBに反映</button>}
                    </div>
                    {status === 'saving' && <ProgressBar progress={progress} label={progressLabel} />}
                    <div className="max-h-[400px] overflow-y-auto border-2 border-slate-100 rounded-[2rem] bg-slate-50 p-4 grid grid-cols-2 gap-2 custom-scrollbar">
                      {accuracyPreview.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                          <div>
                            <span className="text-[10px] font-black">{item.displayNumber}</span>
                            <p className="text-[9px] text-blue-500 font-bold">{item.category}</p>
                          </div>
                          <span className="text-[10px] font-black text-rose-600">{item.accuracyRate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 画像リンクタブ */}
            {adminTab === 'images' && (
              <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
                <div className="border-b pb-6"><h3 className="text-lg font-black text-slate-800 italic">Step 3: 画像URL紐付け</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase">A: Google Driveフォルダ同期</h4>
                    <input type="text" value={folderLink} onChange={e => setFolderLink(e.target.value)} placeholder="共有フォルダURL" className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl text-xs bg-slate-50" />
                    <button onClick={handleFolderSync} disabled={status !== 'idle'} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs shadow-xl">フォルダ内スキャン</button>
                    {status === 'linking' && <ProgressBar progress={progress} label={progressLabel} />}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase">B: 手動リンク一括反映</h4>
                    <textarea value={imageLinksInput} onChange={e => setImageLinksInput(e.target.value)} placeholder="60A-1: URL..." className="w-full h-40 p-5 border-2 border-slate-100 rounded-[2rem] bg-slate-50 text-xs resize-none" />
                    <button onClick={handleBulkLinkImages} disabled={status !== 'idle'} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs">反映する</button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
