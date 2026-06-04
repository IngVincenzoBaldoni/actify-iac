// Self-contained HTML form — 6-step AI Act assessment wizard.
// No external dependencies: all CSS and JS are inline.

import { logoSvg, markSvg } from "./branding";

export const formHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Actify &mdash; AI Act Compliance Assessment</title>
<style>
:root {
  --green:#22C55E; --green-dark:#16A34A; --green-glow:rgba(34,197,94,.12);
  --bg:#0F172A; --surface:#1E293B; --surface2:#263548;
  --border:#334155; --border2:#475569;
  --text:#F8FAFC; --text2:#CBD5E1; --muted:#94A3B8; --dim:#64748B;
  --input-bg:#0B1120;
  --red:#EF4444; --orange:#F97316; --yellow:#EAB308;
  --r:12px; --shadow:0 8px 32px rgba(0,0,0,.5);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}

/* ═══ LANDING ═══ */
#landing{min-height:100vh;display:flex;flex-direction:column}
.l-nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 40px;border-bottom:1px solid var(--border)}
.l-pill{justify-self:end}
.l-pill{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:5px 14px;font-size:12px;color:var(--muted)}
.pulse{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.l-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:72px 24px 40px;position:relative;overflow:hidden}
.l-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:56px 56px;opacity:.25;mask-image:radial-gradient(ellipse 80% 50% at 50% 0%,black,transparent)}
.l-hero::after{content:'';position:absolute;top:-120px;left:50%;transform:translateX(-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(34,197,94,.1) 0%,transparent 65%);pointer-events:none}
.l-hero-inner{position:relative;z-index:1;max-width:680px}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:100px;padding:6px 16px;font-size:13px;font-weight:500;color:#86EFAC;margin-bottom:28px}
.hero-h1{font-size:clamp(30px,5vw,54px);font-weight:800;line-height:1.1;letter-spacing:-1.5px;margin-bottom:18px}
.hero-h1 mark{background:linear-gradient(135deg,var(--green),#4ADE80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-style:normal}
.hero-sub{font-size:17px;color:var(--muted);line-height:1.75;margin-bottom:36px;max-width:520px;margin-left:auto;margin-right:auto}
.hero-btn{display:inline-flex;align-items:center;gap:8px;background:var(--green);color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:10px;border:none;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s}
.hero-btn:hover{background:var(--green-dark);transform:translateY(-2px);box-shadow:0 8px 28px rgba(34,197,94,.35)}
.hero-trust{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:20px;flex-wrap:wrap}
.trust-item{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--muted)}
.trust-check{width:17px;height:17px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;flex-shrink:0}
.l-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:920px;margin:56px auto 0;padding:0 24px 64px}
@media(max-width:760px){.l-cards{grid-template-columns:1fr}.l-nav{padding:14px 20px}}
.l-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;transition:border-color .2s,transform .2s}
.l-card:hover{border-color:var(--border2);transform:translateY(-2px)}
.card-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px}
.ci-green{background:rgba(34,197,94,.1)}.ci-purple{background:rgba(139,92,246,.1)}.ci-blue{background:rgba(59,130,246,.1)}
.l-card h3{font-size:15px;font-weight:700;margin-bottom:7px}
.l-card p{font-size:13px;color:var(--muted);line-height:1.65}

