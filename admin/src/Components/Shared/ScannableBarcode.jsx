// admin/src/Components/Shared/ScannableBarcode.jsx — REPLACE ENTIRE FILE
import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { FileDigit } from 'lucide-react';

// Same pill/badge look as BarcodeBadge (icon + mono text + faded bars,
// same padding/border/radius/font-size), except the bars are a real
// Code128 barcode instead of a decorative random pattern — so this one is
// actually scannable while looking identical to the old badge.
const ScannableBarcode = ({ value, className = '' }) => {
  const svgRef = useRef(null);
  const [renderedWidth, setRenderedWidth] = useState(0);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.4,
        height: 16,
        displayValue: false,
        margin: 0,
        background: 'transparent',
        lineColor: 'currentColor',
      });
      // JsBarcode sets viewBox/width attributes on the SVG itself after
      // rendering — read the actual rendered width back so the wrapping
      // <span> (which has no intrinsic size otherwise) doesn't collapse it.
      const bbox = svgRef.current.getBBox?.();
      if (bbox?.width) setRenderedWidth(bbox.width);
    } catch {
      /* invalid characters for Code128 — bars just won't render */
    }
  }, [value]);

  if (!value) return null;

  return (
    <span
      title={value}
      className={`font-mono text-[11px] font-bold flex items-center px-3 py-1.5 rounded-md border text-slate-500 bg-slate-50 border-slate-200 ${className}`}
    >
      <FileDigit size={14} className="mr-2 shrink-0" />
      {value}
      <span
        className="ml-2 flex items-center h-4 shrink-0 opacity-70"
        style={{ width: renderedWidth ? `${renderedWidth}px` : 'auto' }}
        aria-hidden="true"
      >
        <svg ref={svgRef} style={{ height: '16px', width: '100%' }} />
      </span>
    </span>
  );
};

export default ScannableBarcode;