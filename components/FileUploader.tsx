
import React, { useRef } from 'react';
import { FileItem } from '../types';

interface FileUploaderProps {
  label: string;
  onFilesSelect: (files: FileItem[]) => void;
  accept?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label, onFilesSelect, accept = ".pdf" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Cast the result of Array.from to File[] to avoid 'unknown' type errors during iteration
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newFileItems: FileItem[] = await Promise.all(
      files.map(file => {
        return new Promise<FileItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({
              base64,
              name: file.name,
              id: Math.random().toString(36).substring(7)
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    onFilesSelect(newFileItems);
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept={accept} 
          multiple
          className="hidden" 
        />
        <svg className="w-8 h-8 mx-auto text-slate-400 group-hover:text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-sm text-slate-500 group-hover:text-blue-600 font-medium">クリックしてPDFを複数選択</span>
        <p className="text-xs text-slate-400 mt-1">最大30ファイルまで対応</p>
      </div>
    </div>
  );
};
