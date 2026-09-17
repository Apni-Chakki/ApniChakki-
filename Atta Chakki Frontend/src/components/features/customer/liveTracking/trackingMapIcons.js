// Helper: Create rotated car SVG icon for driver marker
export function createCarIcon(heading = 0, color = '#2563eb') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 30, 30)" filter="url(#shadow)">
        <circle cx="30" cy="30" r="24" fill="${color}" opacity="0.15"/>
        <circle cx="30" cy="30" r="18" fill="${color}"/>
        <path d="M30 14 L22 30 L30 26 L38 30 Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
        <circle cx="30" cy="30" r="4" fill="white" opacity="0.6"/>
      </g>
      <circle cx="30" cy="30" r="27" fill="none" stroke="${color}" stroke-width="2" opacity="0.3">
        <animate attributeName="r" from="20" to="28" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export const DEST_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 60" width="48" height="60">
    <defs>
      <filter id="destShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <g filter="url(#destShadow)">
      <path d="M24 4C14.06 4 6 12.06 6 22c0 14 18 32 18 32s18-18 18-32c0-9.94-8.06-18-18-18z" fill="#ef4444"/>
      <circle cx="24" cy="22" r="9" fill="white"/>
      <circle cx="24" cy="22" r="4" fill="#ef4444"/>
    </g>
  </svg>
`;
