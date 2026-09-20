// admin/src/Pages/modules/sales/components/letterPdf.js
import { createRoot } from 'react-dom/client';

// Turns a letter component into a PDF file the person can attach. The element
// is rendered off-screen at true A4 width rather than scaled from the preview,
// because the preview is deliberately shrunk to fit a side panel and would
// carry that shrinking into the file.
const A4_MARGINS = {
  offer: [23, 13, 10, 25],
  agreement: [47, 20.3, 25.4, 20.3],
};

export const buildLetterPdf = async ({ element, kind, fileName, download = true }) => {
  const html2pdf = (await import('html2pdf.js')).default;

  const options = {
    margin: A4_MARGINS[kind] || [10, 10, 10, 10],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  const worker = html2pdf().set(options).from(element);
  if (download) {
    await worker.save();
    return null;
  }
  return worker.outputPdf('blob');
};

// Renders the component into a detached container, produces the file, then
// tears the container down again — so nothing of it survives on the page.
export const renderLetterToPdf = async ({ node, kind, fileName, widthMm }) => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${widthMm}mm`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(node);

  try {
    // The barcode draws on an effect and web fonts settle a frame or two
    // later; capturing immediately catches a half-drawn letter.
    await document.fonts?.ready?.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 350));
    await buildLetterPdf({ element: host, kind, fileName });
  } finally {
    root.unmount();
    host.remove();
  }
};

// Opens the person's own mail with the message ready, having first put the
// letter where they can reach it.
//
// An attachment cannot travel in a mailto: link — not in any browser, and
// not through Gmail's compose URL either. Google closed that off deliberately:
// a page able to staple arbitrary files onto someone's outgoing mail would be
// a serious hole. So the file is produced first, sitting in the downloads
// tray, and the compose window opens on top of it ready for one drag.
export const composeMailWithLetter = async ({ node, kind, fileName, widthMm, to, subject, body }) => {
  let prepared = true;
  try {
    await renderLetterToPdf({ node, kind, fileName, widthMm });
  } catch {
    prepared = false;
  }

  window.location.href = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return prepared;
};