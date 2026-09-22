// src/Pages/modules/operations/components/PrintShell.jsx
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import CompanyLetterhead from './CompanyLetterhead';

const PrintShell = ({ title, children, fileName = 'MILEX-Document', sidebar }) => {
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerWidth = sidebar ? 'max-w-6xl' : 'max-w-4xl';

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
      pdf.save(`${fileName}.pdf`);
    } catch {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-3 sm:py-8 sm:px-4">
      <div className={`${containerWidth} mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden`}>
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 transition">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg shadow-md hover:bg-slate-900 transition">
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 bg-emerald-600 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Download size={16} /> {isDownloading ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className={`${containerWidth} mx-auto flex flex-col lg:flex-row gap-4`}>
        <div ref={contentRef} className="flex-1 min-w-0 bg-white shadow-xl rounded-xl p-4 sm:p-8 print:shadow-none print:rounded-none print:p-0">
          <CompanyLetterhead />
          <h1 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-wide mb-4">{title}</h1>
          {children}
        </div>
        {sidebar && (
          <div className="lg:w-72 shrink-0 print:hidden">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:sticky lg:top-4">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">Related Documents</p>
              {sidebar}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
};

export default PrintShell;