// shared print helpers, used by all admin pages instead of own iframe/popup code

// prints html via hidden iframe (no popup blocker), falls back to popup window
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

// prints html in a popup window
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

// prints a dom element by id, via iframe or popup
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
