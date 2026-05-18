export function logoSvg(width: number, height: number): string {
  return `<svg viewBox="0 0 360 100" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="#22C55E" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="11,68 20,77 50,31"/>
    <line x1="50" y1="31" x2="62" y2="73"/>
    <line x1="36" y1="52" x2="56" y2="52"/>
  </g>
  <text x="70" y="73"
    font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
    font-size="58" font-weight="800" fill="white" letter-spacing="-1.5">ctify</text>
</svg>`;
}

export function badgeSvg(size = 140): string {
  const h = Math.round(size * 1.19);
  return `<svg viewBox="0 0 140 167" width="${size}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg-g" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#0D3320"/>
      <stop offset="100%" stop-color="#061A0E"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
  </defs>
  <path d="M70 5 L132 33 L132 96 Q132 148 70 163 Q8 148 8 96 L8 33 Z" fill="url(#bg-g)" stroke="#22C55E" stroke-width="2"/>
  <path d="M70 14 L122 39 L122 95 Q122 140 70 154 Q18 140 18 95 L18 39 Z" fill="none" stroke="rgba(34,197,94,0.22)" stroke-width="1"/>
  <circle cx="70" cy="68" r="28" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.35)" stroke-width="1.2" filter="url(#glow)"/>
  <g fill="none" stroke="#22C55E" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="54,70 65,81 87,56"/>
  </g>
  <line x1="36" y1="105" x2="104" y2="105" stroke="rgba(34,197,94,0.25)" stroke-width="0.8"/>
  <text x="70" y="118" text-anchor="middle" font-size="9.5" fill="#4ADE80" font-weight="800" letter-spacing="2.8" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif">ACTIFY</text>
  <text x="70" y="130" text-anchor="middle" font-size="7.5" fill="#86EFAC" letter-spacing="2.2" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif">VERIFIED</text>
  <text x="70" y="141" text-anchor="middle" font-size="7.5" fill="#86EFAC" letter-spacing="2.2" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif">COMPLIANT</text>
  <line x1="42" y1="149" x2="98" y2="149" stroke="rgba(34,197,94,0.2)" stroke-width="0.7"/>
  <text x="70" y="159" text-anchor="middle" font-size="6.5" fill="#4ADE80" letter-spacing="0.8" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif">AI ACT · REG. UE 2024/1689</text>
</svg>`;
}

export function markSvg(size: number, variant: 'green' | 'white' | 'dark-green' = 'green'): string {
  const stroke = variant === 'white' ? 'white' : variant === 'dark-green' ? '#16A34A' : '#22C55E';
  return `<svg viewBox="0 0 126 126" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="63" cy="63" r="60" fill="none" stroke="${stroke}" stroke-width="5.5"/>
  <g fill="none" stroke="${stroke}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23,81 36,95 81,25"/>
    <line x1="81" y1="25" x2="99" y2="89"/>
    <line x1="59" y1="60" x2="91" y2="60"/>
  </g>
</svg>`;
}
