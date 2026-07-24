// admin/src/Components/Shared/ScannableBarcode.jsx 
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Renders a real, scanner-readable Code128 barcode (any handheld/phone
// barcode scanner can read this) — separate from BarcodeBadge, which is
// just a decorative pattern and was never meant to be scanned.
const ScannableBarcode = ({ value, className = '', height = 40 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.6,
        height,
        displayValue: true,
        fontSize: 12,
        margin: 6,
        background: 'transparent',
      });
    } catch {
      // Invalid characters for Code128 — fail silently, badge just won't render.
    }
  }, [value, height]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
};

export default ScannableBarcode;