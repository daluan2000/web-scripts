// ==UserScript==
// @name         Video Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  视频批量下载器 - 捕获页面视频并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow
// ==/UserScript==

function w(r,e={},t="",n=""){const o=document.createElement(r);for(const[s,i]of Object.entries(e))if(s==="className")o.className=i;else if(s==="dataset")for(const[a,c]of Object.entries(i))o.dataset[a]=c;else s.startsWith("on")?o.addEventListener(s.slice(2).toLowerCase(),i):o.setAttribute(s,i);return t?o.innerHTML=t:n&&(o.textContent=n),o}function te(r){const e=w("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const I={logLevel:"info",storagePrefix:"userscript_",videoDownloader:{storageKeys:{downloadHistory:"videoDownloader_download_history"}}};function J(r){return I.storagePrefix+r}const q={debug:0,info:1,warn:2,error:3};function M(r,e,...t){const n=q[I.logLevel];if(q[r]<n)return;const o=`[${r.toUpperCase()}]`,s=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${o} [${s}]`,e,...t);break;case"warn":console.warn(`${o} [${s}]`,e,...t);break;case"error":console.error(`${o} [${s}]`,e,...t);break}}const l={debug:(r,...e)=>M("debug",r,...e),info:(r,...e)=>M("info",r,...e),warn:(r,...e)=>M("warn",r,...e),error:(r,...e)=>M("error",r,...e)};async function V(r,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(J(r),n),t()})}async function ne(r,e=null){const t=await GM_getValue(J(r));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const re=`/* 视频批量下载器样式 */

#vd-floating-btn {
  position: fixed;
  bottom: 92px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5a4 0%, #f59e0b 100%);
  color: #ffffff;
  border: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(14, 165, 164, 0.38);
  z-index: 2147483647;
  transition: all 0.25s ease;
  touch-action: none;
}

#vd-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.4);
}

#vd-floating-btn.active {
  background: linear-gradient(135deg, #0f766e 0%, #ea580c 100%);
}

#vd-floating-btn.dragging {
  cursor: grabbing;
  transition: none;
}

#vd-floating-btn.dragging:hover {
  transform: none;
}

#vd-floating-btn svg {
  width: 20px;
  height: 20px;
}

.vd-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 620px;
  height: 460px;
  min-width: 320px;
  min-height: 220px;
  background: #fefefe;
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(3, 38, 55, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.vd-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #0f766e 0%, #0ea5a4 55%, #f59e0b 100%);
  color: #ffffff;
  cursor: move;
  user-select: none;
}

.vd-panel-title {
  font-size: 15px;
  font-weight: 700;
}

.vd-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vd-panel-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.vd-panel-note {
  padding: 8px 16px;
  font-size: 12px;
  color: #0c4a6e;
  background: linear-gradient(90deg, #fef9c3 0%, #ffedd5 100%);
  border-bottom: 1px solid #fed7aa;
}

.vd-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f4f8fa;
  border-bottom: 1px solid #d6e3ea;
  flex-wrap: wrap;
}

.vd-toolbar-spacer {
  flex: 1;
}

.vd-btn {
  padding: 8px 14px;
  border-radius: 7px;
  border: 1px solid #b9c8d0;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.vd-btn:hover:not(:disabled) {
  background: #eef6f8;
}

.vd-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.vd-btn-primary {
  background: #0ea5a4;
  color: #ffffff;
  border-color: #0f766e;
}

.vd-btn-primary:hover:not(:disabled) {
  background: #0f766e;
}

.vd-btn-success {
  background: #f59e0b;
  color: #ffffff;
  border-color: #d97706;
}

.vd-btn-success:hover:not(:disabled) {
  background: #ea580c;
}

.vd-btn-warning {
  background: #f97316;
  color: #ffffff;
  border-color: #ea580c;
}

.vd-btn-warning:hover:not(:disabled) {
  background: #ea580c;
}

.vd-prefix-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.vd-input {
  width: 100px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid #b8c5cf;
  outline: none;
  font-size: 13px;
}

.vd-input:focus {
  border-color: #0ea5a4;
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.18);
}

.vd-video-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  align-content: start;
  background: linear-gradient(180deg, #f7fafc 0%, #f1f5f9 100%);
}

.vd-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 42px 10px;
  color: #64748b;
  font-size: 14px;
}

.vd-video-item {
  position: relative;
  min-height: 185px;
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.vd-video-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(14, 116, 144, 0.2);
}

.vd-video-item.selected {
  box-shadow: 0 0 0 3px #0ea5a4;
}

