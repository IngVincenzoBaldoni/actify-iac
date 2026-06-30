'use client';
import { useEffect, useRef } from 'react';

export default function AiComplianceBadge() {
  const squareRef = useRef<SVGRectElement>(null);
  const checkRef  = useRef<SVGPolylineElement>(null);
  const legRef    = useRef<SVGLineElement>(null);
  const crossRef  = useRef<SVGLineElement>(null);
  const badgeRef  = useRef<SVGGElement>(null);
  const textRef   = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const startRef  = useRef(0);
  const rafRef    = useRef(0);

  useEffect(() => {
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    const E = (x: number) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
    const r = 34, g = 197, b = 94;

    function renderFrame(t: number) {
      const tx = clamp((t - 0.0) / 0.7);
      if (textRef.current) {
        textRef.current.style.opacity = String(E(tx));
        textRef.current.style.transform = `translateX(${-12 * (1 - E(tx))}px)`;
      }

      const sq = clamp((t - 0.55) / 0.85);
      if (squareRef.current) {
        (squareRef.current as SVGRectElement & { style: CSSStyleDeclaration }).style.strokeDashoffset = String(1 - E(sq));
        squareRef.current.style.opacity = sq > 0.001 ? '1' : '0';
      }

      const c1 = clamp((t - 1.45) / 0.70);
      const c2 = clamp((t - 2.05) / 0.40);
      const c3 = clamp((t - 2.40) / 0.35);
      if (checkRef.current) { checkRef.current.style.strokeDashoffset = String(1 - E(c1)); checkRef.current.style.opacity = c1 > 0.001 ? '1' : '0'; }
      if (legRef.current)   { legRef.current.style.strokeDashoffset   = String(1 - E(c2)); legRef.current.style.opacity   = c2 > 0.001 ? '1' : '0'; }
      if (crossRef.current) { crossRef.current.style.strokeDashoffset = String(1 - E(c3)); crossRef.current.style.opacity = c3 > 0.001 ? '1' : '0'; }

      let scale = 1;
      if (t > 2.45 && t < 2.95) { const p = (t - 2.45) / 0.5; scale = 1 + 0.08 * Math.sin(p * Math.PI); }

      let blur: number, alpha: number;
      if (t < 2.5) {
        const gg = clamp((t - 1.5) / 1.0);
        blur = 4 + 6 * gg; alpha = 0.3 * gg;
      } else {
        const f = t - 2.5;
        const flash = Math.exp(-f * 3);
        const br = 0.5 + 0.5 * Math.sin(t * 1.5);
        blur = 10 + 12 * flash + 4 * br;
        alpha = 0.38 + 0.32 * flash + 0.12 * br;
      }
      if (badgeRef.current) {
        badgeRef.current.style.transform = `scale(${scale})`;
        badgeRef.current.style.filter = `drop-shadow(0 0 ${blur}px rgba(${r},${g},${b},${alpha}))`;
      }
      if (glowRef.current) {
        const ga = clamp((t - 1.3) / 1.5) * 0.16;
        glowRef.current.style.background = `radial-gradient(circle at 50% 47%, rgba(${r},${g},${b},${ga}), transparent 62%)`;
      }
    }

    function loop() {
      let t = (performance.now() - startRef.current) / 1000;
      if (t > 6.5) { startRef.current = performance.now(); t = 0; }
      renderFrame(t);
      rafRef.current = requestAnimationFrame(loop);
    }

    startRef.current = performance.now();
    renderFrame(0);
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '52px 0 64px', overflow: 'hidden' }}>
      <div ref={glowRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vmin, 40px)' }}>
        <svg viewBox="0 0 120 120" style={{ width: 'clamp(44px, 8vmin, 80px)', height: 'clamp(44px, 8vmin, 80px)', overflow: 'visible', flex: 'none' }}>
          <g ref={badgeRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <rect
              ref={squareRef} x="12" y="12" width="96" height="96" rx="22"
              pathLength="1"
              style={{ fill: 'none', stroke: '#22C55E', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: '1', strokeDashoffset: '1', opacity: 0 } as React.CSSProperties}
            />
            <g transform="translate(60,60) scale(0.8) translate(-61,-60)"
              style={{ fill: 'none', stroke: '#22C55E', strokeWidth: 11, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <polyline ref={checkRef} points="23,81 36,95 81,25" pathLength="1"
                style={{ strokeDasharray: '1', strokeDashoffset: '1', opacity: 0 } as React.CSSProperties} />
              <line ref={legRef} x1="81" y1="25" x2="99" y2="89" pathLength="1"
                style={{ strokeDasharray: '1', strokeDashoffset: '1', opacity: 0 } as React.CSSProperties} />
              <line ref={crossRef} x1="59" y1="60" x2="91" y2="60" pathLength="1"
                style={{ strokeDasharray: '1', strokeDashoffset: '1', opacity: 0 } as React.CSSProperties} />
            </g>
          </g>
        </svg>

        <div ref={textRef} style={{
          opacity: 0, transform: 'translateX(-12px)',
          color: '#EAF0EC', fontWeight: 700,
          fontSize: 'clamp(16px, 3vmin, 40px)',
          letterSpacing: '-0.055em', lineHeight: 0.92, whiteSpace: 'nowrap',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}>
          AI Compliance
        </div>
      </div>
    </div>
  );
}