/* ═══ WIZARD SHELL ═══ */
#app{display:none;min-height:100vh;flex-direction:column}
.w-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 40px;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:20}
.w-logo{display:flex;align-items:center}
.w-step-info{font-size:13px;color:var(--muted)}
.w-exit{background:none;border:1px solid var(--border);color:var(--muted);font-size:13px;padding:6px 14px;border-radius:8px;cursor:pointer;transition:all .2s;font-family:inherit}
.w-exit:hover{border-color:var(--border2);color:var(--text)}
.stepper{display:flex;align-items:flex-start;padding:20px 40px;background:var(--bg);border-bottom:1px solid var(--border);overflow-x:auto;gap:0}
@media(max-width:640px){.stepper{padding:16px 20px}.w-nav{padding:12px 20px}}
.s-item{display:flex;align-items:flex-start;flex:1;min-width:0}
.s-dot-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0}
.s-dot{width:30px;height:30px;border-radius:50%;border:2px solid var(--border);background:var(--bg);color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;transition:all .3s;flex-shrink:0}
.s-dot.done{background:var(--green);border-color:var(--green);color:#fff}
.s-dot.active{border-color:var(--green);color:var(--green);box-shadow:0 0 0 4px var(--green-glow)}
.s-name{font-size:10px;font-weight:500;color:var(--dim);text-align:center;white-space:nowrap;transition:color .3s}
.s-name.done{color:var(--text2)}.s-name.active{color:var(--green)}
.s-line{flex:1;height:2px;background:var(--border);margin:14px 6px 0;transition:background .3s;min-width:8px}
.s-line.done{background:var(--green)}
@media(max-width:540px){.s-name{display:none}}
.w-body{flex:1;max-width:720px;width:100%;margin:0 auto;padding:40px 24px 100px}
.step-panel{animation:fadein .2s ease}
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.panel-head{margin-bottom:28px}
.panel-head h2{font-size:24px;font-weight:700;letter-spacing:-.4px;margin-bottom:6px}
.panel-head p{font-size:14px;color:var(--muted);line-height:1.65}
.fcard{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin-bottom:16px}
.fcard h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--dim);margin-bottom:16px}
.fcard p{font-size:13px;color:var(--muted);line-height:1.65;margin-bottom:16px}
.field{margin-bottom:18px}
.field:last-child{margin-bottom:0}
.field label{display:block;font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px}
.field input[type=text],.field select,.field textarea{width:100%;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:14px;padding:11px 14px;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-glow)}
.field select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394A3B8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
.field select option{background:#1E293B}
.field textarea{resize:vertical;min-height:80px;line-height:1.6}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.field-row{grid-template-columns:1fr}}
.check-cards{display:flex;flex-direction:column;gap:10px}
.check-card{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;background:var(--input-bg);transition:border-color .2s,background .2s}
.check-card:has(input:checked){border-color:var(--green);background:rgba(34,197,94,.05)}
.check-card input[type=checkbox]{width:18px;height:18px;accent-color:var(--green);cursor:pointer;margin-top:2px;flex-shrink:0}
.cc-title{font-size:14px;font-weight:500;color:var(--text);line-height:1.4}
.cc-desc{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.45}
.check-list{display:flex;flex-direction:column;gap:2px}
.check-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s}
.check-row:hover{background:rgba(255,255,255,.04)}
.check-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0}
.check-row span{font-size:14px;color:var(--text2);line-height:1.4}
.radio-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:520px){.radio-grid{grid-template-columns:1fr}}
.radio-card{border:1.5px solid var(--border);border-radius:10px;padding:16px;cursor:pointer;background:var(--input-bg);transition:border-color .2s,background .2s}
.radio-card:has(input:checked){border-color:var(--green);background:rgba(34,197,94,.05)}
.radio-card input{display:none}
.rc-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.rc-title{font-size:14px;font-weight:600;color:var(--text)}
.rc-dot{width:16px;height:16px;border-radius:50%;border:2px solid var(--border);flex-shrink:0;transition:all .2s}
.radio-card:has(input:checked) .rc-dot{border-color:var(--green);background:var(--green);box-shadow:inset 0 0 0 3px var(--input-bg)}
.rc-desc{font-size:12px;color:var(--muted);line-height:1.5}
.tool-card{background:var(--input-bg);border:1.5px solid var(--border);border-radius:10px;padding:20px;margin-bottom:12px;transition:border-color .2s}
.tool-card:focus-within{border-color:rgba(34,197,94,.4)}
.tc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.tc-num{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--green);background:var(--green-glow);padding:4px 10px;border-radius:4px}
.tc-label{font-size:13px;font-weight:600;color:var(--text2)}
.btn-rm{display:flex;align-items:center;gap:5px;background:none;border:1px solid rgba(239,68,68,.3);color:#F87171;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .2s}
.btn-rm:hover{background:rgba(239,68,68,.1);border-color:var(--red)}
.btn-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:transparent;border:1.5px dashed var(--border);color:var(--muted);border-radius:10px;padding:12px;font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .2s;margin-top:4px}
.btn-add:hover{border-color:var(--green);color:var(--green);background:var(--green-glow)}
.hint{display:flex;gap:10px;background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.18);border-radius:10px;padding:14px 16px;font-size:13px;color:#FDE68A;line-height:1.65;margin-bottom:20px}
.hint-icon{font-size:16px;flex-shrink:0;margin-top:1px}
.empty{text-align:center;padding:36px 0;color:var(--muted);font-size:14px}
.empty svg{margin:0 auto 12px;display:block;opacity:.3}
.rev-block{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.rev-block:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.rev-block h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--dim);margin-bottom:12px}
.rev-row{display:flex;gap:12px;margin-bottom:8px;font-size:13px;line-height:1.5}
.rk{color:var(--muted);min-width:150px;flex-shrink:0}
.rv{color:var(--text);font-weight:500}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:3px 9px;font-size:11px;color:var(--muted)}
.alert-err{display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:14px 16px;font-size:13px;color:#FCA5A5;margin-top:12px;line-height:1.5}
.alert-err.show{display:block}
.w-footer{position:fixed;bottom:0;left:0;right:0;background:rgba(15,23,42,.96);backdrop-filter:blur(8px);border-top:1px solid var(--border);padding:14px 40px;display:flex;justify-content:space-between;align-items:center;z-index:20}
@media(max-width:640px){.w-footer{padding:12px 20px}}
.btn-back{background:none;border:1.5px solid var(--border);color:var(--muted);border-radius:8px;padding:10px 20px;font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
.btn-back:hover{border-color:var(--border2);color:var(--text)}
.btn-next{background:var(--green);color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
.btn-next:hover{background:var(--green-dark)}
.btn-next:disabled{opacity:.5;cursor:not-allowed}
.btn-submit{background:var(--green);color:#fff;border:none;border-radius:8px;padding:11px 28px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all .2s}
.btn-submit:hover{background:var(--green-dark);box-shadow:0 4px 18px rgba(34,197,94,.3)}
.btn-submit:disabled{opacity:.5;cursor:not-allowed}

/* ═══ NEW COMPONENTS ═══ */
.disclaimer{display:flex;gap:14px;background:rgba(234,179,8,.07);border:1px solid rgba(234,179,8,.22);border-radius:12px;padding:18px 20px;margin-bottom:24px;font-size:13px;color:#FDE68A;line-height:1.7}
.disc-icon{font-size:20px;flex-shrink:0;padding-top:1px}
.disclaimer strong{font-weight:700;color:#FDE068}
.disclaimer em{font-style:italic;font-weight:600;color:#FCD34D}

.locked-badge{font-size:10px;font-weight:700;background:rgba(234,179,8,.12);color:#FCD34D;border:1px solid rgba(234,179,8,.3);border-radius:4px;padding:2px 8px;margin-left:8px;vertical-align:middle;letter-spacing:.3px}
.locked-select{opacity:.4;cursor:not-allowed!important;pointer-events:none}
.locked-note{font-size:12px;color:var(--dim);margin-top:8px;line-height:1.65;padding:10px 14px;background:rgba(234,179,8,.04);border-radius:8px;border-left:2px solid rgba(234,179,8,.2)}

.rs-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)}
.rs-head-title{font-size:15px;font-weight:700;flex:1;color:var(--text)}
.rs-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.25);letter-spacing:.3px}
.rs-badge.dep{background:rgba(139,92,246,.1);color:#A78BFA;border-color:rgba(139,92,246,.25)}

.llm-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.llm-chip{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;padding:9px 14px;cursor:pointer;font-family:inherit;transition:all .2s;min-width:110px}
.llm-chip-name{font-size:13px;font-weight:600;color:var(--text2)}
.llm-chip-vendor{font-size:10px;color:var(--dim)}
.llm-chip.sel{border-color:var(--green);background:rgba(34,197,94,.07)}
.llm-chip.sel .llm-chip-name{color:var(--text)}
.llm-chip.sel .llm-chip-vendor{color:var(--green)}
.llm-chip:hover:not(.sel){border-color:var(--border2)}

.mini-checks{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.mini-chk{display:flex;align-items:center;gap:6px;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;color:var(--muted);transition:all .15s;font-family:inherit}
.mini-chk:has(input:checked){border-color:rgba(34,197,94,.4);color:var(--text2);background:rgba(34,197,94,.04)}
.mini-chk input{width:13px;height:13px;accent-color:var(--green);cursor:pointer;flex-shrink:0}

/* ═══ LOADING ═══ */
#loading{display:none;position:fixed;inset:0;background:rgba(15,23,42,.93);backdrop-filter:blur(6px);z-index:100;align-items:center;justify-content:center}
#loading.show{display:flex}
.ld-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:var(--shadow)}
.ld-logo{display:flex;align-items:center;justify-content:center;margin-bottom:28px}
.spin{width:52px;height:52px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 28px}
@keyframes spin{to{transform:rotate(360deg)}}
.ld-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:24px;text-align:left}
.ld-step{display:flex;align-items:center;gap:12px;opacity:.25;transition:opacity .4s}
.ld-step.active{opacity:1}
.ld-step.done{opacity:.55}
.ld-dot{width:8px;height:8px;border-radius:50%;background:var(--border);flex-shrink:0;transition:background .3s}
.ld-step.active .ld-dot,.ld-step.done .ld-dot{background:var(--green)}
.ld-step.active .ld-dot{animation:glow 1s infinite}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}
.ld-step span{font-size:14px;font-weight:500;color:var(--text2)}
.ld-step.active span{color:var(--text)}
.ld-note{font-size:12px;color:var(--dim)}

/* ═══ SUCCESS ═══ */
#success{display:none;min-height:100vh;align-items:center;justify-content:center;padding:40px 24px}
.sc-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:48px 36px;max-width:440px;width:100%;text-align:center;box-shadow:var(--shadow)}
.sc-icon{display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.sc-card h2{font-size:22px;font-weight:700;margin-bottom:8px}
.sc-card p{font-size:14px;color:var(--muted);line-height:1.65;margin-bottom:28px}
.btn-dl{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--green);color:#fff;border:none;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;width:100%;margin-bottom:12px;text-decoration:none;transition:all .2s}
.btn-dl:hover{background:var(--green-dark);box-shadow:0 4px 18px rgba(34,197,94,.3)}
.btn-restart{background:none;border:1.5px solid var(--border);color:var(--muted);border-radius:10px;padding:12px;font-size:14px;font-family:inherit;cursor:pointer;width:100%;transition:all .2s}
.btn-restart:hover{border-color:var(--border2);color:var(--text)}

/* ═══ THE PROBLEM SECTION ═══ */
.l-problem{padding:80px 24px;max-width:960px;margin:0 auto;text-align:center}
.l-problem-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:100px;padding:6px 16px;font-size:13px;font-weight:600;color:#FCA5A5;margin-bottom:24px}
.l-problem-badge svg{flex-shrink:0}
.l-problem h2{font-size:clamp(26px,4vw,44px);font-weight:800;letter-spacing:-1px;line-height:1.15;margin-bottom:16px}
.l-problem h2 span{background:linear-gradient(135deg,#EF4444,#F97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.l-problem-sub{font-size:16px;color:var(--muted);line-height:1.75;max-width:560px;margin:0 auto 56px}
.problem-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:760px){.problem-cards{grid-template-columns:1fr}}
.prob-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px 28px;text-align:left;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
.prob-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.prob-card.pc-red::before{background:linear-gradient(90deg,#EF4444,#F97316)}
.prob-card.pc-orange::before{background:linear-gradient(90deg,#F97316,#EAB308)}
.prob-card.pc-purple::before{background:linear-gradient(90deg,#8B5CF6,#6366F1)}
.prob-card:hover{border-color:var(--border2);transform:translateY(-3px)}
.pc-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:20px}
.pc-icon.ic-red{background:rgba(239,68,68,.1)}
.pc-icon.ic-orange{background:rgba(249,115,22,.1)}
.pc-icon.ic-purple{background:rgba(139,92,246,.1)}
.pc-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px}
.pc-stat{font-size:42px;font-weight:900;line-height:1;letter-spacing:-2px;margin-bottom:10px}
.pc-stat.cs-red{color:#EF4444}
.pc-stat.cs-orange{color:#F97316}
.pc-stat.cs-purple{color:#A78BFA}
.pc-desc{font-size:13px;color:var(--muted);line-height:1.65}

/* ═══ SOLUTION SECTION ═══ */
.l-sol-wrap{background:linear-gradient(180deg,transparent,rgba(34,197,94,.025),transparent);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:80px 24px}
.l-sol{max-width:1100px;margin:0 auto}
.l-sol-head{text-align:center;margin-bottom:56px}
.l-sol-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:100px;padding:6px 16px;font-size:13px;font-weight:600;color:#86EFAC;margin-bottom:22px}
.l-sol h2{font-size:clamp(26px,4vw,44px);font-weight:800;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.l-sol h2 em{font-style:normal;background:linear-gradient(135deg,var(--green),#4ADE80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.l-sol-sub{font-size:16px;color:var(--muted);line-height:1.75;max-width:560px;margin:0 auto}
.l-sol-body{display:grid;grid-template-columns:210px 1fr 210px;gap:36px;align-items:center;margin-top:56px}
@media(max-width:900px){.l-sol-body{grid-template-columns:1fr;gap:32px}}
.sol-col{display:flex;flex-direction:column;gap:28px}
.sol-feat{display:flex;align-items:flex-start;gap:12px}
.sf-ico{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.sfi-g{background:rgba(34,197,94,.1)}.sfi-b{background:rgba(59,130,246,.1)}.sfi-p{background:rgba(139,92,246,.1)}.sfi-o{background:rgba(249,115,22,.1)}
.sf-txt h4{font-size:14px;font-weight:700;color:var(--text);margin-bottom:5px;line-height:1.3}
.sf-txt p{font-size:12px;color:var(--muted);line-height:1.65}
.sol-cta{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:52px;flex-wrap:wrap}
.btn-sp{display:inline-flex;align-items:center;gap:8px;background:var(--green);color:#fff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;transition:all .2s}
.btn-sp:hover{background:var(--green-dark);box-shadow:0 8px 24px rgba(34,197,94,.3);transform:translateY(-1px)}
.btn-ss{display:inline-flex;align-items:center;gap:6px;background:none;border:1.5px solid var(--border);color:var(--muted);font-size:15px;font-weight:500;padding:12px 24px;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .2s}
.btn-ss:hover{border-color:var(--border2);color:var(--text)}
/* MacBook mockup */
.mb-wrap{position:relative}
.mb-outer{filter:drop-shadow(0 20px 64px rgba(0,0,0,.8)) drop-shadow(0 0 40px rgba(34,197,94,.07))}
.mb-lid{border-radius:14px 14px 3px 3px;border:10px solid #2C2C2E;overflow:hidden;position:relative;background:#1C1C1E;border-bottom-width:7px}
.mb-cambar{height:14px;background:#1C1C1E;display:flex;align-items:center;justify-content:center}
.mb-camdot{width:5px;height:5px;background:#3A3A3C;border-radius:50%}
.mb-screen{overflow:hidden}
.mb-base{background:linear-gradient(180deg,#3C3C3E 0%,#2A2A2C 100%);height:22px;border-radius:0 0 6px 6px;border-top:1px solid rgba(255,255,255,.1);position:relative}
.mb-notch-i{position:absolute;top:0;left:50%;transform:translateX(-50%);width:72px;height:7px;background:#1C1C1E;border-radius:0 0 8px 8px}
.mb-foot{height:5px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent);margin:0 8%}
/* Dashboard UI */
.db{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0F172A;overflow:hidden}
.db-bar{background:#1E293B;border-bottom:1px solid #263548;padding:5px 10px;display:flex;align-items:center;gap:6px}
.db-logo{display:flex;align-items:center;gap:4px;font-size:9px;font-weight:800;color:#fff;margin-right:10px;flex-shrink:0}
.db-nav{display:flex;gap:1px}
.db-ni{font-size:8px;color:#64748B;padding:2px 7px;border-radius:4px;font-weight:500;cursor:default;white-space:nowrap}
.db-ni.dna{color:#22C55E;background:rgba(34,197,94,.1)}
.db-spacer{flex:1}
.db-livebadge{display:flex;align-items:center;gap:3px;font-size:8px;color:#22C55E;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);padding:2px 8px;border-radius:100px;font-weight:600;flex-shrink:0}
.db-ldot{width:4px;height:4px;background:#22C55E;border-radius:50%;animation:blink 2s infinite}
.db-body{padding:10px 12px}
.db-toprow{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:10px}
.db-htitle{font-size:12px;font-weight:800;color:#F8FAFC;letter-spacing:-.2px}
.db-hsub{font-size:8px;color:#64748B;margin-top:2px}
.db-chip-ok{background:linear-gradient(135deg,rgba(34,197,94,.18),rgba(34,197,94,.05));border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:7px 11px;text-align:center;flex-shrink:0}
.db-chip-n{font-size:20px;font-weight:900;color:#22C55E;line-height:1}
.db-chip-l{font-size:7px;font-weight:700;color:#86EFAC;letter-spacing:.5px;margin-top:2px}
.db-krow{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:9px}
.db-k{background:#1E293B;border:1px solid #263548;border-radius:5px;padding:6px 7px}
.db-kn{font-size:13px;font-weight:800;line-height:1;color:#F8FAFC}
.kc-r{color:#EF4444}.kc-y{color:#EAB308}.kc-g{color:#22C55E}
.db-kl{font-size:7px;color:#64748B;margin-top:2px;line-height:1.3}
.db-slabel{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#475569;margin-bottom:4px}
.db-stbl{background:#1E293B;border:1px solid #263548;border-radius:6px;overflow:hidden;margin-bottom:8px}
.db-sr{display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid #263548}
.db-sr:last-child{border-bottom:none}
.db-sn{font-size:8px;font-weight:600;color:#CBD5E1;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-pill{font-size:6px;font-weight:700;padding:2px 5px;border-radius:100px;flex-shrink:0}
.dp-r{background:rgba(239,68,68,.12);color:#FCA5A5;border:1px solid rgba(239,68,68,.2)}
.dp-y{background:rgba(234,179,8,.12);color:#FDE68A;border:1px solid rgba(234,179,8,.2)}
.dp-g{background:rgba(34,197,94,.12);color:#86EFAC;border:1px solid rgba(34,197,94,.2)}
.db-prog{flex:0 0 48px;height:3px;background:#334155;border-radius:2px;overflow:hidden}
.db-pf{height:100%;border-radius:2px}
.db-pp{font-size:7px;color:#64748B;width:22px;text-align:right;flex-shrink:0}
.db-alist{display:flex;flex-direction:column;gap:3px}
.db-ar{display:flex;align-items:center;gap:5px;font-size:8px;padding:4px 7px;border-radius:4px;line-height:1.3}
.da-w{background:rgba(234,179,8,.06);color:#FDE68A}
.da-o{background:rgba(34,197,94,.06);color:#86EFAC}
</style>
</head>
<body>

<!-- ═══ LANDING ═══ -->
<section id="landing">
  <nav class="l-nav">
    ${markSvg(52)}
    ${logoSvg(288, 80)}
    <div class="l-pill"><span class="pulse"></span>Enforcement Active &middot; Sanzioni fino a &euro;35M in vigore</div>
  </nav>
  <div class="l-hero">
    <div class="l-hero-inner">
      <div class="hero-badge"><span class="pulse"></span>AI Act Reg. UE 2024/1689 &mdash; in vigore da agosto 2024</div>
      <h1 class="hero-h1">L&rsquo; AI &egrave; il tuo vantaggio<br><mark>La compliance non deve essere il tuo problema</mark></h1>
      <p class="hero-sub">Deployare IA senza compliance con l&rsquo;AI Act? Dal 2026 &egrave; come guidare senza assicurazione. Mappiamo i tuoi sistemi IA, catalogiamo i rischi e prepariamo una roadmap per essere compliant. Tutto automatizzato, in pochi minuti.</p>
      <button class="hero-btn" onclick="startWizard()">
        <svg width="20" height="20" viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
          <circle cx="63" cy="63" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" stroke-width="5.5"/>
          <g stroke="white" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23,81 36,95 81,25"/>
            <line x1="81" y1="25" x2="99" y2="89"/>
            <line x1="59" y1="60" x2="91" y2="60"/>
          </g>
        </svg>
        Risk Assessment Gratuito
      </button>
      <div class="hero-trust">
        <div class="trust-item"><div class="trust-check">&#10003;</div> Gratuito</div>
        <div class="trust-item"><div class="trust-check">&#10003;</div> ~10 minuti</div>
        <div class="trust-item"><div class="trust-check">&#10003;</div> Report PDF immediato</div>
        <div class="trust-item"><div class="trust-check">&#10003;</div> Nessuna registrazione</div>
      </div>
    </div>
  </div>

  <!-- ═══ THE PROBLEM ═══ -->
  <div class="l-problem">
    <div class="l-problem-badge">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Il Problema
    </div>
    <h2>La Compliance AI <span>è Rotta</span></h2>
    <p class="l-problem-sub">Le PMI che usano AI rischiano sanzioni fino a &euro;35M ma non hanno accesso agli stessi strumenti delle grandi aziende. Ecco perché.</p>
    <div class="problem-cards">
      <div class="prob-card pc-red">
        <div class="pc-icon ic-red">&#128178;</div>
        <div class="pc-label">Costi Proibitivi</div>
        <div class="pc-stat cs-red">&euro;50K+</div>
        <p class="pc-desc">Il costo medio di una consulenza legale specializzata in AI Act per una PMI. Un budget fuori portata per chi non è una grande corporation.</p>
      </div>
      <div class="prob-card pc-orange">
        <div class="pc-icon ic-orange">&#128336;</div>
        <div class="pc-label">Tempo Sprecato</div>
        <div class="pc-stat cs-orange">3&ndash;6 mesi</div>
        <p class="pc-desc">Quanto ci vuole per completare manualmente la documentazione AI Act. Mesi di riunioni, audit interni e burocrazia invece di costruire prodotti.</p>
      </div>
      <div class="prob-card pc-purple">
        <div class="pc-icon ic-purple">&#128295;</div>
        <div class="pc-label">Zero Strumenti</div>
        <div class="pc-stat cs-purple">0</div>
        <p class="pc-desc">Strumenti digitali pensati specificamente per la compliance AI Act delle PMI italiane ed europee. Il mercato è ancora vuoto.</p>
      </div>
    </div>
  </div>

  <!-- ═══ THE SOLUTION ═══ -->
  <div class="l-sol-wrap">
    <div class="l-sol">
      <div class="l-sol-head">
        <div class="l-sol-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          La Soluzione
        </div>
        <h2>AI Compliance, <em>Semplificata</em></h2>
        <p class="l-sol-sub">Abbiamo costruito la piattaforma che avremmo voluto esistesse &mdash; accessibile, self-service, pensata per portarti da &ldquo;da dove inizio?&rdquo; a &ldquo;sono conforme&rdquo; in settimane, non mesi.</p>
      </div>
      <div class="l-sol-body">

        <!-- Left feature column -->
        <div class="sol-col">
          <div class="sol-feat">
            <div class="sf-ico sfi-g">&#127919;</div>
            <div class="sf-txt">
              <h4>Classificazione Rischio Istantanea</h4>
              <p>Rispondi al questionario sui tuoi sistemi AI. La piattaforma mappa automaticamente ogni sistema alla corretta categoria AI Act e genera la tua roadmap di compliance personalizzata.</p>
            </div>
          </div>
          <div class="sol-feat">
            <div class="sf-ico sfi-p">&#128279;</div>
            <div class="sf-txt">
              <h4>Analisi Ruolo Provider &amp; Deployer</h4>
              <p>Identifica automaticamente i tuoi obblighi specifici in base al ruolo nella catena del valore AI: provider, deployer o entrambi, con gap analysis dedicata.</p>
            </div>
          </div>
        </div>

        <!-- MacBook center mockup -->
        <div class="mb-wrap">
          <div class="mb-outer">
            <div class="mb-lid">
              <div class="mb-cambar"><div class="mb-camdot"></div></div>
              <div class="mb-screen">
                <div class="db">
                  <div class="db-bar">
                    <div class="db-logo">${markSvg(14, "green")} Actify</div>
                    <div class="db-nav">
                      <span class="db-ni dna">Dashboard</span>
                      <span class="db-ni">Sistemi</span>
                      <span class="db-ni">Report</span>
                      <span class="db-ni">Impostazioni</span>
                    </div>
                    <div class="db-spacer"></div>
                    <div class="db-livebadge"><span class="db-ldot"></span>Live</div>
                  </div>
                  <div class="db-body">
                    <div class="db-toprow">
                      <div>
                        <div class="db-htitle">AI Act Compliance Dashboard</div>
                        <div class="db-hsub">Aggiornato 13 mag 2026 &middot; 3 azioni richieste</div>
                      </div>
                      <div class="db-chip-ok">
                        <div class="db-chip-n">94%</div>
                        <div class="db-chip-l">CONFORME</div>
                      </div>
                    </div>
                    <div class="db-krow">
                      <div class="db-k"><div class="db-kn">7</div><div class="db-kl">Sistemi AI</div></div>
                      <div class="db-k"><div class="db-kn kc-r">2</div><div class="db-kl">Rischio Alto</div></div>
                      <div class="db-k"><div class="db-kn kc-y">3</div><div class="db-kl">Azioni Pendenti</div></div>
                      <div class="db-k"><div class="db-kn kc-g">2 ago</div><div class="db-kl">Scadenza AI Act</div></div>
                    </div>
                    <div class="db-slabel">SISTEMI AI MONITORATI</div>
                    <div class="db-stbl">
                      <div class="db-sr">
                        <div class="db-sn">CRM Predittivo</div>
                        <div class="db-pill dp-r">ALTO RISCHIO</div>
                        <div class="db-prog"><div class="db-pf" style="width:78%;background:#EF4444"></div></div>
                        <div class="db-pp">78%</div>
                      </div>
                      <div class="db-sr">
                        <div class="db-sn">Chatbot Supporto</div>
                        <div class="db-pill dp-g">LIMITATO</div>
                        <div class="db-prog"><div class="db-pf" style="width:96%;background:#22C55E"></div></div>
                        <div class="db-pp">96%</div>
                      </div>
                      <div class="db-sr">
                        <div class="db-sn">Analytics HR</div>
                        <div class="db-pill dp-r">ALTO RISCHIO</div>
                        <div class="db-prog"><div class="db-pf" style="width:65%;background:#F97316"></div></div>
                        <div class="db-pp">65%</div>
                      </div>
                      <div class="db-sr">
                        <div class="db-sn">Selezione CV automatizzata</div>
                        <div class="db-pill dp-y">IN REVISIONE</div>
                        <div class="db-prog"><div class="db-pf" style="width:52%;background:#EAB308"></div></div>
                        <div class="db-pp">52%</div>
                      </div>
                    </div>
                    <div class="db-slabel">AZIONI PRIORITARIE</div>
                    <div class="db-alist">
                      <div class="db-ar da-w">&#9888; Aggiornare documentazione tecnica CRM Predittivo</div>
                      <div class="db-ar da-w">&#9888; Registrare sistemi nel Registro EUDB operatori</div>
                      <div class="db-ar da-o">&#10003; Human oversight implementato su tutti i sistemi</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mb-base"><div class="mb-notch-i"></div></div>
            <div class="mb-foot"></div>
          </div>
        </div>

        <!-- Right feature column -->
        <div class="sol-col">
          <div class="sol-feat">
            <div class="sf-ico sfi-b">&#9989;</div>
            <div class="sf-txt">
              <h4>Checklist di Compliance Dinamica</h4>
              <p>Una checklist dinamica di ogni requisito per il tuo livello di rischio. Traccia il completamento del team e identifica i gap di governance in tempo reale.</p>
            </div>
          </div>
          <div class="sol-feat">
            <div class="sf-ico sfi-o">&#128196;</div>
            <div class="sf-txt">
              <h4>Report Audit-Ready in PDF</h4>
              <p>Genera report di compliance completi con un click. Documenti professionali pronti per audit normativi e verifiche delle autorit&agrave; competenti.</p>
            </div>
          </div>
        </div>

      </div>
      <div class="sol-cta">
        <button class="btn-sp" onclick="startWizard()">
          <svg width="18" height="18" viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
            <circle cx="63" cy="63" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" stroke-width="5.5"/>
            <g stroke="white" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23,81 36,95 81,25"/>
              <line x1="81" y1="25" x2="99" y2="89"/>
              <line x1="59" y1="60" x2="91" y2="60"/>
            </g>
          </svg>
          Inizia il Risk Assessment Gratuito
        </button>
        <button class="btn-ss">Scopri di pi&ugrave; &#8594;</button>
      </div>
    </div>
  </div>

  <div class="l-cards">
    <div class="l-card"><div class="card-icon ci-green">&#128737;</div><h3>Classificazione del Rischio</h3><p>Mappa i tuoi sistemi AI alle categorie dell&rsquo;AI Act (Annex III) e scopri il livello di rischio: vietato, alto, limitato o minimale.</p></div>
    <div class="l-card"><div class="card-icon ci-purple">&#128196;</div><h3>Report PDF Professionale</h3><p>Documento audit-ready con analisi per sistema, timeline di adeguamento e azioni prioritarie specifiche per il tuo settore.</p></div>
    <div class="l-card"><div class="card-icon ci-blue">&#128506;</div><h3>Roadmap Personalizzata</h3><p>Piano d&rsquo;azione con scadenze AI Act, obblighi specifici per il tuo ruolo (Provider o Deployer) e gap di governance identificati.</p></div>
  </div>
</section>


<!-- ═══ WIZARD ═══ -->
<div id="app">
  <nav class="w-nav">
    <div class="w-logo">${logoSvg(162, 45)}</div>
    <div class="w-step-info" id="stepInfo">Step 1 di 6</div>
    <button class="w-exit" onclick="exitWizard()">&#8592; Esci</button>
  </nav>
  <div class="stepper" id="stepper"></div>
  <div class="w-body">

    <!-- ── Step 1: Profilo Azienda ── -->
    <div id="step1" class="step-panel">
      <div class="panel-head">
        <h2>Profilo Azienda</h2>
        <p>Iniziamo con le informazioni di base sulla tua organizzazione.</p>
      </div>

      <div class="disclaimer">
        <div class="disc-icon">&#9888;</div>
        <div>
          <strong>Nota per il compilatore &mdash; Garbage In, Garbage Out</strong><br>
          Come in ogni sistema tecnologico, la qualit&agrave; del tuo report dipende direttamente dalla precisione delle informazioni che fornisci. Essere vago o impreciso produrr&agrave; un report generico e poco utile. <em>Pi&ugrave; sei specifico</em> sui sistemi AI in uso, i processi decisionali e il contesto aziendale, pi&ugrave; l&rsquo;analisi sar&agrave; coerentemente veritiera e azionabile per la tua compliance.
        </div>
      </div>

      <div class="fcard">
        <div class="field-row">
          <div class="field">
            <label>Nome Azienda *</label>
            <input type="text" id="companyName" placeholder="Es. Acme S.r.l." autocomplete="organization" />
          </div>
          <div class="field">
            <label>Email Aziendale *</label>
            <input type="email" id="contactEmail" placeholder="Es. compliance@azienda.it" autocomplete="email" />
            <div style="font-size:11px;color:var(--muted);margin-top:5px;line-height:1.5">Riceverai un codice OTP per verificare il tuo indirizzo. Il report verr&agrave; consegnato qui.</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Settore *</label>
            <select id="companySector">
              <option value="">&#8212; Seleziona settore &#8212;</option>
              <option>Risorse Umane / Recruiting</option>
              <option>Servizi Finanziari / Banca</option>
              <option>Assicurazioni</option>
              <option>Sanit&agrave; / Life Sciences</option>
              <option>Istruzione / EdTech</option>
              <option>Manifatturiero / Industria</option>
              <option>Tecnologia / SaaS</option>
              <option>Retail / E-commerce</option>
              <option>Pubblica Amministrazione</option>
              <option>Legale / Compliance</option>
              <option>Marketing / Media</option>
              <option>Logistica / Supply Chain</option>
              <option>Energia / Utilities</option>
              <option>Altro</option>
            </select>
          </div>
          <div class="field">
            <label>Dimensione *</label>
            <select id="companySize">
              <option value="">&#8212; N&deg; dipendenti &#8212;</option>
              <option value="1-10">1&ndash;10 (Micro)</option>
              <option value="11-50">11&ndash;50 (Piccola)</option>
              <option value="51-250">51&ndash;250 (Media)</option>
              <option value="251-1000">251&ndash;1.000 (Grande)</option>
              <option value="1000+">1.000+ (Enterprise)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Sede Legale *</label>
            <select id="companySede">
              <option value="">&#8212; Seleziona &#8212;</option>
              <option value="Italia">&#127470;&#127481; Italia</option>
              <option value="EU">&#127466;&#127482; Unione Europea (altro paese EU)</option>
              <option value="Rest of World">&#127760; Rest of World</option>
            </select>
          </div>
          <div class="field">
            <label>Range Fatturato <span class="locked-badge">&#128274; Premium</span></label>
            <select class="locked-select" disabled>
              <option>&#8212; disponibile nella versione a pagamento &#8212;</option>
            </select>
            <div class="locked-note">Questa feature &egrave; abilitata nella versione a pagamento per permetterci di fare una stima delle sanzioni economiche in cui potresti incorrere.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Step OTP: Verifica Email ── -->
    <div id="stepOtp" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>Verifica Email</h2>
        <p>Abbiamo inviato un codice a 6 cifre al tuo indirizzo email. Inseriscilo qui sotto per continuare.</p>
      </div>

      <div class="fcard">
        <div id="otpEmailDisplay" style="font-size:13px;color:var(--muted);margin-bottom:20px"></div>
        <div class="field">
          <label>Codice di verifica *</label>
          <input type="text" id="otpCode" placeholder="000000" inputmode="numeric" pattern="[0-9]*" maxlength="6" oninput="onOtpInput()" onkeydown="if(event.key==='Enter')submitOtp()" autocomplete="one-time-code" style="font-size:24px;letter-spacing:8px;text-align:center;font-weight:700" />
        </div>
        <div id="otpError" style="display:none;color:#F87171;font-size:13px;margin-top:-10px;margin-bottom:16px"></div>
        <button class="btn-next" onclick="submitOtp()" style="width:100%;justify-content:center;margin-bottom:16px">Verifica Codice</button>
        <div style="text-align:center">
          <button id="btnResendOtp" onclick="resendOtp()" style="background:none;border:none;color:var(--green);font-size:13px;font-family:inherit;cursor:pointer;font-weight:500">Invia di nuovo</button>
          <div id="resendTimer" style="display:none;font-size:12px;color:var(--muted);margin-top:6px">Richiedi nuovo codice tra <span id="resendCountdown">60</span> secondi</div>
        </div>
      </div>
    </div>

    <!-- ── Step 2: Ruolo & Sistemi AI ── -->
    <div id="step2" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>Ruolo &amp; Sistemi AI</h2>
        <p>Seleziona il tuo ruolo rispetto all&rsquo;AI Act e inserisci i sistemi AI della tua organizzazione.</p>
      </div>

      <div class="fcard">
        <h3>Il tuo ruolo rispetto ai sistemi AI *</h3>
        <p>Puoi selezionare entrambi se sei sia Provider che Deployer di sistemi AI diversi.</p>
        <div class="check-cards">
          <label class="check-card">
            <input type="checkbox" id="isProvider" onchange="toggleRole()">
            <div>
              <div class="cc-title">Provider (Fornitore)</div>
              <div class="cc-desc">Sviluppi, commercializzi o metti sul mercato sistemi AI con il tuo marchio, anche come componente di un servizio SaaS pi&ugrave; ampio</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="isDeployer" onchange="toggleRole()">
            <div>
              <div class="cc-title">Deployer (Utilizzatore)</div>
              <div class="cc-desc">Usi nella tua attivit&agrave; sistemi AI sviluppati da terzi: API, SaaS, strumenti LLM, software specializzati</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Provider section -->
      <div id="providerSection" style="display:none">
        <div class="fcard">
          <div class="rs-head">
            <div class="rs-head-title">Sistemi AI Proprietari</div>
            <span class="rs-badge">Provider</span>
          </div>
          <p>Inserisci i sistemi AI che la tua azienda ha sviluppato e mette sul mercato o integra nei propri servizi.</p>
          <div id="providerList"></div>
          <button class="btn-add" onclick="addProviderSystem()">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Aggiungi Sistema AI Proprietario
          </button>
        </div>
      </div>

      <!-- Deployer section -->
      <div id="deployerSection" style="display:none">
        <div class="fcard">
          <div class="rs-head">
            <div class="rs-head-title">Sistemi AI in Uso</div>
            <span class="rs-badge dep">Deployer</span>
          </div>
          <h3 style="margin-bottom:10px">A. LLM / AI Generativa &mdash; Strumenti Standard</h3>
          <p>Seleziona tutti gli strumenti GenAI che la tua organizzazione utilizza.</p>
          <div class="llm-grid" id="llmGrid"></div>
          <div id="llmDetails"></div>
        </div>
        <div class="fcard">
          <h3>B. Sistemi AI Specializzati</h3>
          <p>Sistemi AI verticali per funzioni specifiche (recruiting AI, credit scoring, diagnostica, ecc.).</p>
          <div id="depSpecList"></div>
          <button class="btn-add" onclick="addDeployerSpecialized()">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Aggiungi Sistema Specializzato
          </button>
        </div>
      </div>
    </div>

    <!-- ── Step 3: Decisioni & Human-in-the-Loop ── -->
    <div id="step3" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>Decisioni &amp; Human-in-the-Loop</h2>
        <p>Come i sistemi AI influenzano i processi decisionali nella tua organizzazione.</p>
      </div>

      <div class="fcard">
        <h3>Processo Decisionale AI</h3>
        <div class="check-cards">
          <label class="check-card">
            <input type="checkbox" id="makesDec">
            <div>
              <div class="cc-title">I sistemi AI producono decisioni o raccomandazioni che impattano persone fisiche</div>
              <div class="cc-desc">Include: assunzione, accesso al credito, diagnosi, valutazione scolastica, accesso a servizi, scoring comportamentale</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="vulnerable">
            <div>
              <div class="cc-title">I sistemi interagiscono con soggetti vulnerabili</div>
              <div class="cc-desc">Minori, anziani, persone con disabilit&agrave;, persone in difficolt&agrave; economica o emotiva</div>
            </div>
          </label>
        </div>
      </div>

      <div class="fcard">
        <h3>Supervisione Umana (Human-in-the-Loop)</h3>
        <div class="radio-grid" style="grid-template-columns:1fr 1fr">
          <label class="radio-card">
            <input type="radio" name="humanOversight" value="always">
            <div class="rc-row"><div class="rc-title">Sempre presente</div><div class="rc-dot"></div></div>
            <div class="rc-desc">Ogni output AI &egrave; revisionato e approvato da un operatore umano prima di produrre effetti</div>
          </label>
          <label class="radio-card">
            <input type="radio" name="humanOversight" value="sometimes">
            <div class="rc-row"><div class="rc-title">In alcuni casi</div><div class="rc-dot"></div></div>
            <div class="rc-desc">Supervisione umana solo per decisioni ad alto rischio o casi limite; il resto &egrave; automatico</div>
          </label>
          <label class="radio-card">
            <input type="radio" name="humanOversight" value="never">
            <div class="rc-row"><div class="rc-title">Mai &mdash; Full Automatic</div><div class="rc-dot"></div></div>
            <div class="rc-desc">Il sistema decide o agisce autonomamente senza alcun intervento umano nel loop</div>
          </label>
          <label class="radio-card">
            <input type="radio" name="humanOversight" value="na">
            <div class="rc-row"><div class="rc-title">Non applicabile</div><div class="rc-dot"></div></div>
            <div class="rc-desc">I sistemi AI non producono decisioni su persone fisiche (uso puramente interno/operativo)</div>
          </label>
        </div>
      </div>

      <div class="fcard">
        <h3>Ambiti di Decisione</h3>
        <div class="check-list">
          <label class="check-row"><input type="checkbox" class="domain" value="hiring"><span>Assunzione, selezione e screening del personale</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="performance_management"><span>Valutazione delle prestazioni, promozioni, licenziamenti</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="credit_scoring"><span>Valutazione creditizia, prestiti, scoring finanziario</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="insurance"><span>Assicurazioni: underwriting, tariffazione, liquidazione sinistri</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="healthcare_diagnosis"><span>Diagnosi medica, supporto clinico, triage</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="education_assessment"><span>Valutazione studenti, accesso all&rsquo;istruzione, orientamento</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="public_services"><span>Accesso a servizi pubblici, sussidi, benefici sociali</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="law_enforcement"><span>Forze dell&rsquo;ordine, controllo biometrico, sorveglianza</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="content_moderation"><span>Moderazione contenuti, accesso a piattaforme digitali</span></label>
          <label class="check-row"><input type="checkbox" class="domain" value="other_decisions"><span>Altre decisioni con impatto significativo su persone</span></label>
        </div>
      </div>

      <div class="fcard">
        <h3>Tipologie di Dati Trattati dall&rsquo;AI</h3>
        <div class="check-list">
          <label class="check-row"><input type="checkbox" class="dtype" value="biometric"><span>Dati biometrici (volto, voce, impronte digitali, andatura)</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="health"><span>Dati sanitari, cartelle cliniche, stati di salute</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="financial"><span>Dati finanziari, bancari, reddituali</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="behavioral"><span>Dati comportamentali, navigazione, pattern di utilizzo</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="location"><span>Dati di geolocalizzazione o movimenti fisici</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="personal_identifiers"><span>Identificatori personali (nome, CF, email, numero di telefono)</span></label>
          <label class="check-row"><input type="checkbox" class="dtype" value="sensitive_categories"><span>Categorie speciali GDPR (etnia, religione, salute, orientamento sessuale, opinioni politiche)</span></label>
        </div>
      </div>
    </div>

    <!-- ── Step 4: AI Readiness ── -->
    <div id="step4" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>AI Readiness</h2>
        <p>Valuta il livello di presidio gi&agrave; in atto nella tua organizzazione rispetto agli obblighi dell&rsquo;AI Act.</p>
      </div>

      <div class="fcard">
        <h3>Responsabile Protezione Dati (DPO)</h3>
        <div class="radio-grid" style="grid-template-columns:repeat(3,1fr)">
          <label class="radio-card">
            <input type="radio" name="dpoStatus" value="inhouse">
            <div class="rc-row"><div class="rc-title">In-house</div><div class="rc-dot"></div></div>
            <div class="rc-desc">DPO designato come dipendente o figura interna dell&rsquo;organizzazione</div>
          </label>
          <label class="radio-card">
            <input type="radio" name="dpoStatus" value="service">
            <div class="rc-row"><div class="rc-title">As a Service</div><div class="rc-dot"></div></div>
            <div class="rc-desc">DPO esterno: consulente, studio legale o servizio DPO-as-a-service</div>
          </label>
          <label class="radio-card">
            <input type="radio" name="dpoStatus" value="none">
            <div class="rc-row"><div class="rc-title">Non presente</div><div class="rc-dot"></div></div>
            <div class="rc-desc">Nessun DPO formalmente designato al momento</div>
          </label>
        </div>
      </div>

      <div class="fcard">
        <h3>Presidi di Conformit&agrave; AI</h3>
        <div class="check-cards">
          <label class="check-card">
            <input type="checkbox" id="hasInventory">
            <div>
              <div class="cc-title">Inventario AI formalizzato</div>
              <div class="cc-desc">Registro documentato di tutti i sistemi AI in uso: scopi, vendor, responsabili e data di adozione</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="hasImpact">
            <div>
              <div class="cc-title">Valutazione d&rsquo;impatto AI condotta (FRIA / DPIA)</div>
              <div class="cc-desc">AI Act Art. 27 (FRIA) e GDPR Art. 35 (DPIA) &mdash; obbligatoria per sistemi ad alto rischio</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="hasIncident">
            <div>
              <div class="cc-title">Procedura di gestione incidenti AI documentata</div>
              <div class="cc-desc">Processo definito per segnalare, tracciare e gestire malfunzionamenti o danni causati da AI</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="hasAiPolicy">
            <div>
              <div class="cc-title">Policy interna sull&rsquo;uso dell&rsquo;AI</div>
              <div class="cc-desc">Documento formale che definisce regole, responsabilit&agrave; e limiti nell&rsquo;adozione di strumenti AI in azienda</div>
            </div>
          </label>
          <label class="check-card">
            <input type="checkbox" id="hasTraining">
            <div>
              <div class="cc-title">Formazione del personale sull&rsquo;AI</div>
              <div class="cc-desc">Dipendenti e responsabili hanno ricevuto formazione specifica sull&rsquo;uso sicuro e consapevole dell&rsquo;AI</div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- ── Step 5: Contesto ── -->
    <div id="step5" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>Contesto &amp; Note</h2>
        <p>Questo campo viene analizzato direttamente dall&rsquo;AI. Pi&ugrave; dettagli fornisci, pi&ugrave; il report sar&agrave; preciso.</p>
      </div>
      <div class="fcard">
        <div class="hint">
          <span class="hint-icon">&#127919;</span>
          <span>Descrivi come usi esattamente i sistemi AI, chi ne &egrave; impattato, aspetti critici del tuo settore, dubbi specifici sulla compliance. Spesso questo campo rivela rischi non catturati dalle checkbox precedenti. <strong>Ricorda: garbage in, garbage out.</strong></span>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>Note Libere &mdash; Contesto Specifico</label>
          <textarea id="contextNotes" rows="7" placeholder="Es: Usiamo HireVue per lo screening iniziale di tutti i candidati. Il sistema produce un punteggio 0-100 e chi scende sotto 60 non viene mai contattato. Operiamo nel settore bancario. Il nostro sistema di credit scoring gira su AWS SageMaker e produce decisioni automatiche su importi fino a 10.000 euro senza revisione umana. Abbiamo clienti in tutta Europa..."></textarea>
        </div>
      </div>
    </div>

    <!-- ── Step 6: Riepilogo ── -->
    <div id="step6" class="step-panel" style="display:none">
      <div class="panel-head">
        <h2>Riepilogo e Generazione</h2>
        <p>Verifica i dati inseriti prima di generare il tuo report di compliance AI Act personalizzato.</p>
      </div>
      <div class="fcard">
        <div id="reviewContent"></div>
      </div>
      <div class="alert-err" id="errorAlert"></div>
    </div>

  </div><!-- /w-body -->

  <div class="w-footer" id="wFooter">
    <button class="btn-back" id="btnBack" onclick="goBack()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Indietro
    </button>
    <button class="btn-next" id="btnNext" onclick="goNext()">
      <span id="btnNextLabel">Avanti</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11l4-4-4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button class="btn-submit" id="btnSubmit" style="display:none" onclick="submitForm()">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Genera Report PDF
    </button>
  </div>
</div>


<!-- ═══ LOADING ═══ -->
<div id="loading">
  <div class="ld-card">
    <div class="ld-logo">${markSvg(56)}</div>
    <div class="spin"></div>
    <div class="ld-steps">
      <div class="ld-step active" id="ls1"><div class="ld-dot"></div><span>Analizzando il profilo aziendale&hellip;</span></div>
      <div class="ld-step"        id="ls2"><div class="ld-dot"></div><span>Classificando i sistemi AI per livello di rischio&hellip;</span></div>
      <div class="ld-step"        id="ls3"><div class="ld-dot"></div><span>Applicando framework AI Act Reg. 2024/1689&hellip;</span></div>
      <div class="ld-step"        id="ls4"><div class="ld-dot"></div><span>Generando report PDF personalizzato&hellip;</span></div>
    </div>
    <div class="ld-note">Operazione tipicamente di 15&ndash;20 secondi</div>
  </div>
</div>


<!-- ═══ SUCCESS ═══ -->
<div id="success">
  <div class="sc-card">
    <div class="sc-icon">${markSvg(68)}</div>
    <h2>Report Pronto!</h2>
    <p>Il tuo report di compliance AI Act &egrave; stato generato. Il link di download &egrave; valido per 15 minuti.</p>
    <a class="btn-dl" id="downloadBtn" href="#" target="_blank">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 7l4 4 4-4M2 13h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Scarica Report PDF
    </a>
    <button class="btn-restart" onclick="doRestart()">Esegui un nuovo assessment</button>
  </div>
</div>


<script>
// ── Constants ─────────────────────────────────────────────────────────────────
var STEP_NAMES = ['Profilo Azienda', 'Ruolo & Sistemi AI', 'Decisioni', 'AI Readiness', 'Contesto', 'Riepilogo'];
var TOTAL_STEPS = 6;

var AI_CATS = [
  {v:'hr',        l:'HR & Recruiting'},
  {v:'finance',   l:'Finanza & Contabilità'},
  {v:'marketing', l:'Marketing & Vendite'},
  {v:'operations',l:'Operations & Logistica'},
  {v:'legal',     l:'Legale & Compliance'},
  {v:'tech',      l:'Tecnico-IT & Sviluppo'},
  {v:'healthcare',l:'Sanità & Life Sciences'},
  {v:'other',     l:'Altro (specifica sotto)'}
];

var LLM_LIST = [
  {id:'chatgpt',    l:'ChatGPT',    v:'OpenAI'},
  {id:'claude',     l:'Claude',     v:'Anthropic'},
  {id:'gemini',     l:'Gemini',     v:'Google'},
  {id:'copilot',    l:'Copilot',    v:'Microsoft'},
  {id:'llama',      l:'Llama',      v:'Meta'},
  {id:'mistral',    l:'Mistral',    v:'Mistral AI'},
  {id:'perplexity', l:'Perplexity', v:'Perplexity AI'},
  {id:'grok',       l:'Grok',       v:'xAI'},
  {id:'other_llm',  l:'Altro LLM',  v:''}
];

// ── State ─────────────────────────────────────────────────────────────────────
var cur = 1;
var isProvider = false;
var isDeployer = false;
var providerSystems = [];
var deployerLlmSelected = [];
var deployerSpecialized = [];
var loadTimer;
var loadStep = 0;
var otpVerified = false;
var showingOtp = false;
var otpResendAt = 0;
var resendTimerInterval = null;

// ── Boot ──────────────────────────────────────────────────────────────────────
function startWizard() {
  document.getElementById('landing').style.display = 'none';
  var app = document.getElementById('app');
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  refreshUI();
}
function exitWizard() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
}
function doRestart() {
  cur = 1; isProvider = false; isDeployer = false;
  providerSystems = []; deployerLlmSelected = []; deployerSpecialized = [];
  otpVerified = false; showingOtp = false; otpResendAt = 0;
  clearInterval(resendTimerInterval);
  document.getElementById('success').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function renderStepper() {
  document.getElementById('stepper').innerHTML = STEP_NAMES.map(function(name, i) {
    var n = i + 1;
    var done = n < cur, active = n === cur;
    var dc = done ? 'done' : active ? 'active' : '';
    var nc = done ? 'done' : active ? 'active' : '';
    var lc = n < cur ? 'done' : '';
    var icon = done ? '&#10003;' : String(n);
    var line = n < TOTAL_STEPS ? '<div class="s-line ' + lc + '"></div>' : '';
    return '<div class="s-item"><div class="s-dot-wrap"><div class="s-dot ' + dc + '">' + icon + '</div>'
      + '<div class="s-name ' + nc + '">' + name + '</div></div>' + line + '</div>';
  }).join('');
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goNext() {
  if (!validate(cur)) return;
  if (cur === 1 && !otpVerified) { sendOtp(); return; }
  if (showingOtp) { submitOtp(); return; }
  if (cur < TOTAL_STEPS) {
    document.getElementById('step' + cur).style.display = 'none';
    cur++;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}
function goBack() {
  if (showingOtp) { hideOtpPanel(); return; }
  if (cur > 1) {
    document.getElementById('step' + cur).style.display = 'none';
    cur--;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}

// ── OTP ───────────────────────────────────────────────────────────────────────
async function sendOtp() {
  var email = fv('contactEmail');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Inserisci un indirizzo email valido per ricevere il codice OTP.');
    return;
  }
  var company = fv('companyName') || 'Azienda';
  var btn = document.getElementById('btnNext');
  if (btn) { btn.disabled = true; btn.textContent = 'Invio codice…'; }
  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res = await fetch(apiUrl + '/api/verify/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: email, company_name: company })
    });
    var data = await res.json();
    if (!res.ok) {
      alert(data.message || data.error || 'Errore nell\'invio del codice. Riprova.');
      return;
    }
    if (data.status === 'already_verified') {
      otpVerified = true;
      document.getElementById('step1').style.display = 'none';
      cur++;
      document.getElementById('step' + cur).style.display = '';
      refreshUI();
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    showOtpPanel(email);
    startResendTimer(data.retry_after || 60);
  } catch(err) {
    alert('Errore di rete: ' + (err.message || 'Riprova tra qualche minuto.'));
  } finally {
    if (btn) btn.disabled = false;
    var lbl = document.getElementById('btnNextLabel');
    if (lbl && !showingOtp) lbl.textContent = 'Avanti';
  }
}
function showOtpPanel(email) {
  document.getElementById('step1').style.display = 'none';
  document.getElementById('stepOtp').style.display = '';
  var disp = document.getElementById('otpEmailDisplay');
  if (disp) disp.textContent = 'Codice inviato a: ' + email;
  var errEl = document.getElementById('otpError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  var codeEl = document.getElementById('otpCode');
  if (codeEl) { codeEl.value = ''; setTimeout(function(){ codeEl.focus(); }, 100); }
  showingOtp = true;
  var bBack = document.getElementById('btnBack');
  var bNext = document.getElementById('btnNext');
  var bLbl  = document.getElementById('btnNextLabel');
  var bSub  = document.getElementById('btnSubmit');
  if (bBack) bBack.style.display = '';
  if (bNext) bNext.style.display = '';
  if (bLbl)  bLbl.textContent = 'Verifica';
  if (bSub)  bSub.style.display = 'none';
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function hideOtpPanel() {
  document.getElementById('stepOtp').style.display = 'none';
  document.getElementById('step1').style.display = '';
  showingOtp = false;
  clearInterval(resendTimerInterval);
  var bLbl = document.getElementById('btnNextLabel');
  if (bLbl) bLbl.textContent = 'Avanti';
  refreshUI();
}
function onOtpInput() {
  var el = document.getElementById('otpCode');
  if (!el) return;
  el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
}
async function submitOtp() {
  var email = fv('contactEmail');
  var codeEl = document.getElementById('otpCode');
  var code = codeEl ? codeEl.value.trim() : '';
  var errEl = document.getElementById('otpError');
  if (!code || code.length !== 6) {
    if (errEl) { errEl.textContent = 'Inserisci il codice a 6 cifre ricevuto via email.'; errEl.style.display = ''; }
    return;
  }
  var btn = document.getElementById('btnNext');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifica…'; }
  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res = await fetch(apiUrl + '/api/verify/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: email, code: code })
    });
    var data = await res.json();
    if (!res.ok) {
      var msg = data.message || data.error || 'Codice non valido.';
      if (data.attempts_remaining !== undefined) msg += ' (' + data.attempts_remaining + ' tentativi rimanenti)';
      if (errEl) { errEl.textContent = msg; errEl.style.display = ''; }
      return;
    }
    otpVerified = true;
    clearInterval(resendTimerInterval);
    hideOtpPanel();
    document.getElementById('step' + cur).style.display = 'none';
    cur++;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  } catch(err) {
    if (errEl) { errEl.textContent = 'Errore di rete: ' + (err.message || 'Riprova.'); errEl.style.display = ''; }
  } finally {
    if (btn) btn.disabled = false;
    var lbl = document.getElementById('btnNextLabel');
    if (lbl) lbl.textContent = 'Verifica';
  }
}
async function resendOtp() {
  if (Date.now() < otpResendAt) return;
  var email = fv('contactEmail');
  var company = fv('companyName') || 'Azienda';
  var errEl = document.getElementById('otpError');
  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res = await fetch(apiUrl + '/api/verify/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: email, company_name: company })
    });
    var data = await res.json();
    if (!res.ok) {
      if (errEl) { errEl.textContent = data.message || data.error || 'Errore nel reinvio.'; errEl.style.display = ''; }
      return;
    }
    if (errEl) errEl.style.display = 'none';
    startResendTimer(data.retry_after || 60);
  } catch(err) {
    if (errEl) { errEl.textContent = 'Errore di rete: ' + (err.message || 'Riprova.'); errEl.style.display = ''; }
  }
}
function startResendTimer(seconds) {
  otpResendAt = Date.now() + seconds * 1000;
  clearInterval(resendTimerInterval);
  var btn = document.getElementById('btnResendOtp');
  var timerEl = document.getElementById('resendTimer');
  var countEl = document.getElementById('resendCountdown');
  if (btn) btn.disabled = true;
  if (timerEl) timerEl.style.display = '';
  function tick() {
    var remaining = Math.ceil((otpResendAt - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(resendTimerInterval);
      if (btn) btn.disabled = false;
      if (timerEl) timerEl.style.display = 'none';
      return;
    }
    if (countEl) countEl.textContent = String(remaining);
  }
  tick();
  resendTimerInterval = setInterval(tick, 1000);
}
function refreshUI() {
  renderStepper();
  document.getElementById('stepInfo').textContent = 'Step ' + cur + ' di ' + TOTAL_STEPS;
  document.getElementById('btnBack').style.display = cur === 1 ? 'none' : '';
  document.getElementById('btnNext').style.display = cur === TOTAL_STEPS ? 'none' : '';
  document.getElementById('btnSubmit').style.display = cur === TOTAL_STEPS ? '' : 'none';
  if (cur === TOTAL_STEPS) renderReview();
  if (cur === 2) { renderLlmGrid(); renderProviderSystems(); renderDeployerSpecialized(); renderLlmDetails(); }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(s) {
  if (s === 1) {
    if (!fv('companyName'))   { alert('Inserisci il nome dell\\'azienda.'); return false; }
    if (!fv('contactEmail') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fv('contactEmail'))) { alert('Inserisci un indirizzo email valido.'); return false; }
    if (!fv('companySector')) { alert('Seleziona il settore.'); return false; }
    if (!fv('companySize'))   { alert('Seleziona la dimensione aziendale.'); return false; }
    if (!fv('companySede'))   { alert('Seleziona la sede legale.'); return false; }
  }
  if (s === 2) {
    var prov = document.getElementById('isProvider').checked;
    var dep  = document.getElementById('isDeployer').checked;
    if (!prov && !dep) { alert('Seleziona almeno un ruolo: Provider o Deployer.'); return false; }
    var hasTools = (prov && providerSystems.length > 0) || (dep && (deployerLlmSelected.length > 0 || deployerSpecialized.length > 0));
    if (!hasTools) {
      return confirm('Nessun sistema AI inserito. Il report sarà significativamente meno preciso. Continuare comunque?');
    }
  }
  return true;
}
function fv(id) { return (document.getElementById(id) || {value: ''}).value.trim(); }
function companyName() { return fv('companyName') || 'la tua azienda'; }

// ── Role toggle ───────────────────────────────────────────────────────────────
function toggleRole() {
  isProvider = document.getElementById('isProvider').checked;
  isDeployer = document.getElementById('isDeployer').checked;
  document.getElementById('providerSection').style.display = isProvider ? '' : 'none';
  document.getElementById('deployerSection').style.display = isDeployer ? '' : 'none';
  if (isProvider && !providerSystems.length) { addProviderSystem(); return; }
  if (isDeployer) { renderLlmGrid(); renderDeployerSpecialized(); renderLlmDetails(); }
  renderProviderSystems();
}

// ── Target Users helper ───────────────────────────────────────────────────────
function renderTargetChecks(type, idx, sel) {
  var vals = ['employees', 'customers', 'third_parties'];
  var labs = ['Dipendenti Interni', 'Clienti / Utenti', 'Terze Parti (es. candidati)'];
  var h = '<div class="field"><label>Utenti Target</label><div class="mini-checks">';
  for (var j = 0; j < vals.length; j++) {
    var chk = sel && sel.indexOf(vals[j]) >= 0 ? ' checked' : '';
    h += '<label class="mini-chk"><input type="checkbox"' + chk
      + ' onchange="toggleTarget(\\'' + type + '\\',' + idx + ',\\'' + vals[j] + '\\',this.checked)">'
      + labs[j] + '</label>';
  }
  h += '</div></div>';
  return h;
}
function toggleTarget(type, idx, val, on) {
  var arr = type === 'prov' ? providerSystems : type === 'llm' ? deployerLlmSelected : deployerSpecialized;
  var tu = arr[idx].target_users;
  if (on) { if (tu.indexOf(val) < 0) tu.push(val); }
  else { var ix = tu.indexOf(val); if (ix >= 0) tu.splice(ix, 1); }
}

// ── Provider Systems ──────────────────────────────────────────────────────────
function addProviderSystem() {
  providerSystems.push({tool_name: '', category: 'tech', purpose: '', target_users: []});
  renderProviderSystems();
}
function removeProviderSystem(i) { providerSystems.splice(i, 1); renderProviderSystems(); }
function renderProviderSystems() {
  var c = document.getElementById('providerList'); if (!c) return;
  if (!providerSystems.length) {
    c.innerHTML = '<div class="empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="12" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M14 20h12M14 26h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>Nessun sistema proprietario aggiunto.</p></div>';
    return;
  }
  c.innerHTML = providerSystems.map(function(s, i) {
    var catOpts = AI_CATS.map(function(cat) {
      return '<option value="' + cat.v + '"' + (s.category === cat.v ? ' selected' : '') + '>' + cat.l + '</option>';
    }).join('');
    var tuHtml = renderTargetChecks('prov', i, s.target_users);
    return '<div class="tool-card">'
      + '<div class="tc-head">'
      + '<span class="tc-num">Sistema Proprietario #' + (i + 1) + '</span>'
      + '<button class="btn-rm" onclick="removeProviderSystem(' + i + ')">&#10005; Rimuovi</button>'
      + '</div>'
      + '<div class="field-row">'
      + '<div class="field"><label>Nome Sistema *</label>'
      + '<input type="text" value="' + esc(s.tool_name) + '" placeholder="Es. Actify Analytics, SmartHire..." oninput="providerSystems[' + i + '].tool_name=this.value"></div>'
      + '<div class="field"><label>Categoria</label>'
      + '<select onchange="providerSystems[' + i + '].category=this.value">' + catOpts + '</select></div>'
      + '</div>'
      + '<div class="field"><label>Vendor / Sviluppatore</label>'
      + '<input type="text" value="' + esc(companyName()) + '" readonly style="opacity:.45;cursor:not-allowed" placeholder="(nome azienda da Step 1)"></div>'
      + '<div class="field"><label>Finalit&agrave; d\\'uso *</label>'
      + '<textarea rows="2" placeholder="A cosa serve, come viene usato, quali decisioni supporta..." oninput="providerSystems[' + i + '].purpose=this.value">' + esc(s.purpose) + '</textarea></div>'
      + tuHtml
      + '</div>';
  }).join('');
}

// ── Deployer LLM ──────────────────────────────────────────────────────────────
function toggleLlm(id) {
  var llm = null;
  for (var k = 0; k < LLM_LIST.length; k++) { if (LLM_LIST[k].id === id) { llm = LLM_LIST[k]; break; } }
  if (!llm) return;
  var existing = -1;
  for (var m = 0; m < deployerLlmSelected.length; m++) { if (deployerLlmSelected[m].id === id) { existing = m; break; } }
  if (existing >= 0) {
    deployerLlmSelected.splice(existing, 1);
  } else {
    deployerLlmSelected.push({id: id, label: llm.l, vendor: llm.v, custom_name: '', purpose: '', target_users: []});
  }
  renderLlmGrid();
  renderLlmDetails();
}
function renderLlmGrid() {
  var g = document.getElementById('llmGrid'); if (!g) return;
  g.innerHTML = LLM_LIST.map(function(llm) {
    var sel = false;
    for (var k = 0; k < deployerLlmSelected.length; k++) { if (deployerLlmSelected[k].id === llm.id) { sel = true; break; } }
    return '<button type="button" class="llm-chip' + (sel ? ' sel' : '') + '" onclick="toggleLlm(\\'' + llm.id + '\\')">'
      + '<span class="llm-chip-name">' + llm.l + '</span>'
      + '<span class="llm-chip-vendor">' + llm.v + '</span>'
      + '</button>';
  }).join('');
}
function renderLlmDetails() {
  var c = document.getElementById('llmDetails'); if (!c) return;
  if (!deployerLlmSelected.length) { c.innerHTML = ''; return; }
  c.innerHTML = '<div style="margin-top:16px">'
    + deployerLlmSelected.map(function(l, i) {
      var nameField = l.id === 'other_llm'
        ? '<div class="field"><label>Nome strumento</label><input type="text" value="' + esc(l.custom_name) + '" placeholder="Nome dello strumento LLM..." oninput="deployerLlmSelected[' + i + '].custom_name=this.value"></div>'
          + '<div class="field"><label>Vendor / Fornitore</label><input type="text" value="' + esc(l.vendor) + '" placeholder="Es. Together AI, Cohere..." oninput="deployerLlmSelected[' + i + '].vendor=this.value"></div>'
        : '';
      var tuHtml = renderTargetChecks('llm', i, l.target_users);
      return '<div class="tool-card">'
        + '<div class="tc-head">'
        + '<span class="tc-label">' + l.label + (l.vendor ? ' <span style="font-weight:400;color:var(--dim)">&mdash; ' + l.vendor + '</span>' : '') + '</span>'
        + '<button class="btn-rm" onclick="toggleLlm(\\'' + l.id + '\\')">&#10005;</button>'
        + '</div>'
        + nameField
        + '<div class="field"><label>Finalit&agrave; d\\'uso *</label>'
        + '<textarea rows="2" placeholder="Come usi ' + l.label + ' nella tua organizzazione? Chi ne fa uso? Per quali processi?" oninput="deployerLlmSelected[' + i + '].purpose=this.value">' + esc(l.purpose) + '</textarea></div>'
        + tuHtml
        + '</div>';
    }).join('')
    + '</div>';
}

// ── Deployer Specialized ──────────────────────────────────────────────────────
function addDeployerSpecialized() {
  deployerSpecialized.push({subcategory: 'hr', tool_name: '', vendor: '', purpose: '', target_users: []});
  renderDeployerSpecialized();
}
function removeDeployerSpecialized(i) { deployerSpecialized.splice(i, 1); renderDeployerSpecialized(); }
function renderDeployerSpecialized() {
  var c = document.getElementById('depSpecList'); if (!c) return;
  if (!deployerSpecialized.length) {
    c.innerHTML = '<div class="empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="12" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M14 20h12M14 26h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>Nessun sistema specializzato aggiunto.</p></div>';
    return;
  }
  c.innerHTML = deployerSpecialized.map(function(s, i) {
    var catOpts = AI_CATS.map(function(cat) {
      return '<option value="' + cat.v + '"' + (s.subcategory === cat.v ? ' selected' : '') + '>' + cat.l + '</option>';
    }).join('');
    var tuHtml = renderTargetChecks('spec', i, s.target_users);
    return '<div class="tool-card">'
      + '<div class="tc-head">'
      + '<span class="tc-num">Sistema Specializzato #' + (i + 1) + '</span>'
      + '<button class="btn-rm" onclick="removeDeployerSpecialized(' + i + ')">&#10005; Rimuovi</button>'
      + '</div>'
      + '<div class="field-row">'
      + '<div class="field"><label>Sotto-categoria</label>'
      + '<select onchange="deployerSpecialized[' + i + '].subcategory=this.value">' + catOpts + '</select></div>'
      + '<div class="field"><label>Nome Sistema *</label>'
      + '<input type="text" value="' + esc(s.tool_name) + '" placeholder="Es. HireVue, Salesforce Einstein..." oninput="deployerSpecialized[' + i + '].tool_name=this.value"></div>'
      + '</div>'
      + '<div class="field"><label>Vendor / Fornitore</label>'
      + '<input type="text" value="' + esc(s.vendor) + '" placeholder="Es. HireVue Inc., Salesforce..." oninput="deployerSpecialized[' + i + '].vendor=this.value"></div>'
      + '<div class="field"><label>Finalit&agrave; d\\'uso *</label>'
      + '<textarea rows="2" placeholder="A cosa serve nella tua azienda? Chi lo usa? Quali decisioni supporta?" oninput="deployerSpecialized[' + i + '].purpose=this.value">' + esc(s.purpose) + '</textarea></div>'
      + tuHtml
      + '</div>';
  }).join('');
}

// ── Review ────────────────────────────────────────────────────────────────────
function renderReview() {
  var domains  = Array.from(document.querySelectorAll('.domain:checked')).map(function(el) { return el.value; });
  var dtypes   = Array.from(document.querySelectorAll('.dtype:checked')).map(function(el) { return el.value; });
  var hovEl    = document.querySelector('input[name=humanOversight]:checked');
  var hovLabel = {always: 'Sempre presente', sometimes: 'In alcuni casi', never: 'Mai (Full Automatic)', na: 'Non applicabile'};
  var dpoEl    = document.querySelector('input[name=dpoStatus]:checked');
  var dpoLabel = {inhouse: 'In-house', service: 'As a Service', none: 'Non presente'};

  var provCount = providerSystems.filter(function(s) { return s.tool_name.trim(); }).length;
  var llmCount  = deployerLlmSelected.length;
  var specCount = deployerSpecialized.filter(function(s) { return s.tool_name.trim(); }).length;
  var aiRole    = isProvider && isDeployer ? 'Provider + Deployer' : isProvider ? 'Provider' : isDeployer ? 'Deployer' : 'Non selezionato';

  var readiness = [
    ['Inventario AI', 'hasInventory'],
    ['Valutazione impatto (FRIA/DPIA)', 'hasImpact'],
    ['Gestione incidenti', 'hasIncident'],
    ['Policy AI interna', 'hasAiPolicy'],
    ['Formazione personale', 'hasTraining']
  ];

  var html = '<div class="rev-block"><h3>Profilo Azienda</h3>'
    + '<div class="rev-row"><span class="rk">Nome:</span><span class="rv">' + esc(fv('companyName')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Email:</span><span class="rv">' + esc(fv('contactEmail')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Settore:</span><span class="rv">' + esc(fv('companySector')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Dimensione:</span><span class="rv">' + esc(fv('companySize')) + ' dipendenti</span></div>'
    + '<div class="rev-row"><span class="rk">Sede Legale:</span><span class="rv">' + esc(fv('companySede')) + '</span></div>'
    + '</div>'
    + '<div class="rev-block"><h3>Ruolo & Sistemi AI</h3>'
    + '<div class="rev-row"><span class="rk">Ruolo AI Act:</span><span class="rv" style="color:var(--green)">' + aiRole + '</span></div>';

  if (isProvider && provCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">Sistemi Proprietari:</span><div>'
      + providerSystems.filter(function(s) { return s.tool_name.trim(); }).map(function(s) {
          return '<div class="rev-row" style="margin-bottom:4px"><span class="rv">' + esc(s.tool_name) + '</span></div>';
        }).join('')
      + '</div></div>';
  }
  if (isDeployer && llmCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">LLM Standard:</span><div class="tags">'
      + deployerLlmSelected.map(function(l) { return '<span class="tag">' + l.label + '</span>'; }).join('')
      + '</div></div>';
  }
  if (isDeployer && specCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">Sistemi Specializzati:</span><div>'
      + deployerSpecialized.filter(function(s) { return s.tool_name.trim(); }).map(function(s) {
          return '<div class="rev-row" style="margin-bottom:4px"><span class="rv">' + esc(s.tool_name) + '</span></div>';
        }).join('')
      + '</div></div>';
  }

  html += '</div>'
    + '<div class="rev-block"><h3>Decisioni & Dati</h3>'
    + '<div class="rev-row"><span class="rk">Decisioni su persone:</span><span class="rv" style="color:' + (document.getElementById('makesDec').checked ? 'var(--orange)' : 'var(--muted)') + '">' + (document.getElementById('makesDec').checked ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>'
    + '<div class="rev-row"><span class="rk">Supervisione umana:</span><span class="rv">' + (hovEl ? (hovLabel[hovEl.value] || hovEl.value) : 'Non selezionato') + '</span></div>'
    + '<div class="rev-row"><span class="rk">Soggetti vulnerabili:</span><span class="rv" style="color:' + (document.getElementById('vulnerable').checked ? 'var(--red)' : 'var(--muted)') + '">' + (document.getElementById('vulnerable').checked ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>'
    + (domains.length ? '<div class="rev-row" style="align-items:flex-start"><span class="rk">Ambiti:</span><div class="tags">' + domains.map(function(d) { return '<span class="tag">' + d + '</span>'; }).join('') + '</div></div>' : '')
    + '</div>'
    + '<div class="rev-block"><h3>AI Readiness</h3>'
    + '<div class="rev-row"><span class="rk">DPO:</span><span class="rv" style="color:' + (!dpoEl || dpoEl.value === 'none' ? '#F87171' : 'var(--green)') + '">' + (dpoEl ? (dpoLabel[dpoEl.value] || dpoEl.value) : 'Non selezionato') + '</span></div>'
    + readiness.map(function(r) {
        var el = document.getElementById(r[1]);
        var ok = el && el.checked;
        return '<div class="rev-row"><span class="rk">' + r[0] + ':</span><span class="rv" style="color:' + (ok ? 'var(--green)' : '#F87171') + '">' + (ok ? '&#10003; Presente' : '&#10007; Assente') + '</span></div>';
      }).join('')
    + '</div>';

  if (fv('contextNotes')) {
    html += '<div class="rev-block"><h3>Note Contestuali</h3>'
      + '<div class="rev-row"><span class="rv" style="font-size:12px;color:var(--muted);line-height:1.7">' + esc(fv('contextNotes').slice(0, 300)) + (fv('contextNotes').length > 300 ? '&hellip;' : '') + '</span></div>'
      + '</div>';
  }

  document.getElementById('reviewContent').innerHTML = html;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitForm() {
  document.getElementById('errorAlert').className = 'alert-err';
  document.getElementById('btnSubmit').disabled = true;

  var domains = Array.from(document.querySelectorAll('.domain:checked')).map(function(el) { return el.value; });
  var dtypes  = Array.from(document.querySelectorAll('.dtype:checked')).map(function(el) { return el.value; });
  var hovEl   = document.querySelector('input[name=humanOversight]:checked');
  var hovVal  = hovEl ? hovEl.value : 'na';
  var dpoEl   = document.querySelector('input[name=dpoStatus]:checked');
  var dpoVal  = dpoEl ? dpoEl.value : 'none';
  var aiRole  = isProvider && isDeployer ? 'both' : isProvider ? 'provider' : isDeployer ? 'deployer' : 'unknown';

  var aiTools = [];

  if (isProvider) {
    providerSystems.forEach(function(s) {
      if (s.tool_name.trim() && s.purpose.trim()) {
        aiTools.push({
          tool_name: s.tool_name,
          vendor: fv('companyName') || 'N/D',
          category: s.category,
          role: 'provider',
          purpose: s.purpose,
          target_users: s.target_users.length ? s.target_users : ['employees']
        });
      }
    });
  }

  if (isDeployer) {
    deployerLlmSelected.forEach(function(l) {
      var name = l.id === 'other_llm' ? (l.custom_name || 'LLM Non specificato') : l.label;
      aiTools.push({
        tool_name: name,
        vendor: l.vendor || 'N/D',
        category: 'llm',
        role: 'deployer',
        purpose: l.purpose || 'Uso generale',
        target_users: l.target_users.length ? l.target_users : ['employees']
      });
    });
    deployerSpecialized.forEach(function(s) {
      if (s.tool_name.trim() && s.purpose.trim()) {
        aiTools.push({
          tool_name: s.tool_name,
          vendor: s.vendor || 'N/D',
          category: s.subcategory,
          role: 'deployer',
          purpose: s.purpose,
          target_users: s.target_users.length ? s.target_users : ['employees']
        });
      }
    });
  }

  if (!aiTools.length) {
    aiTools = [{tool_name: 'Non specificato', vendor: 'N/D', category: 'other', role: 'deployer', purpose: 'Da definire', target_users: ['employees']}];
  }

  var payload = {
    contact_email: fv('contactEmail'),
    company: {
      name: fv('companyName'),
      sector: fv('companySector'),
      employees_range: fv('companySize'),
      country: fv('companySede'),
      sede_legale: fv('companySede')
    },
    ai_tools: aiTools,
    use_cases: [],
    decisions: {
      makes_automated_decisions: document.getElementById('makesDec').checked,
      human_oversight_level: hovVal,
      decision_domains: domains,
      data_types: dtypes,
      affects_vulnerable_groups: document.getElementById('vulnerable').checked
    },
    governance: {
      has_dpo: dpoVal !== 'none',
      dpo_status: dpoVal,
      has_ai_inventory: document.getElementById('hasInventory').checked,
      has_impact_assessment: document.getElementById('hasImpact').checked,
      has_human_oversight: hovVal !== 'never' && hovVal !== 'na',
      has_incident_procedure: document.getElementById('hasIncident').checked,
      has_ai_policy: document.getElementById('hasAiPolicy').checked,
      has_training: document.getElementById('hasTraining').checked
    },
    ai_role: aiRole,
    context_notes: fv('contextNotes')
  };

  document.getElementById('loading').className = 'show';
  startLoad();

  try {
    var res  = await fetch('/api/report/generate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    var data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Errore generazione');
    stopLoad();
    document.getElementById('loading').className = '';
    document.getElementById('app').style.display = 'none';
    document.getElementById('downloadBtn').href = data.download_url;
    var sc = document.getElementById('success');
    sc.style.display = 'flex';
    sc.style.flexDirection = 'column';
    sc.style.alignItems = 'center';
    sc.style.justifyContent = 'center';
    sc.style.minHeight = '100vh';
  } catch(err) {
    stopLoad();
    document.getElementById('loading').className = '';
    var ea = document.getElementById('errorAlert');
    ea.className = 'alert-err show';
    ea.textContent = String(err.message || 'Generazione non disponibile. Riprova tra qualche minuto.');
    document.getElementById('btnSubmit').disabled = false;
  }
}

// ── Loading ───────────────────────────────────────────────────────────────────
var LS = ['ls1', 'ls2', 'ls3', 'ls4'];
function startLoad() {
  loadStep = 0;
  LS.forEach(function(id) { document.getElementById(id).className = 'ld-step'; });
  document.getElementById('ls1').className = 'ld-step active';
  loadTimer = setInterval(function() {
    if (loadStep < LS.length - 1) {
      document.getElementById(LS[loadStep]).className = 'ld-step done';
      loadStep++;
      document.getElementById(LS[loadStep]).className = 'ld-step active';
    }
  }, 4500);
}
function stopLoad() { clearInterval(loadTimer); }

// ── Utils ─────────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
</script>
</body>
</html>`;