.vd-video-thumb {
  position: relative;
  width: 100%;
  min-height: 110px;
  background: linear-gradient(135deg, #1f2937 0%, #0f172a 100%);
  overflow: hidden;
}

.vd-video-thumb video,
.vd-video-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vd-video-thumb-fallback::before {
  content: 'VIDEO';
  color: rgba(255, 255, 255, 0.88);
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 12px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.vd-play-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(15, 118, 110, 0.85);
  color: #ffffff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vd-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.vd-video-item:hover .vd-checkbox,
.vd-video-item.selected .vd-checkbox {
  opacity: 1;
}

.vd-video-item.selected .vd-checkbox {
  background: #0ea5a4;
}

.vd-video-item.selected .vd-checkbox svg rect {
  fill: #0ea5a4;
}

.vd-video-info {
  padding: 8px;
  min-height: 68px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.vd-filename {
  font-size: 12px;
  line-height: 1.35;
  color: #1e293b;
  word-break: break-all;
}

.vd-meta {
  font-size: 11px;
  color: #64748b;
}

.vd-badge {
  display: inline-flex;
  width: fit-content;
  font-size: 10px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 999px;
}

.vd-badge-hls {
  background: #cffafe;
  color: #115e59;
}

.vd-badge-unsupported {
  background: #fee2e2;
  color: #991b1b;
}

.vd-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #eff6f9;
  border-top: 1px solid #d6e3ea;
  position: relative;
}

.vd-status {
  font-size: 12px;
  color: #334155;
}

.vd-downloaded-count {
  font-size: 12px;
  color: #0f766e;
  margin-right: 20px;
  white-space: nowrap;
}

.vd-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  background: linear-gradient(
    135deg,
    transparent 50%,
    #9ca3af 50%,
    #9ca3af 60%,
    transparent 60%,
    transparent 70%,
    #9ca3af 70%,
    #9ca3af 80%,
    transparent 80%
  );
}

.vd-video-grid::-webkit-scrollbar {
  width: 8px;
}

.vd-video-grid::-webkit-scrollbar-track {
  background: #e5edf1;
  border-radius: 4px;
}

.vd-video-grid::-webkit-scrollbar-thumb {
  background: #9fb7c2;
  border-radius: 4px;
}

.vd-video-grid::-webkit-scrollbar-thumb:hover {
  background: #7f9aa7;
}

@media (max-width: 680px) {
  .vd-panel {
    width: 95%;
    height: 82%;
  }

  .vd-toolbar {
    padding: 8px 12px;
    gap: 6px;
  }

  .vd-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .vd-video-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}

@media (max-width: 520px) {
  .vd-panel {
    width: 100%;
    height: 100%;
    min-width: 100%;
    border-radius: 0;
  }

  .vd-video-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }

  .vd-prefix-label {
    width: 100%;
    margin-top: 4px;
  }

  .vd-input {
    flex: 1;
    width: auto;
  }
}
`;function K(r){const{target:e,handle:t=e,onClick:n,shouldStart:o,dragThreshold:s=4,clampToViewport:i=!0,dragClassName:a,bodyCursor:c="",removeTransformOnStart:h=!1,onDragStart:m,onDrag:d,onDragEnd:f}=r||{};if(!e||!t)return()=>{};let g=null,x=0,S=0,T=0,C=0,$=!1,N=!1;const U=u=>{if(n){if(N){u.preventDefault(),u.stopPropagation(),N=!1;return}n(u)}},E=u=>{if(u.pointerType==="mouse"&&u.button!==0||typeof o=="function"&&!o(u))return;const L=e.getBoundingClientRect();x=u.clientX,S=u.clientY,T=L.left,C=L.top,$=!1,g=u.pointerId,e.style.left=`${T}px`,e.style.top=`${C}px`,e.style.right="auto",e.style.bottom="auto",h&&(e.style.transform="none"),a&&e.classList.add(a),t.setPointerCapture(g),document.body.style.userSelect="none",c&&(document.body.style.cursor=c),typeof m=="function"&&m(u),u.preventDefault()},A=u=>{if(u.pointerId!==g)return;const L=u.clientX-x,p=u.clientY-S;if(!$&&Math.hypot(L,p)>=s&&($=!0,N=!0),!$)return;let y=T+L,F=C+p;if(i){const b=Math.max(0,window.innerWidth-e.offsetWidth),v=Math.max(0,window.innerHeight-e.offsetHeight);y=Math.max(0,Math.min(y,b)),F=Math.max(0,Math.min(F,v))}e.style.left=`${y}px`,e.style.top=`${F}px`,typeof d=="function"&&d(u)},k=u=>{u.pointerId===g&&(t.hasPointerCapture(g)&&t.releasePointerCapture(g),g=null,a&&e.classList.remove(a),document.body.style.userSelect="",c&&(document.body.style.cursor=""),typeof f=="function"&&f(u))};return t.addEventListener("click",U),t.addEventListener("pointerdown",E),t.addEventListener("pointermove",A),t.addEventListener("pointerup",k),t.addEventListener("pointercancel",k),()=>{t.removeEventListener("click",U),t.removeEventListener("pointerdown",E),t.removeEventListener("pointermove",A),t.removeEventListener("pointerup",k),t.removeEventListener("pointercancel",k)}}const oe=30,se=92;function G(r){if(!r)return;const e=r.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),n=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/n)))}function ie(r){if(!r)return;const e=Number(r.dataset.ratioX),t=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const n=Math.max(0,window.innerWidth-r.offsetWidth),o=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(n*e)}px`,r.style.top=`${Math.round(o*t)}px`,r.style.right="auto",r.style.bottom="auto"}function ae(r){const e=w("div",{id:"vd-floating-btn",title:"视频批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${oe}px`,e.style.bottom=`${se}px`,K({target:e,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{G(e)}}),requestAnimationFrame(()=>{G(e)}),window.addEventListener("resize",()=>{ie(e)})}function Z(){const r=document.getElementById("vd-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("vd-floating-btn");e&&e.classList.add("active")}function O(){const r=document.getElementById("vd-panel");r&&(r.style.display="none");const e=document.getElementById("vd-floating-btn");e&&e.classList.remove("active")}function de(){const r=document.getElementById("vd-panel");r&&(r.style.display==="none"||r.style.display===""?Z():O())}const _=[{name:"default",displayName:"通用视频源",priority:0,urlPattern:/.*/i,pagePattern:/.*/i,enhance(r){return r}}];function ce(r){const e=window.location.href;for(const t of _)if(t.pagePattern.test(e))return t;return null}function le(r){const e=ce();return e?e.name:null}function ue(r){const e=_.find(t=>t.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function fe(r){if(!r)return r;for(const e of _)if(e.urlPattern.test(r))return e.enhance(r);return r}class X{constructor(){this.videoExtensions=["mp4","webm","m4v","mov","mkv","avi","flv","ts","m3u8","mpd"]}getAllVideos(){const e=[],t=new Set;return this.captureFromVideoElements(e,t),this.captureFromLinks(e,t),this.captureFromDataAttrs(e,t),e.filter(n=>this.isLikelyVideoUrl(n.src))}captureFromVideoElements(e,t){document.querySelectorAll("video").forEach(o=>{const s=[];o.currentSrc&&s.push(o.currentSrc),o.src&&s.push(o.src),o.querySelectorAll("source").forEach(a=>{a.src&&s.push(a.src),a.getAttribute("src")&&s.push(a.getAttribute("src"))}),this.captureFromCandidates(s,{poster:o.poster||"",duration:Number.isFinite(o.duration)?Math.round(o.duration):0,width:o.videoWidth||o.clientWidth||0,height:o.videoHeight||o.clientHeight||0,title:o.getAttribute("title")||document.title||""},e,t)})}captureFromLinks(e,t){document.querySelectorAll("a[href]").forEach(o=>{var i;const s=o.getAttribute("href");this.captureFromCandidates([s],{poster:"",duration:0,width:0,height:0,title:((i=o.textContent)==null?void 0:i.trim())||o.getAttribute("title")||document.title||""},e,t)})}captureFromDataAttrs(e,t){const n=["[data-video-url]","[data-video]","[data-src]","[data-play-url]","[data-playurl]","[data-m3u8]","[data-stream-url]"];document.querySelectorAll(n.join(",")).forEach(s=>{const i=[s.getAttribute("data-video-url"),s.getAttribute("data-video"),s.getAttribute("data-src"),s.getAttribute("data-play-url"),s.getAttribute("data-playurl"),s.getAttribute("data-m3u8"),s.getAttribute("data-stream-url")];this.captureFromCandidates(i,{poster:s.getAttribute("poster")||"",duration:0,width:0,height:0,title:s.getAttribute("title")||document.title||""},e,t)})}captureFromCandidates(e,t,n,o){e.map(s=>this.normalizeUrl(s)).filter(Boolean).forEach(s=>{if(o.has(s))return;o.add(s);const i=fe(s),a=this.detectMediaType(i),c=a!=="blob"&&a!=="dash";n.push({src:i,type:a,mimeType:this.guessMimeType(i),duration:t.duration||0,width:t.width||0,height:t.height||0,poster:t.poster||"",title:t.title||"",supported:c,unsupportedReason:c?"":this.getUnsupportedReason(a)})})}normalizeUrl(e){if(!e||typeof e!="string")return null;const t=e.trim();if(!t||t.startsWith("data:"))return null;if(t.startsWith("blob:"))return t;if(t.startsWith("//"))return`${window.location.protocol}${t}`;try{return new URL(t,window.location.href).href.split("#")[0]}catch{return null}}isLikelyVideoUrl(e){if(!e)return!1;const t=e.toLowerCase();if(t.startsWith("blob:"))return!0;const n=this.extractExtension(t);return!!(n&&this.videoExtensions.includes(n)||t.includes(".m3u8")||t.includes(".mpd")||t.includes("video")||t.includes("stream")||t.includes("playurl"))}detectMediaType(e){const t=(e||"").toLowerCase();if(t.startsWith("blob:"))return"blob";if(t.includes(".m3u8"))return"m3u8";if(t.includes(".mpd"))return"dash";const n=this.extractExtension(t);return n?n==="m3u8"?"m3u8":n==="mpd"?"dash":n:"video"}extractExtension(e){const n=(e||"").split("?")[0].split(".");if(n.length<2)return"";const o=n[n.length-1].trim();return o.length>6?"":o}guessMimeType(e){const t=this.extractExtension((e||"").toLowerCase());return{mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/x-m4v",m3u8:"application/vnd.apple.mpegurl",ts:"video/mp2t",mkv:"video/x-matroska",avi:"video/x-msvideo",flv:"video/x-flv",mpd:"application/dash+xml"}[t]||"video/mp4"}getUnsupportedReason(e){return e==="blob"?"blob 资源无法直接提取源地址":e==="dash"?"dash/mpd 暂不支持":"当前资源暂不支持"}}class pe{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,n)=>{const o=this.createResourceItem(t,n);this.grid.appendChild(o)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);t&&(this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources()))}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>this.selected.add(t)),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).map(e=>this.resources[e])}createResourceItem(e,t){const n=w("div",{className:this.classNames.item,dataset:{index:t}}),o={toggle:()=>this.toggle(t),createElement:w,updateResource:c=>{!c||typeof c!="object"||(this.resources[t]={...this.resources[t],...c})}},s=this.createThumbnail(e,t,o);s&&n.appendChild(s);const i=w("div",{className:this.classNames.checkbox,onClick:c=>{c.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),a=this.createInfo(e,t,o);return n.appendChild(i),a&&n.appendChild(a),n}defaultCreateThumbnail(e,t,n){const o=w("div",{className:this.classNames.thumb}),s=w("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return o.appendChild(s),o.addEventListener("click",()=>n.toggle()),o}defaultCreateInfo(e){const t=w("div",{className:this.classNames.info}),n=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(w("span",{},this.truncate(n,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const n=parseInt(t.dataset.index||"-1",10);this.selected.has(n)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var o;if(!e)return"未命名";const t=String(e).split("/"),n=((o=t[t.length-1])==null?void 0:o.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function he(r){var n;if(!r)return"未命名";const e=String(r).split("/"),t=((n=e[e.length-1])==null?void 0:n.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function me(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}function ge(r){const e=Number(r||0);if(!e||!Number.isFinite(e))return"--:--";const t=Math.floor(e/3600),n=Math.floor(e%3600/60),o=Math.floor(e%60);return t>0?`${String(t).padStart(2,"0")}:${String(n).padStart(2,"0")}:${String(o).padStart(2,"0")}`:`${String(n).padStart(2,"0")}:${String(o).padStart(2,"0")}`}function be(r){return r?r==="m3u8"?"HLS":r==="dash"?"DASH":r==="blob"?"BLOB":String(r).toUpperCase():"video"}class ve extends pe{constructor(e){super({...e,emptyText:"未找到视频资源",classNames:{item:"vd-video-item",selected:"selected",empty:"vd-empty",thumb:"vd-video-thumb",checkbox:"vd-checkbox",info:"vd-video-info"},createThumbnail:(t,n,o)=>{const s=o.createElement("div",{className:"vd-video-thumb"});if(t.poster){const a=o.createElement("img",{src:t.poster,alt:t.title||`视频 ${n+1}`,loading:"lazy",onerror:()=>{s.classList.add("vd-video-thumb-fallback")}});s.appendChild(a)}else if(t.type!=="m3u8"&&t.type!=="dash"&&t.type!=="blob"){const a=o.createElement("video",{src:t.src,preload:"metadata",muted:"muted",playsinline:"playsinline"});a.onloadedmetadata=()=>{const c=Number.isFinite(a.duration)?Math.round(a.duration):0;o.updateResource({duration:c,width:a.videoWidth||t.width||0,height:a.videoHeight||t.height||0})},a.onerror=()=>{s.classList.add("vd-video-thumb-fallback"),a.remove()},s.appendChild(a)}else s.classList.add("vd-video-thumb-fallback");const i=o.createElement("span",{className:"vd-play-badge"},"▶");return s.appendChild(i),s.addEventListener("click",()=>{o.toggle()}),s},createInfo:(t,n,o)=>{const s=o.createElement("div",{className:"vd-video-info"}),i=he(t.src),a=`${be(t.type)}  ·  ${ge(t.duration)}`;return s.appendChild(o.createElement("span",{className:"vd-filename",title:t.src},me(i,26))),s.appendChild(o.createElement("span",{className:"vd-meta"},a)),t.supported?t.type==="m3u8"&&s.appendChild(o.createElement("span",{className:"vd-badge vd-badge-hls"},"m3u8")):s.appendChild(o.createElement("span",{className:"vd-badge vd-badge-unsupported"},"暂不支持")),s}})}getSelectedVideos(){return this.getSelectedResources()}}async function R(r,e={}){const{method:t="GET",headers:n={},body:o=null,dataType:s="json",responseType:i="",timeout:a=3e4}=e;return new Promise((c,h)=>{const m={method:t,url:r,headers:n,timeout:a,responseType:i,onload:d=>{if(d.status>=200&&d.status<300)try{let f;i==="blob"||i==="arraybuffer"?f=d.response:s==="text"?f=d.responseText:s==="json"?f=JSON.parse(d.responseText):f=d.responseText,c({data:f,status:d.status,headers:d.responseHeaders})}catch{c({data:d.responseText,status:d.status})}else h(new Error(`请求失败: ${d.status}`))},onerror:()=>h(new Error("网络请求失败")),ontimeout:()=>h(new Error("请求超时"))};o&&(m.data=typeof o=="string"?o:JSON.stringify(o),!m.headers["Content-Type"]&&!m.headers["content-type"]&&(m.headers["Content-Type"]="application/json")),GM_xmlhttpRequest(m)})}const ye=[{name:"unpkg",ffmpeg:"https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js",classWorker:"https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js",coreJs:"https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",coreWasm:"https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm"},{name:"jsdelivr",ffmpeg:"https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js",classWorker:"https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js",coreJs:"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",coreWasm:"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm"}];let B=null;function we(){return globalThis.unsafeWindow||window}function xe(r){const e=r.FFmpegWASM||r.FFmpeg||window.FFmpegWASM||window.FFmpeg;return{FFmpegClass:(e==null?void 0:e.FFmpeg)||null}}function D(r){return ye.map(e=>e[r]).filter(Boolean)}function z(r){return r?Object.prototype.toString.call(r)==="[object ArrayBuffer]"?r:ArrayBuffer.isView(r)?r.buffer.slice(r.byteOffset,r.byteOffset+r.byteLength):r.buffer&&Object.prototype.toString.call(r.buffer)==="[object ArrayBuffer]"?r.buffer:null:null}function Ee(r){return!r||typeof r!="object"?!1:Object.prototype.toString.call(r)==="[object Blob]"?!0:typeof r.arrayBuffer=="function"&&typeof r.size=="number"}async function ke(r,e="runtime"){const t=Array.isArray(r)?r:[r],n=[];for(const o of t){try{const s=await R(o,{method:"GET",responseType:"arraybuffer",timeout:12e4}),i=z(s.data);if(i)return{arrayBuffer:i,sourceUrl:o,transport:"GM_xmlhttpRequest"};n.push(`[GM] ${o} -> 返回数据不是二进制`)}catch(s){n.push(`[GM] ${o} -> ${(s==null?void 0:s.message)||"未知错误"}`)}try{const s=await fetch(o);if(!s.ok)throw new Error(`HTTP ${s.status}`);return{arrayBuffer:await s.arrayBuffer(),sourceUrl:o,transport:"fetch"}}catch(s){n.push(`[fetch] ${o} -> ${(s==null?void 0:s.message)||"未知错误"}`)}}throw new Error(`运行时资源下载失败(${e}): ${n.join(" | ")}`)}async function W(r,e,t){const{arrayBuffer:n,sourceUrl:o,transport:s}=await ke(r,t);l.info("FFmpeg 运行时资源已加载",{label:t,sourceUrl:o,transport:s});const i=new Blob([n],{type:e});return URL.createObjectURL(i)}function Se(r){return new Promise((e,t)=>{const n=document.querySelector(`script[data-video-downloader-src="${r}"]`);if(n){if(n.dataset.loaded==="true"){e();return}n.addEventListener("load",()=>e(),{once:!0}),n.addEventListener("error",()=>t(new Error(`脚本加载失败: ${r}`)),{once:!0});return}const o=document.createElement("script");o.src=r,o.async=!0,o.dataset.videoDownloaderSrc=r,o.onload=()=>{o.dataset.loaded="true",e()},o.onerror=()=>{t(new Error(`脚本加载失败: ${r}`))},document.head.appendChild(o)})}async function Ce(){if(B)return B;B=(async()=>{const r=we(),e=D("ffmpeg"),t=D("classWorker"),n=D("coreJs"),o=D("coreWasm");let s=!1;for(const d of e)try{await Se(d),s=!0,l.info("FFmpeg 脚本加载成功",{sourceUrl:d});break}catch{l.warn(`FFmpeg 脚本加载失败，尝试下一个源: ${d}`)}if(!s)throw new Error(`FFmpeg 脚本加载失败: ${e.join(" | ")}`);const i=xe(r);if(!i.FFmpegClass)throw new Error("FFmpeg 运行时初始化失败：未找到 FFmpeg 导出对象");const a=new i.FFmpegClass,c=await W(t,"text/javascript","classWorker"),h=await W(n,"text/javascript","coreJs"),m=await W(o,"application/wasm","coreWasm");try{await a.load({classWorkerURL:c,coreURL:h,wasmURL:m,workerURL:c})}finally{URL.revokeObjectURL(c),URL.revokeObjectURL(h),URL.revokeObjectURL(m)}return l.info("FFmpeg 运行时加载完成"),{ffmpeg:a}})();try{return await B}catch(r){throw B=null,r}}class Le{constructor(e){this.prefix=e.prefix||"",this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.onItemError=e.onItemError||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){l.warn("下载进行中，请稍候");return}this.downloadQueue=(e||[]).map((t,n)=>({...t,index:n,filename:this.generateFilename(t,n)})),this.successCount=0,this.failedCount=0,this.successUrls=[],this.isDownloading=!0,l.info("开始批量下载视频",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,l.info("视频下载完成",{success:this.successCount,failed:this.failedCount}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length+1;this.onProgress(t,n);try{await this.downloadItem(e),this.successCount+=1,this.successUrls.push(e.src)}catch(o){this.failedCount+=1,this.onItemError(e,o),l.error(`视频下载失败: ${e.src}`,o)}this.processQueue()}async downloadItem(e){if(!(e!=null&&e.src))throw new Error("无效的视频地址");if(!e.supported)throw new Error(e.unsupportedReason||"该资源暂不支持下载");if(e.type==="m3u8"){await this.downloadM3u8(e);return}if(e.type==="dash")throw new Error("dash/mpd 暂不支持");if(e.src.startsWith("blob:"))throw new Error("blob 资源无法直接提取源地址");const t=await this.fetchBlob(e.src);this.triggerBlobDownload(t,e.filename)}async downloadM3u8(e){const t=await this.resolveM3u8Playlist(e.src),n=this.parseSegments(t.content,t.url);if(n.length===0)throw new Error("未解析到 m3u8 分片");const o=[];for(let h=0;h<n.length;h++){const m=n[h],d=await this.fetchArrayBuffer(m);o.push(new Uint8Array(d))}const s=this.mergeUint8Arrays(o),i=new Blob([s],{type:"video/mp2t"});l.info("m3u8 分片合并完成，开始转 mp4",{segmentCount:n.length});const a=await this.transmuxTsToMp4(i),c=this.replaceExtension(e.filename,"mp4");this.triggerBlobDownload(a,c)}async transmuxTsToMp4(e){const t=await Ce(),{ffmpeg:n}=t,o="video_downloader_input.ts",s="video_downloader_output.mp4";await n.writeFile(o,new Uint8Array(await e.arrayBuffer()));try{await n.exec(["-i",o,"-c","copy","-bsf:a","aac_adtstoasc","-movflags","+faststart",s])}catch{l.warn("无损转封装失败，尝试音频转码后输出 mp4"),await n.exec(["-i",o,"-c:v","copy","-c:a","aac","-movflags","+faststart",s])}const i=await n.readFile(s),a=i instanceof Uint8Array?i:new Uint8Array(i);if(!a.length)throw new Error("m3u8 转 mp4 失败，未生成有效文件");return new Blob([a],{type:"video/mp4"})}async resolveM3u8Playlist(e,t=0){if(t>3)throw new Error("m3u8 变体层级过深，停止解析");const n=await this.fetchText(e),o=this.pickBestVariant(n,e);return o?this.resolveM3u8Playlist(o,t+1):{url:e,content:n}}pickBestVariant(e,t){const n=String(e||"").split(/\r?\n/),o=[];for(let s=0;s<n.length;s++){const i=n[s].trim();if(!i.startsWith("#EXT-X-STREAM-INF"))continue;const a=this.findNextUriLine(n,s+1);if(!a)continue;const c=i.match(/BANDWIDTH=(\d+)/i),h=c?Number(c[1]):0;o.push({url:this.resolveUrl(a,t),bandwidth:h})}return o.length===0?null:(o.sort((s,i)=>i.bandwidth-s.bandwidth),o[0].url)}parseSegments(e,t){const n=String(e||"").split(/\r?\n/),o=[];for(const s of n){const i=s.trim();!i||i.startsWith("#")||o.push(this.resolveUrl(i,t))}return o}findNextUriLine(e,t){for(let n=t;n<e.length;n++){const o=String(e[n]||"").trim();if(!(!o||o.startsWith("#")))return o}return""}resolveUrl(e,t){try{return new URL(e,t).href}catch{return e}}async fetchText(e){try{const t=await R(e,{method:"GET",dataType:"text",timeout:6e4});if(typeof t.data=="string")return t.data;throw new Error("返回数据不是文本")}catch{const n=await fetch(e);if(!n.ok)throw new Error(`请求 m3u8 失败: HTTP ${n.status}`);return n.text()}}async fetchBlob(e){try{const t=await R(e,{method:"GET",responseType:"blob",timeout:12e4});if(Ee(t.data))return t.data;const n=z(t.data);if(n)return new Blob([n]);throw new Error("返回数据不是 Blob")}catch{l.warn(`GM 请求获取视频失败，回退 fetch: ${e}`);const n=await fetch(e);if(!n.ok)throw new Error(`下载失败: HTTP ${n.status}`);return n.blob()}}async fetchArrayBuffer(e){try{const t=await R(e,{method:"GET",responseType:"arraybuffer",timeout:12e4}),n=z(t.data);if(n)return n;throw new Error("返回数据不是 ArrayBuffer")}catch{const n=await fetch(e);if(!n.ok)throw new Error(`分片下载失败: HTTP ${n.status}`);return n.arrayBuffer()}}mergeUint8Arrays(e){const t=e.reduce((s,i)=>s+i.length,0),n=new Uint8Array(t);let o=0;return e.forEach(s=>{n.set(s,o),o+=s.length}),n}triggerBlobDownload(e,t){const n=URL.createObjectURL(e);this.triggerDownload(n,t),setTimeout(()=>{URL.revokeObjectURL(n)},1e3)}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}generateFilename(e,t){const n=this.detectExtension(e),o=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${o}.${n}`}detectExtension(e){if((e==null?void 0:e.type)==="m3u8")return"mp4";if((e==null?void 0:e.type)==="dash")return"mpd";const t=this.getExtensionFromUrl((e==null?void 0:e.src)||"");return t||{"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov","video/x-matroska":"mkv","video/x-msvideo":"avi","video/x-flv":"flv","video/mp2t":"ts","application/vnd.apple.mpegurl":"mp4"}[e==null?void 0:e.mimeType]||"mp4"}getExtensionFromUrl(e){const n=String(e||"").split("?")[0].split(".");if(n.length<2)return"";const o=n[n.length-1].toLowerCase();return["mp4","webm","mov","m4v","mkv","avi","flv","ts"].includes(o)?o:""}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"")||"mp4",o=(e||"download").split("?")[0],s=o.lastIndexOf(".");return s<=0?`${o}.${n}`:`${o.slice(0,s)}.${n}`}}function Te(){const r=document.getElementById("vd-panel");if(r)return r;const e=w("div",{id:"vd-panel",className:"vd-panel"});return e.innerHTML=`
    <div class="vd-panel-header">
      <span class="vd-panel-title">🎬 视频批量下载器</span>
      <button class="vd-panel-close" id="vd-close-btn" title="关闭">×</button>
    </div>
    <div class="vd-panel-note">支持直链视频与 m3u8 基础下载，blob / dash / drm 暂不支持</div>
    <div class="vd-toolbar">
      <button class="vd-btn vd-btn-primary" id="vd-capture" title="快捷键: Ctrl+Shift+V">
        <span>🎯</span> 捕获视频
      </button>
      <button class="vd-btn" id="vd-select-all">全选</button>
      <button class="vd-btn" id="vd-select-none">全不选</button>
      <button class="vd-btn vd-btn-success" id="vd-download" disabled>下载选中</button>
      <button class="vd-btn vd-btn-warning" id="vd-clear-storage">清除存储</button>
      <div class="vd-toolbar-spacer"></div>
      <label class="vd-prefix-label">
        文件前缀:
        <input type="text" id="vd-prefix" class="vd-input" placeholder="如: video" />
      </label>
    </div>
    <div class="vd-video-grid"></div>
    <div class="vd-panel-footer">
      <span class="vd-status">点击「捕获视频」开始</span>
      <span class="vd-downloaded-count" id="vd-downloaded-count">历史下载数: 0</span>
      <div class="vd-resize-handle"></div>
    </div>
  `,document.body.appendChild(e),$e(e),Ae(e),e.querySelector("#vd-close-btn").addEventListener("click",()=>{O()}),e}function $e(r){const e=r.querySelector(".vd-panel-header");K({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".vd-panel-close")})}function Ae(r){const e=r.querySelector(".vd-resize-handle");let t=!1,n=0,o=0,s=0,i=0;e.addEventListener("mousedown",a=>{a.preventDefault(),a.stopPropagation(),t=!0,n=a.clientX,o=a.clientY,s=r.offsetWidth,i=r.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize"}),document.addEventListener("mousemove",a=>{if(!t)return;const c=a.clientX-n,h=a.clientY-o,m=Math.max(320,s+c),d=Math.max(220,i+h);r.style.width=`${m}px`,r.style.height=`${d}px`}),document.addEventListener("mouseup",()=>{t&&(t=!1,document.body.style.userSelect="",document.body.style.cursor="")})}te(re);const Fe="v";var Y,Q;const P=(Q=(Y=I.videoDownloader)==null?void 0:Y.storageKeys)==null?void 0:Q.downloadHistory;(function(){if(window.__videoDownloaderInitialized)return;window.__videoDownloaderInitialized=!0;let r=[],e=[];const t=[];let n=!0;function o(d){d&&(d.textContent=`历史下载数: ${t.length}`)}function s(d){return d&&typeof d=="object"&&typeof d.url=="string"&&d.url?{url:d.url,downloadedAt:typeof d.downloadedAt=="string"?d.downloadedAt:null}:null}async function i(d){try{const f=await ne(P,[]);Array.isArray(f)&&f.forEach(g=>{const x=s(g);x&&t.push(x)}),o(d),l.info("已加载视频下载历史",{count:t.length})}catch(f){l.error("读取视频下载历史失败",f),o(d)}}async function a(){try{await V(P,t),l.debug("视频下载历史已保存",{count:t.length})}catch(d){l.error("保存视频下载历史失败",d)}}function c(d,f){document.addEventListener("keydown",g=>{const x=String(g.key||"").toLowerCase();if(g.ctrlKey&&g.shiftKey&&x===Fe){if(g.preventDefault(),!n)return;n=!1;const S=document.getElementById("vd-panel");(!S||S.style.display==="none"||S.style.display==="")&&Z(),r=new X().getAllVideos(),d.render(r),f&&(f.textContent=`已捕获 ${r.length} 个视频资源`),setTimeout(()=>{n=!0},500)}})}async function h(){l.info("videoDownloader 初始化开始",{logLevel:I.logLevel});const d=Te(),f=le(),g=d.querySelector(".vd-panel-note");if(f&&g){const p=ue(f);g.textContent=`支持直链视频与 m3u8 基础下载，当前来源策略：${p}`}ae({onToggle:de}),O();const x=d.querySelector(".vd-video-grid"),S=d.querySelector("#vd-select-all"),T=d.querySelector("#vd-select-none"),C=d.querySelector("#vd-download"),$=d.querySelector("#vd-clear-storage"),N=d.querySelector("#vd-capture"),U=d.querySelector("#vd-prefix"),E=d.querySelector(".vd-status"),A=d.querySelector("#vd-downloaded-count");await i(A);const k=new ve({grid:x,onSelectionChange:p=>{e=p,u()}});c(k,E),N.addEventListener("click",()=>{l.info("开始手动捕获视频"),r=new X().getAllVideos(),k.render(r),E.textContent=`已捕获 ${r.length} 个视频资源`,l.info("手动捕获完成",{count:r.length})}),S.addEventListener("click",()=>{k.selectAll()}),T.addEventListener("click",()=>{k.selectNone()}),$.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){t.length=0;try{await V(P,[]),o(A),E.textContent="存储已清除",l.info("视频脚本存储已清除")}catch(y){E.textContent="清除存储失败",l.error("清除视频脚本存储失败",y)}}}),C.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的视频");return}const p=[...e],y=U.value||L();l.info("开始下载选中视频",{count:p.length,prefix:y}),new Le({prefix:y,onProgress:(b,v)=>{E.textContent=`下载中: ${b}/${v}`},onItemError:(b,v)=>{l.warn("单个视频下载失败",{url:b==null?void 0:b.src,reason:(v==null?void 0:v.message)||"未知错误"})},onComplete:async(b,v,j=[])=>{if(E.textContent=`完成: 成功 ${b}, 失败 ${v}`,j.length>0){const ee=new Date().toISOString();j.forEach(H=>{typeof H=="string"&&H&&t.push({url:H,downloadedAt:ee})}),o(A),await a()}l.info("视频下载流程完成",{success:b,failed:v,historyAdded:j.length,historyTotal:t.length})}}).download(p)});function u(){const p=e.length;C.disabled=p===0,C.textContent=p===0?"下载选中":`下载选中 (${p})`}function L(){const p=new Date,y=String(p.getMonth()+1).padStart(2,"0"),F=String(p.getDate()).padStart(2,"0"),b=String(p.getHours()).padStart(2,"0"),v=String(p.getMinutes()).padStart(2,"0");return`${y}${F}${b}${v}`}u(),l.info("videoDownloader 初始化完成",{downloadedCount:t.length})}function m(){h().catch(d=>{l.error("videoDownloader 初始化失败",d)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m()})();
