// src/Pages/modules/operations/components/CompanyLetterhead.jsx
const CompanyLetterhead = () => (
  <div className="flex items-start justify-between border-b-4 border-emerald-700 pb-4 mb-6">
    <div className="flex items-center gap-3">
      <img src="/log.jpeg" alt="MILEX" className="h-14 w-auto object-contain shrink-0" />
      <div>
        
        <p className="text-[9px] font-bold text-emerald-700 tracking-widest mt-1">WITH YOU EVERY MILE</p>
      </div>
    </div>
    <div className="text-right text-[9px] text-slate-500 leading-relaxed max-w-[220px]">
      <p>House 7, Ground Floor, Road 17, Block-E, Banani, Dhaka, Bangladesh</p>
      <p>info@milexair.com &nbsp;|&nbsp; www.milexair.com</p>
    </div>
  </div>
);

export default CompanyLetterhead;