// admin/src/Components/Shared/ScannableBarcode.jsx
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { FileDigit } from "lucide-react";

// Widest the bars are allowed to be. Anything beyond this is scaled down
// rather than allowed to push the badge — and with it the whole page —
// wider than the screen.
const MAX_BAR_WIDTH_PX = 150;
const BAR_HEIGHT_PX = 16;

// Same pill/badge look as BarcodeBadge (icon + mono text + faded bars,
// same padding/border/radius/font-size), except the bars are a real
// Code128 barcode instead of a decorative random pattern — so this one is
// actually scannable while looking identical to the old badge.
const ScannableBarcode = ({ value, className = "" }) => {
  const svgRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.4,
        height: BAR_HEIGHT_PX,
        displayValue: false,
        margin: 0,
        background: "transparent",
        lineColor: "currentColor",
      });

      const svg = svgRef.current;
      // JsBarcode writes its own width/height ATTRIBUTES on the element.
      // Those are an intrinsic size the browser honours before any CSS
      // runs, so on a phone the badge briefly became wider than the
      // viewport and shoved the whole page layout sideways until the
      // measurement below corrected it. Converting that intrinsic size
      // into a viewBox and removing the attributes means the graphic
      // scales to whatever room it is given and never dictates width.
      const naturalWidth = Number(svg.getAttribute("width")) || svg.getBBox?.().width || 0;
      const naturalHeight = Number(svg.getAttribute("height")) || BAR_HEIGHT_PX;
      if (naturalWidth > 0) {
        svg.setAttribute("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        setBarWidth(Math.min(naturalWidth, MAX_BAR_WIDTH_PX));
      }
    } catch {
      /* invalid characters for Code128 — bars just won't render */
    }
  }, [value]);

  if (!value) return null;

  return (
    <span
      title={value}
      // max-w-full keeps the badge inside its column no matter how long the
      // code is; min-w-0 lets the text truncate instead of forcing the row
      // open from the inside.
      className={`font-mono text-[11px] font-bold inline-flex items-center max-w-full px-3 py-1.5 rounded-md border text-slate-500 bg-slate-50 border-slate-200 overflow-hidden ${className}`}
    >
      <FileDigit size={14} className="mr-2 shrink-0" />
      <span className="truncate min-w-0">{value}</span>
      <span
        className="ml-2 items-center shrink-0 opacity-70 hidden xs:flex sm:flex"
        // Width stays 0 until the real measurement lands, so there is no
        // moment where an unmeasured graphic can overflow.
        style={{ width: barWidth ? `${barWidth}px` : 0, height: `${BAR_HEIGHT_PX}px` }}
        aria-hidden="true"
      >
        <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </span>
    </span>
  );
};

export default ScannableBarcode;