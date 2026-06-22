import React from 'react';
import { Button } from '../../ui/Button';
import { Share2, Download, Plus } from 'lucide-react';

interface SurveyHeaderProps {
  handleShare: () => void;
  handleDownloadExcel: () => void;
  handleDownloadHtml: () => void;
  handlePreviewHtml: () => void;
  openForm: () => void;
}

export function SurveyHeader({ handleShare, handleDownloadExcel, handleDownloadHtml, handlePreviewHtml, openForm }: SurveyHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Survey Channel</h2>
        <p className="text-sm text-slate-500">Kelola dan input data survey channel toko partner</p>
      </div>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button onClick={handlePreviewHtml} variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-200 hover:bg-slate-50">
          <i className="fa-solid fa-eye w-4 h-4 mr-2"></i> Preview
        </Button>
        <Button onClick={handleDownloadHtml} variant="outline" className="flex-1 sm:flex-none text-purple-600 border-purple-200 hover:bg-purple-50">
          <Download className="w-4 h-4 mr-2" /> HTML App
        </Button>
        <Button onClick={handleShare} variant="outline" className="flex-1 sm:flex-none text-indigo-600 border-indigo-200 hover:bg-indigo-50">
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
        <Button onClick={handleDownloadExcel} variant="outline" className="flex-1 sm:flex-none">
          <Download className="w-4 h-4 mr-2" /> Excel
        </Button>
        <Button onClick={() => openForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none">
          <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>
    </div>
  );
}
