/**
 * Centralized Print Helpers for Atta Chakki Frontend.
 * Replaces duplicate iframe and popup window printing across admin pages.
 */

/**
 * Prints HTML content via a hidden iframe to prevent popup blockers and blank new tabs.
 * Falls back to popup window if iframe printing is blocked by the browser.
 *
 * @param {string} htmlContent - Full HTML string to print
 * @param {Object} options - Custom options
 * @param {string} options.frameId - DOM id for reusable hidden iframe
 * @param {number} options.delayMs - Delay before invoking window.print()
 * @param {boolean} options.fallbackToWindow - Whether to fall back to window.open if iframe fails
 */
export function printIframeHtml(htmlContent, {
  frameId = 'print-helper-frame',
  delayMs = 300,
  fallbackToWindow = true,
} = {}) {
  try {
    let iframe = document.getElementById(frameId);
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = frameId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (fallbackToWindow) return printWindowHtml(htmlContent);
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        if (fallbackToWindow) {
          printWindowHtml(htmlContent);
        } else {
          console.warn('Iframe print error:', err);
        }
      }
    }, delayMs);
  } catch (err) {
    if (fallbackToWindow) {
      printWindowHtml(htmlContent);
    } else {
      console.warn('Print helper error:', err);
    }
  }
}

/**
 * Prints HTML content inside a dedicated popup window.
 *
 * @param {string} htmlContent - Full HTML string to print
 * @param {Object} options - Window options
 * @param {number} options.width - Window width (default 800)
 * @param {number} options.height - Window height (default 900)
 * @param {number} options.delayMs - Delay before print call (default 400)
 * @param {boolean} options.autoClose - Whether to close window after print (default false)
 */
export function printWindowHtml(htmlContent, {
  width = 800,
  height = 900,
  delayMs = 400,
  autoClose = false,
} = {}) {
  try {
    const printWin = window.open('', '_blank', `width=${width},height=${height}`);
    if (!printWin) {
      alert('Please allow popups to print.');
      return;
    }

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();

    setTimeout(() => {
      try {
        printWin.print();
        if (autoClose) {
          printWin.close();
        }
      } catch (err) {
        console.warn('Window print error:', err);
      }
    }, delayMs);
  } catch (err) {
    console.warn('printWindowHtml error:', err);
  }
}

/**
 * Prints a DOM element by id by extracting its HTML and printing via iframe or popup.
 *
 * @param {string} elementId - ID of element to print
 * @param {Object} options - Print options
 */
export function printElement(elementId, {
  title = document.title,
  extraStyles = '',
  useIframe = true,
} = {}) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with id "${elementId}" not found for printing.`);
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${styles}
        <style>
          @media print {
            body { margin: 0; padding: 12px; background: #fff !important; color: #000 !important; }
            .no-print { display: none !important; }
          }
          ${extraStyles}
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `;

  if (useIframe) {
    printIframeHtml(html, { frameId: `print-frame-${elementId}` });
  } else {
    printWindowHtml(html);
  }
}

export default {
  printIframeHtml,
  printWindowHtml,
  printElement,
};
