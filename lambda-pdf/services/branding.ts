// Actify SVG brand assets — inline SVG strings, no external dependencies.
// Use logoSvg() for the full horizontal lockup, markSvg() for the icon-only mark.

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

// variant: 'green' (#22C55E on dark bg), 'white' (on dark bg), 'dark-green' (#16A34A on light bg)
export function markSvg(size: number, variant: "green" | "white" | "dark-green" = "green"): string {
  const stroke = variant === "white" ? "white" : variant === "dark-green" ? "#16A34A" : "#22C55E";
  return `<svg viewBox="0 0 126 126" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="63" cy="63" r="60" fill="none" stroke="${stroke}" stroke-width="5.5"/>
  <g fill="none" stroke="${stroke}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23,81 36,95 81,25"/>
    <line x1="81" y1="25" x2="99" y2="89"/>
    <line x1="59" y1="60" x2="91" y2="60"/>
  </g>
</svg>`;
}
