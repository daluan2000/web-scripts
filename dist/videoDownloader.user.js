// ==UserScript==
// @name         Video Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  视频批量下载器 - 前端采集关键信息，后端执行下载
// @match        https://*/*
// @match        http://*/*
// @connect      *
// @connect      127.0.0.1
// @connect      localhost
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow
// ==/UserScript==

function H(r,e={},t="",s=""){const a=document.createElement(r);for(const[d,p]of Object.entries(e))if(d==="className")a.className=p;else if(d==="dataset")for(const[u,h]of Object.entries(p))a.dataset[u]=h;else d.startsWith("on")?a.addEventListener(d.slice(2).toLowerCase(),p):a.setAttribute(d,p);return t?a.innerHTML=t:s&&(a.textContent=s),a}function Xe(r){const e=H("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const _={logLevel:"info",storagePrefix:"userscript_",videoDownloader:{storageKeys:{downloadHistory:"videoDownloader_download_history"},backend:{baseUrl:"http://127.0.0.1:8787",wsUrl:"",requestTimeout:2e4,pollingInterval:2500}}};function Ke(r){return _.storagePrefix+r}const Te={debug:0,info:1,warn:2,error:3};function se(r,e,...t){const s=Te[_.logLevel];if(Te[r]<s)return;const a=`[${r.toUpperCase()}]`,d=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${a} [${d}]`,e,...t);break;case"warn":console.warn(`${a} [${d}]`,e,...t);break;case"error":console.error(`${a} [${d}]`,e,...t);break}}const g={debug:(r,...e)=>se("debug",r,...e),info:(r,...e)=>se("info",r,...e),warn:(r,...e)=>se("warn",r,...e),error:(r,...e)=>se("error",r,...e)};async function Ne(r,e){return new Promise(t=>{const s=JSON.stringify(e);GM_setValue(Ke(r),s),t()})}async function re(r,e={}){const{method:t="GET",headers:s={},body:a=null,dataType:d="json",responseType:p="",timeout:u=3e4}=e;return new Promise((h,b)=>{const y={method:t,url:r,headers:s,timeout:u,responseType:p,onload:f=>{if(f.status>=200&&f.status<300)try{let w;p==="blob"||p==="arraybuffer"?w=f.response:d==="text"?w=f.responseText:d==="json"?w=JSON.parse(f.responseText):w=f.responseText,h({data:w,status:f.status,headers:f.responseHeaders})}catch{h({data:f.responseText,status:f.status})}else{let w="";const m=String(f.responseText||"").trim();if(m)try{const D=JSON.parse(m);w=String((D==null?void 0:D.detail)||m)}catch{w=m}const $=w?`请求失败: ${f.status} - ${w}`:`请求失败: ${f.status}`;b(new Error($))}},onerror:()=>b(new Error("网络请求失败")),ontimeout:()=>b(new Error("请求超时"))};a&&(y.data=typeof a=="string"?a:JSON.stringify(a),!y.headers["Content-Type"]&&!y.headers["content-type"]&&(y.headers["Content-Type"]="application/json")),GM_xmlhttpRequest(y)})}function ce(r){const e="http://127.0.0.1:8787",t=String(r||"").trim()||e;try{const s=new URL(t);return s.pathname="",s.search="",s.hash="",s.toString().replace(/\/$/,"")}catch{return e}}function Le(r,e=""){if(e&&String(e).trim())return String(e).trim().replace(/\/$/,"");const t=ce(r);return t.startsWith("https://")?t.replace("https://","wss://"):t.replace("http://","ws://")}class Ge{constructor(e={}){this.baseUrl=ce(e.baseUrl),this.wsUrl=Le(this.baseUrl,e.wsUrl),this.timeout=e.timeout||2e4}setBaseUrl(e,t=""){this.baseUrl=ce(e),this.wsUrl=Le(this.baseUrl,t)}getBaseUrl(){return this.baseUrl}getWsUrl(){return this.wsUrl}async createTask(e){return(await re(this.buildUrl("/api/video/tasks"),{method:"POST",body:e,timeout:this.timeout,dataType:"json"})).data}async getTask(e){return(await re(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}`),{method:"GET",timeout:this.timeout,dataType:"json"})).data}async listTasks(){var t;return((t=(await re(this.buildUrl("/api/video/tasks"),{method:"GET",timeout:this.timeout,dataType:"json"})).data)==null?void 0:t.tasks)||[]}async cancelTask(e){return(await re(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}/cancel`),{method:"POST",timeout:this.timeout,dataType:"json"})).data}async openDirectory({taskId:e="",path:t=""}={}){return(await re(this.buildUrl("/api/video/tasks/open-dir"),{method:"POST",body:{taskId:e,path:t},timeout:this.timeout,dataType:"json"})).data}connectTaskStream({taskId:e="",onOpen:t,onMessage:s,onClose:a,onError:d}){const u=`${this.getWsUrl()}/api/video/tasks/ws`,h=e?`?taskId=${encodeURIComponent(e)}`:"",b=`${u}${h}`;g.info("连接后端任务 WebSocket",{wsUrl:b});const y=new WebSocket(b);return y.onopen=()=>{t==null||t()},y.onmessage=f=>{try{const w=JSON.parse(f.data);s==null||s(w)}catch(w){g.warn("WebSocket 消息解析失败",w)}},y.onerror=f=>{d==null||d(f)},y.onclose=f=>{a==null||a(f)},{close(){try{y.close()}catch(f){g.warn("关闭 WebSocket 失败",f)}}}}buildUrl(e){return`${this.baseUrl}${e}`}}const Je=`/* 视频批量下载器样式 */

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
  width: 600px;
  height: 450px;
  min-width: 300px;
  min-height: 200px;
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

.vd-backend-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #d8e4eb;
  background: #eef6fb;
}

.vd-backend-status {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.vd-backend-status.connected {
  color: #047857;
}

.vd-backend-status.disconnected {
  color: #b45309;
}

.vd-backend-status.polling {
  color: #0369a1;
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

.vd-btn-ghost {
  background: #ffffff;
  color: #0f766e;
  border-color: #99b9c6;
}

.vd-btn-ghost:hover:not(:disabled) {
  background: #eff8f9;
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

.vd-input-wide {
  width: 180px;
}

.vd-input:focus {
  border-color: #0ea5a4;
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.18);
}

.vd-video-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  align-content: start;
  background: linear-gradient(180deg, #f7fafc 0%, #f1f5f9 100%);
}

.vd-task-panel {
  display: flex;
  flex-direction: column;
  min-height: 96px;
  max-height: 45%;
  min-width: 0;
  flex-shrink: 0;
  border-top: 1px solid #d6e3ea;
  background: #f8fbfd;
}

.vd-task-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  border-bottom: 1px solid #d6e3ea;
}

.vd-task-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.vd-task-empty {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  padding: 12px;
}

.vd-task-item {
  border: 1px solid #d7e2ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
  display: grid;
  gap: 6px;
}

.vd-task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.vd-task-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.vd-task-id {
  font-size: 11px;
  color: #475569;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-task-status {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.vd-task-status.queued {
  color: #0f172a;
  background: #e2e8f0;
}

.vd-task-status.running {
  color: #075985;
  background: #dbeafe;
}

.vd-task-status.success {
  color: #166534;
  background: #dcfce7;
}

.vd-task-status.failed {
  color: #991b1b;
  background: #fee2e2;
}

.vd-task-status.cancelled {
  color: #7c2d12;
  background: #ffedd5;
}

.vd-task-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.vd-task-progress-bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #0ea5a4, #f59e0b);
  transition: width 0.2s ease;
}

.vd-task-meta {
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.vd-task-message {
  font-size: 11px;
  color: #334155;
  word-break: break-word;
}

.vd-task-cancel {
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 8px;
  color: #9a3412;
  background: #fff7ed;
  cursor: pointer;
}

.vd-task-cancel:hover {
  background: #ffedd5;
}

.vd-task-open {
  border: 1px solid #99b9c6;
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 8px;
  color: #0f766e;
  background: #ffffff;
  cursor: pointer;
}

.vd-task-open:hover {
  background: #eff8f9;
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

.vd-video-item.unselectable {
  cursor: not-allowed;
  opacity: 0.72;
  filter: saturate(0.7);
}

.vd-video-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(14, 116, 144, 0.2);
}

.vd-video-item.unselectable:hover {
  transform: none;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
}

.vd-video-item.unselectable .vd-checkbox {
  display: none;
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

.vd-filename-input {
  width: 100%;
  border: 1px solid #c8d5dd;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  color: #1e293b;
}

.vd-filename-input:focus {
  border-color: #0ea5a4;
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.16);
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
  padding: 10px 24px 10px 16px;
  background: #eff6f9;
  border-top: 1px solid #d6e3ea;
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
  z-index: 5;
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
    height: 90%;
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

  .vd-input-wide {
    width: 100%;
  }

  .vd-task-panel {
    max-height: 42%;
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
`;function ze(r){const{target:e,handle:t=e,onClick:s,shouldStart:a,dragThreshold:d=4,clampToViewport:p=!0,dragClassName:u,bodyCursor:h="",removeTransformOnStart:b=!1,onDragStart:y,onDrag:f,onDragEnd:w}=r||{};if(!e||!t)return()=>{};let m=null,$=0,D=0,T=0,O=0,F=!1,j=!1;const Y=S=>{if(s){if(j){S.preventDefault(),S.stopPropagation(),j=!1;return}s(S)}},Q=S=>{if(S.pointerType==="mouse"&&S.button!==0||typeof a=="function"&&!a(S))return;const V=e.getBoundingClientRect();$=S.clientX,D=S.clientY,T=V.left,O=V.top,F=!1,m=S.pointerId,e.style.left=`${T}px`,e.style.top=`${O}px`,e.style.right="auto",e.style.bottom="auto",b&&(e.style.transform="none"),u&&e.classList.add(u),t.setPointerCapture(m),document.body.style.userSelect="none",h&&(document.body.style.cursor=h),typeof y=="function"&&y(S),S.preventDefault()},P=S=>{if(S.pointerId!==m)return;const V=S.clientX-$,Z=S.clientY-D;if(!F&&Math.hypot(V,Z)>=d&&(F=!0,j=!0),!F)return;let G=T+V,ee=O+Z;if(p){const oe=Math.max(0,window.innerWidth-e.offsetWidth),ae=Math.max(0,window.innerHeight-e.offsetHeight);G=Math.max(0,Math.min(G,oe)),ee=Math.max(0,Math.min(ee,ae))}e.style.left=`${G}px`,e.style.top=`${ee}px`,typeof f=="function"&&f(S)},W=S=>{S.pointerId===m&&(t.hasPointerCapture(m)&&t.releasePointerCapture(m),m=null,u&&e.classList.remove(u),document.body.style.userSelect="",h&&(document.body.style.cursor=""),typeof w=="function"&&w(S))};return t.addEventListener("click",Y),t.addEventListener("pointerdown",Q),t.addEventListener("pointermove",P),t.addEventListener("pointerup",W),t.addEventListener("pointercancel",W),()=>{t.removeEventListener("click",Y),t.removeEventListener("pointerdown",Q),t.removeEventListener("pointermove",P),t.removeEventListener("pointerup",W),t.removeEventListener("pointercancel",W)}}const Qe=30,Ze=92;function $e(r){if(!r)return;const e=r.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),s=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/s)))}function et(r){if(!r)return;const e=Number(r.dataset.ratioX),t=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const s=Math.max(0,window.innerWidth-r.offsetWidth),a=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(s*e)}px`,r.style.top=`${Math.round(a*t)}px`,r.style.right="auto",r.style.bottom="auto"}function tt(r){const e=H("div",{id:"vd-floating-btn",title:"视频批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${Qe}px`,e.style.bottom=`${Ze}px`,ze({target:e,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{$e(e)}}),requestAnimationFrame(()=>{$e(e)}),window.addEventListener("resize",()=>{et(e)})}function Be(){const r=document.getElementById("vd-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("vd-floating-btn");e&&e.classList.add("active")}function le(){const r=document.getElementById("vd-panel");r&&(r.style.display="none");const e=document.getElementById("vd-floating-btn");e&&e.classList.remove("active")}function nt(){const r=document.getElementById("vd-panel");r&&(r.style.display==="none"||r.style.display===""?Be():le())}const ue=[{name:"default",displayName:"通用视频源",priority:0,urlPattern:/.*/i,pagePattern:/.*/i,enhance(r){return r}}];function rt(r){const e=window.location.href;for(const t of ue)if(t.pagePattern.test(e))return t;return null}function at(r){const e=rt();return e?e.name:null}function st(r){const e=ue.find(t=>t.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function ot(r){if(!r)return r;for(const e of ue)if(e.urlPattern.test(r))return e.enhance(r);return r}class it{constructor(){this.videoExtensions=["mp4","webm","m4v","mov","mkv","avi","flv","m3u8","mpd"],this.dynamicScriptExtensions=["php","asp","aspx","jsp","cgi","do","action"],this.pageExtensions=["html","htm","shtml","xhtml"]}getAllVideos(){const e=[],t=new Set;return this.captureFromVideoElements(e,t),this.captureFromLinks(e,t),this.captureFromDataAttrs(e,t),e.filter(s=>this.isLikelyVideoUrl(s.src,s.captureSource))}captureFromVideoElements(e,t){document.querySelectorAll("video").forEach(a=>{const d=[];a.currentSrc&&d.push(a.currentSrc),a.src&&d.push(a.src),a.querySelectorAll("source").forEach(u=>{u.src&&d.push(u.src),u.getAttribute("src")&&d.push(u.getAttribute("src"))}),this.captureFromCandidates(d,{poster:a.poster||"",duration:Number.isFinite(a.duration)?Math.round(a.duration):0,width:a.videoWidth||a.clientWidth||0,height:a.videoHeight||a.clientHeight||0,title:a.getAttribute("title")||document.title||""},e,t,"video-element")})}captureFromLinks(e,t){document.querySelectorAll("a[href]").forEach(a=>{var p;const d=a.getAttribute("href");this.captureFromCandidates([d],{poster:"",duration:0,width:0,height:0,title:((p=a.textContent)==null?void 0:p.trim())||a.getAttribute("title")||document.title||""},e,t,"link")})}captureFromDataAttrs(e,t){const s=["[data-video-url]","[data-video]","[data-src]","[data-play-url]","[data-playurl]","[data-m3u8]","[data-stream-url]"];document.querySelectorAll(s.join(",")).forEach(d=>{const p=[d.getAttribute("data-video-url"),d.getAttribute("data-video"),d.getAttribute("data-src"),d.getAttribute("data-play-url"),d.getAttribute("data-playurl"),d.getAttribute("data-m3u8"),d.getAttribute("data-stream-url")];this.captureFromCandidates(p,{poster:d.getAttribute("poster")||"",duration:0,width:0,height:0,title:d.getAttribute("title")||document.title||""},e,t,"data-attr")})}captureFromCandidates(e,t,s,a,d="unknown"){e.map(p=>this.normalizeUrl(p)).filter(Boolean).forEach(p=>{if(a.has(p))return;a.add(p);const u=ot(p),h=this.detectMediaType(u);if(h==="ts"&&this.isLikelyHlsSegmentUrl(u))return;const b=h!=="blob"&&h!=="dash"&&h!=="dynamic";s.push({src:u,type:h,captureSource:d,mimeType:this.guessMimeType(u),duration:t.duration||0,width:t.width||0,height:t.height||0,poster:t.poster||"",title:t.title||"",supported:b,unsupportedReason:b?"":this.getUnsupportedReason(h)})})}normalizeUrl(e){if(!e||typeof e!="string")return null;const t=e.trim();if(!t||t.startsWith("data:"))return null;if(t.startsWith("blob:"))return t;if(t.startsWith("//"))return`${window.location.protocol}${t}`;try{return new URL(t,window.location.href).href.split("#")[0]}catch{return null}}getUrlMatchTarget(e){try{const t=new URL(e);return`${t.pathname||""}${t.search||""}`.toLowerCase()}catch{return String(e||"").toLowerCase()}}isLikelyVideoUrl(e,t="unknown"){if(!e)return!1;if(String(e).toLowerCase().startsWith("blob:"))return!0;const a=this.getUrlMatchTarget(e),d=this.extractExtension(a);if(d&&this.pageExtensions.includes(d))return!1;if(d&&this.videoExtensions.includes(d)||d&&this.dynamicScriptExtensions.includes(d)||a.includes(".m3u8")||a.includes(".mpd")||t==="video-element")return!0;const p=/(?:^|[/?#&=_-])(stream|playurl|m3u8|mpd)(?:[/?#&=_-]|$)/i;return t==="link"||t==="data-attr"||t==="unknown"?p.test(a):!1}detectMediaType(e){const t=(e||"").toLowerCase();if(t.startsWith("blob:"))return"blob";if(t.includes(".m3u8"))return"m3u8";if(t.includes(".mpd"))return"dash";const s=this.extractExtension(t);return s?this.dynamicScriptExtensions.includes(s)?"dynamic":s==="m3u8"?"m3u8":s==="mpd"?"dash":s:"video"}isLikelyHlsSegmentUrl(e){const t=(e||"").toLowerCase();return t.includes(".ts")?/\/(seg|segment|chunk|frag|media|part)[^/]*\d+[^/]*\.ts(\?|$)/i.test(t)||/[?&](seg|segment|chunk|frag|part|start|end)=/i.test(t)||/\/\d{1,6}\.ts(\?|$)/i.test(t):!1}extractExtension(e){const s=(e||"").split("?")[0].split(".");if(s.length<2)return"";const a=s[s.length-1].trim();return a.length>6?"":a}guessMimeType(e){const t=this.extractExtension((e||"").toLowerCase());return{mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/x-m4v",m3u8:"application/vnd.apple.mpegurl",ts:"video/mp2t",mkv:"video/x-matroska",avi:"video/x-msvideo",flv:"video/x-flv",mpd:"application/dash+xml"}[t]||"video/mp4"}getUnsupportedReason(e){return e==="blob"?"blob 资源无法直接提取源地址":e==="dash"?"dash/mpd 暂不支持":e==="dynamic"?"动态脚本地址（如 .php）暂不支持自动下载":"当前资源暂不支持"}}class dt{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,s)=>{const a=this.createResourceItem(t,s);this.grid.appendChild(a)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const s=this.resources[e];if(!this.isSelectable(s,e)){const a=this.getDisabledReason(s,e);t.title=a||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const s=H("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(s.classList.add("unselectable"),s.title=this.getDisabledReason(e,t)||"",s.setAttribute("aria-disabled","true"));const a={toggle:()=>this.toggle(t),createElement:H,updateResource:h=>{if(!(!h||typeof h!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],h);return}this.resources[t]={...h}}}},d=this.createThumbnail(e,t,a);d&&s.appendChild(d);const p=H("div",{className:this.classNames.checkbox,onClick:h=>{h.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),u=this.createInfo(e,t,a);return s.appendChild(p),u&&s.appendChild(u),s}defaultCreateThumbnail(e,t,s){const a=H("div",{className:this.classNames.thumb}),d=H("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return a.appendChild(d),a.addEventListener("click",()=>s.toggle()),a}defaultCreateInfo(e){const t=H("div",{className:this.classNames.info}),s=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(H("span",{},this.truncate(s,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const s=parseInt(t.dataset.index||"-1",10);this.selected.has(s)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var a;if(!e)return"未命名";const t=String(e).split("/"),s=((a=t[t.length-1])==null?void 0:a.split("?")[0])||"未命名";try{return decodeURIComponent(s)||"未命名"}catch{return s||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function qe(r){var s;if(!r)return"未命名";const e=String(r).split("/"),t=((s=e[e.length-1])==null?void 0:s.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function ct(r){const e=String((r==null?void 0:r.fileName)||"").trim();return e||qe((r==null?void 0:r.src)||"").replace(/\.[0-9A-Za-z]{1,6}$/,"")}function lt(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}function ut(r){const e=Number(r||0);if(!e||!Number.isFinite(e))return"--:--";const t=Math.floor(e/3600),s=Math.floor(e%3600/60),a=Math.floor(e%60);return t>0?`${String(t).padStart(2,"0")}:${String(s).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${String(s).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function pt(r){return r?r==="m3u8"?"HLS":r==="dash"?"DASH":r==="blob"?"BLOB":String(r).toUpperCase():"video"}function Ae(r){return(r==null?void 0:r.supported)!==!1}function Ue(r){return`不可下载: ${String((r==null?void 0:r.unsupportedReason)||"").trim()||"当前资源暂不支持下载"}`}class ft extends dt{constructor(e){super({...e,emptyText:"未找到视频资源",classNames:{item:"vd-video-item",selected:"selected",empty:"vd-empty",thumb:"vd-video-thumb",checkbox:"vd-checkbox",info:"vd-video-info"},isSelectable:t=>Ae(t),getDisabledReason:t=>Ue(t),createThumbnail:(t,s,a)=>{const d=a.createElement("div",{className:"vd-video-thumb"});if(t.poster){const u=a.createElement("img",{src:t.poster,alt:t.title||`视频 ${s+1}`,loading:"lazy",onerror:()=>{d.classList.add("vd-video-thumb-fallback")}});d.appendChild(u)}else if(t.type!=="m3u8"&&t.type!=="dash"&&t.type!=="blob"){const u=a.createElement("video",{src:t.src,preload:"metadata",muted:"muted",playsinline:"playsinline"});u.onloadedmetadata=()=>{const h=Number.isFinite(u.duration)?Math.round(u.duration):0;a.updateResource({duration:h,width:u.videoWidth||t.width||0,height:u.videoHeight||t.height||0})},u.onerror=()=>{d.classList.add("vd-video-thumb-fallback"),u.remove()},d.appendChild(u)}else d.classList.add("vd-video-thumb-fallback");const p=a.createElement("span",{className:"vd-play-badge"},"▶");return d.appendChild(p),d.addEventListener("click",()=>{a.toggle()}),d},createInfo:(t,s,a)=>{const d=a.createElement("div",{className:"vd-video-info"}),p=qe(t.src),u=ct(t),h=`${pt(t.type)}  ·  ${ut(t.duration)}`,b=a.createElement("input",{className:"vd-filename-input",type:"text",value:u,placeholder:"自定义文件名",title:"下载文件名（无需扩展名）"});Ae(t)||(b.disabled=!0,b.title=Ue(t));const y=()=>{const f=String(b.value||"").trim();a.updateResource({fileName:f||u})};return b.addEventListener("click",f=>{f.stopPropagation()}),b.addEventListener("input",y),b.addEventListener("change",y),d.appendChild(b),d.appendChild(a.createElement("span",{className:"vd-filename",title:t.src},lt(p,26))),d.appendChild(a.createElement("span",{className:"vd-meta"},h)),t.supported?t.type==="m3u8"&&d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-hls"},"m3u8")):d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-unsupported"},"暂不支持")),d}})}getSelectedVideos(){return this.getSelectedResources()}}function ht(r={}){const{target:e,handle:t=e,minWidth:s=300,minHeight:a=200,onResizeStart:d,onResize:p,onResizeEnd:u}=r;if(!e||!t)return()=>{};let h=!1,b=0,y=0,f=0,w=0;const m=T=>{T.preventDefault(),T.stopPropagation(),h=!0,b=T.clientX,y=T.clientY,f=e.offsetWidth,w=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",d==null||d(T)},$=T=>{if(!h)return;const O=T.clientX-b,F=T.clientY-y,j=Math.max(s,f+O),Y=Math.max(a,w+F);e.style.width=`${j}px`,e.style.height=`${Y}px`,p==null||p(T,{width:j,height:Y})},D=T=>{h&&(h=!1,document.body.style.userSelect="",document.body.style.cursor="",u==null||u(T))};return t.addEventListener("mousedown",m),document.addEventListener("mousemove",$),document.addEventListener("mouseup",D),()=>{t.removeEventListener("mousedown",m),document.removeEventListener("mousemove",$),document.removeEventListener("mouseup",D)}}function mt(){const r=document.getElementById("vd-panel");if(r)return r;const e=H("div",{id:"vd-panel",className:"vd-panel"});return e.innerHTML=`
    <div class="vd-panel-header">
      <span class="vd-panel-title">🎬 视频批量下载器</span>
      <button class="vd-panel-close" id="vd-close-btn" title="关闭">×</button>
    </div>
    <div class="vd-panel-note">前端仅采集视频关键信息，下载任务由本机后端执行</div>
    <div class="vd-backend-strip">
      <span class="vd-backend-status disconnected" id="vd-backend-status">后端: 未连接</span>
      <button class="vd-btn vd-btn-ghost" id="vd-reconnect">重连后端</button>
    </div>
    <div class="vd-toolbar">
      <button class="vd-btn vd-btn-primary" id="vd-capture" title="快捷键: Ctrl+Shift+V">
        <span>🎯</span> 捕获视频
      </button>
      <button class="vd-btn" id="vd-select-all">全选</button>
      <button class="vd-btn" id="vd-select-none">全不选</button>
      <button class="vd-btn vd-btn-success" id="vd-download" disabled>提交任务</button>
      <button class="vd-btn vd-btn-warning" id="vd-clear-storage">清除存储</button>
    </div>
    <div class="vd-video-grid"></div>
    <div class="vd-task-panel">
      <div class="vd-task-header">
        <span>后端任务进度</span>
      </div>
      <div class="vd-task-list" id="vd-task-list"></div>
    </div>
    <div class="vd-panel-footer">
      <span class="vd-status">点击「捕获视频」开始</span>
      <span class="vd-downloaded-count" id="vd-downloaded-count">历史下载数: 0</span>
    </div>
    <div class="vd-resize-handle"></div>
  `,document.body.appendChild(e),gt(e),bt(e),e.querySelector("#vd-close-btn").addEventListener("click",()=>{le()}),e}function gt(r){const e=r.querySelector(".vd-panel-header");ze({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".vd-panel-close")})}function bt(r){const e=r.querySelector(".vd-resize-handle");e&&ht({target:r,handle:e,minWidth:300,minHeight:200})}Xe(Je);const vt="v";var Ie,Re;const ie=(Re=(Ie=_.videoDownloader)==null?void 0:Ie.storageKeys)==null?void 0:Re.downloadHistory,K=new Set(["success","failed","cancelled"]),de="videoDownloader.frameCapture.v1",Me="capture-request",De="capture-response",wt=1200;(function(){var we,ye,xe,ke,Se,Ee;if(window.__videoDownloaderInitialized)return;window.__videoDownloaderInitialized=!0;const r=window.top===window.self;let e=[],t=[];const s=[],a=new Map,d=new Set,p=new Map,u=new Set;let h=!0,b=null,y=!1;const f=new Ge({baseUrl:(ye=(we=_.videoDownloader)==null?void 0:we.backend)==null?void 0:ye.baseUrl,wsUrl:(ke=(xe=_.videoDownloader)==null?void 0:xe.backend)==null?void 0:ke.wsUrl,timeout:(Ee=(Se=_.videoDownloader)==null?void 0:Se.backend)==null?void 0:Ee.requestTimeout});function w(n){n&&(n.textContent=`历史下载数: ${s.length}`)}function m(n,o){n&&(n.textContent=o)}function $(n,o,i){n&&(n.classList.remove("connected","disconnected","polling"),n.classList.add(o),n.textContent=i)}function D(n){return n&&typeof n=="object"&&typeof n.url=="string"&&n.url?{url:n.url,downloadedAt:typeof n.downloadedAt=="string"?n.downloadedAt:null}:null}async function T(n){try{const o=await getItem(ie,[]);Array.isArray(o)&&o.forEach(i=>{const l=D(i);l&&s.push(l)}),w(n),g.info("已加载视频下载历史",{count:s.length})}catch(o){g.error("读取视频下载历史失败",o),w(n)}}async function O(){try{await Ne(ie,s),g.debug("视频下载历史已保存",{count:s.length})}catch(n){g.error("保存视频下载历史失败",n)}}function F(n){switch(n){case"queued":return"排队中";case"running":return"执行中";case"success":return"已完成";case"failed":return"有失败";case"cancelled":return"已取消";default:return n||"未知"}}function j(n){return[`进度 ${Math.round((Number(n.progress||0)||0)*100)}%`,`成功 ${n.success||0}`,`失败 ${n.failed||0}`,n.speed?`速度 ${n.speed}`:"",n.eta?`ETA ${n.eta}`:""].filter(Boolean)}function Y(n,o){if(!n||!K.has(n.status)||d.has(n.id))return;const i=(n.items||[]).filter(c=>c.status==="success");if(i.length===0){d.add(n.id);return}const l=new Date().toISOString();i.forEach(c=>{c.src&&s.push({url:c.src,downloadedAt:l})}),d.add(n.id),w(o),O()}function Q(n){if(!n)return;n.innerHTML="";const o=Array.from(a.values()).sort((i,l)=>{const c=Date.parse(i.updatedAt||i.createdAt||0)||0;return(Date.parse(l.updatedAt||l.createdAt||0)||0)-c});if(o.length===0){const i=document.createElement("div");i.className="vd-task-empty",i.textContent="暂无任务，选择视频后点击「提交任务」",n.appendChild(i);return}o.forEach(i=>{const l=document.createElement("div");l.className="vd-task-item";const c=document.createElement("div");c.className="vd-task-row";const x=document.createElement("span");x.className="vd-task-id",x.textContent=String(i.id||"-");const A=document.createElement("span");A.className=`vd-task-status ${i.status||"queued"}`,A.textContent=F(i.status),c.appendChild(x),c.appendChild(A),l.appendChild(c);const N=document.createElement("div");N.className="vd-task-progress";const I=document.createElement("div");I.className="vd-task-progress-bar",I.style.width=`${Math.round((Number(i.progress||0)||0)*100)}%`,N.appendChild(I),l.appendChild(N);const E=document.createElement("div");E.className="vd-task-meta",j(i).forEach(z=>{const te=document.createElement("span");te.textContent=z,E.appendChild(te)}),l.appendChild(E);const J=document.createElement("div");J.className="vd-task-message",J.textContent=i.message||"等待后端更新状态",l.appendChild(J);const U=document.createElement("div");U.className="vd-task-row";const C=document.createElement("span");C.className="vd-task-id",C.textContent=`目录: ${i.outputDir||"-"}`;const M=document.createElement("div");M.className="vd-task-actions";const R=document.createElement("button");if(R.className="vd-task-open",R.dataset.action="open-task-dir",R.dataset.taskId=i.id,R.textContent="打开目录",M.appendChild(R),!K.has(i.status)){const z=document.createElement("button");z.className="vd-task-cancel",z.dataset.action="cancel-task",z.dataset.taskId=i.id,z.textContent="取消任务",M.appendChild(z)}U.appendChild(C),U.appendChild(M),l.appendChild(U),n.appendChild(l)})}function P(n,o,i){!n||!n.id||(a.set(n.id,n),K.has(n.status)&&W(n.id),Y(n,i),Q(o))}function W(n){const o=p.get(n);o&&(clearInterval(o),p.delete(n))}function S(){p.forEach(n=>clearInterval(n)),p.clear()}function V(n,o,i,l,c){var N,I;if(!n||p.has(n))return;const x=(I=(N=_.videoDownloader)==null?void 0:N.backend)==null?void 0:I.pollingInterval,A=setInterval(async()=>{try{const E=await f.getTask(n);P(E,l,c),K.has(E.status)&&W(n)}catch(E){if(String((E==null?void 0:E.message)||"").includes("请求失败: 404")){W(n);const U=a.get(n);U&&!K.has(U.status)&&P({...U,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()},l,c),g.warn("任务不存在，停止轮询",{taskId:n});return}$(i,"polling","后端: 轮询中"),g.warn("轮询任务状态失败",{taskId:n,error:(E==null?void 0:E.message)||E}),m(o,`任务轮询失败: ${(E==null?void 0:E.message)||"未知错误"}`)}},x);p.set(n,A)}function Z(n,o,i,l){a.forEach(c=>{K.has(c.status)||V(c.id,n,o,i,l)})}async function G(n,o){const i=await f.listTasks(),l=new Set(i.map(c=>c.id).filter(Boolean));Array.from(a.keys()).forEach(c=>{if(l.has(c))return;W(c);const x=a.get(c);x&&!K.has(x.status)&&a.set(c,{...x,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()})}),i.forEach(c=>P(c,n,o)),Q(n)}function ee(n){const o=ae((n==null?void 0:n.src)||""),i=String((n==null?void 0:n.fileName)||"").trim();return{src:n.src,type:n.type||"unknown",title:n.title||"",duration:Number(n.duration||0)||0,mimeType:n.mimeType||"",fileName:i||o,requestHeaders:oe()}}function oe(){var c;const n={},o=String((navigator==null?void 0:navigator.userAgent)||"").trim(),i=String(((c=window==null?void 0:window.location)==null?void 0:c.href)||"").trim(),l=String((document==null?void 0:document.cookie)||"").trim();return o&&(n["User-Agent"]=o),i&&(n.Referer=i),l&&(n.Cookie=l),n}function ae(n){var i;const o=((i=String(n||"").split("/").pop())==null?void 0:i.split("?")[0])||"";if(!o)return"";try{return decodeURIComponent(o).replace(/\.[0-9A-Za-z]{1,6}$/,"")}catch{return o.replace(/\.[0-9A-Za-z]{1,6}$/,"")}}function He(n){return{videos:n.map(o=>ee(o)),pageUrl:window.location.href,pageTitle:document.title}}function pe(n,o){return n&&typeof n=="object"&&n.channel===de&&n.type===o&&typeof n.requestId=="string"}function Fe(){const n=document.querySelectorAll("iframe, frame"),o=[];return n.forEach(i=>{i!=null&&i.contentWindow&&o.push(i.contentWindow)}),o}function fe(n){const o={channel:de,type:Me,requestId:n};Fe().forEach(i=>{try{i.postMessage(o,"*")}catch(l){g.debug("向子 frame 分发捕获请求失败",l)}})}function he(){return new it().getAllVideos().map(i=>({...i,frameUrl:window.location.href,frameTitle:document.title||""}))}function me(n,o="",i=""){return!n||typeof n!="object"||!n.src?null:{...n,frameUrl:String(n.frameUrl||o||""),frameTitle:String(n.frameTitle||i||"")}}function Pe(n,o){if(!n||o!=null&&o.supported&&(n==null?void 0:n.supported)===!1)return o;if((o==null?void 0:o.supported)===!1&&(n!=null&&n.supported))return n;const i=Number((n==null?void 0:n.duration)||0)+Number((n==null?void 0:n.width)||0)*Number((n==null?void 0:n.height)||0);return Number((o==null?void 0:o.duration)||0)+Number((o==null?void 0:o.width)||0)*Number((o==null?void 0:o.height)||0)>i?o:n}function We(n){const o=new Map;return n.forEach(i=>{const l=me(i);if(!l)return;const c=String(l.src||"").trim();if(!c)return;const x=o.get(c);o.set(c,Pe(x,l))}),Array.from(o.values())}async function ge(n=wt){const o=`vd_capture_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,i=he(),l=[...i],c=A=>{const N=A==null?void 0:A.data;pe(N,De)&&N.requestId===o&&Array.isArray(N.videos)&&N.videos.forEach(I=>{const E=me(I,N.frameUrl,N.frameTitle);E&&l.push(E)})};window.addEventListener("message",c);try{fe(o),await new Promise(A=>{window.setTimeout(A,n)})}finally{window.removeEventListener("message",c)}const x=We(l);return g.info("跨 frame 捕获完成",{localCount:i.length,totalCount:x.length,remoteCount:Math.max(0,x.length-i.length)}),x}function _e(){window.addEventListener("message",n=>{const o=n==null?void 0:n.data;if(!pe(o,Me))return;const i=o.requestId;if(u.has(i))return;u.add(i);let l=[];try{l=he()}catch(c){g.warn("子 frame 捕获视频失败",c)}fe(i);try{window.top.postMessage({channel:de,type:De,requestId:i,frameUrl:window.location.href,frameTitle:document.title||"",videos:l},"*")}catch(c){g.warn("子 frame 回传捕获结果失败",c)}window.setTimeout(()=>{u.delete(i)},15e3)})}function je(n,o){document.addEventListener("keydown",async i=>{const l=String(i.key||"").toLowerCase();if(i.ctrlKey&&i.shiftKey&&l===vt){if(i.preventDefault(),!h)return;h=!1;const c=document.getElementById("vd-panel");(!c||c.style.display==="none"||c.style.display==="")&&Be(),m(o,"正在跨 frame 捕获视频...");try{e=await ge(),n.render(e),m(o,`已捕获 ${e.length} 个视频资源`)}catch(x){g.error("快捷键捕获视频失败",x),m(o,`捕获失败: ${(x==null?void 0:x.message)||"未知错误"}`)}setTimeout(()=>{h=!0},500)}})}function Ve(n,o,i,l){if(!(!n||typeof n!="object")){if(n.event==="task.list"&&Array.isArray(n.tasks)){n.tasks.forEach(c=>P(c,i,l));return}n.task&&(P(n.task,i,l),n.event&&n.event.startsWith("task.")&&m(o,`后端状态: ${F(n.task.status)}`))}}async function be(n,o,i,l){b&&(b.close(),b=null),$(n,"disconnected","后端: 连接中"),b=f.connectTaskStream({onOpen:()=>{y=!0,$(n,"connected","后端: WebSocket 已连接"),S()},onMessage:c=>{Ve(c,o,i,l)},onClose:()=>{y=!1,$(n,"polling","后端: WebSocket 断开，切换轮询"),Z(o,n,i,l)},onError:c=>{y=!1,$(n,"polling","后端: 连接异常，切换轮询"),g.warn("WebSocket 异常",c),Z(o,n,i,l)}})}async function Oe(){var te,Ce;g.info("videoDownloader 初始化开始",{logLevel:_.logLevel});const n=mt(),o=at(),i=n.querySelector(".vd-panel-note");if(o&&i){const v=st(o);i.textContent=`支持直链视频与 m3u8 基础下载，当前来源策略：${v}`}tt({onToggle:nt}),le();const l=n.querySelector(".vd-video-grid"),c=n.querySelector("#vd-task-list"),x=n.querySelector("#vd-select-all"),A=n.querySelector("#vd-select-none"),N=n.querySelector("#vd-download"),I=n.querySelector("#vd-clear-storage"),E=n.querySelector("#vd-capture"),J=n.querySelector("#vd-reconnect"),U=n.querySelector("#vd-backend-status"),C=n.querySelector(".vd-status"),M=n.querySelector("#vd-downloaded-count");await T(M),f.setBaseUrl((Ce=(te=_.videoDownloader)==null?void 0:te.backend)==null?void 0:Ce.baseUrl,"");const R=new ft({grid:l,onSelectionChange:v=>{t=v,z()}});je(R,C),E.addEventListener("click",async()=>{g.info("开始手动捕获视频"),m(C,"正在跨 frame 捕获视频...");try{e=await ge(),R.render(e),m(C,`已捕获 ${e.length} 个视频资源`),g.info("手动捕获完成",{count:e.length})}catch(v){g.error("手动捕获失败",v),m(C,`捕获失败: ${(v==null?void 0:v.message)||"未知错误"}`)}}),x.addEventListener("click",()=>{R.selectAll()}),A.addEventListener("click",()=>{R.selectNone()}),I.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){s.length=0;try{await Ne(ie,[]),w(M),m(C,"存储已清除"),g.info("视频脚本存储已清除")}catch(k){m(C,"清除存储失败"),g.error("清除视频脚本存储失败",k)}}}),J.addEventListener("click",async()=>{await be(U,C,c,M);try{await G(c,M)}catch(v){g.warn("刷新任务列表失败",v)}}),c.addEventListener("click",async v=>{const k=v.target.closest("[data-action]");if(!k)return;const B=k.dataset.taskId;if(!B)return;const q=k.dataset.action;if(q==="open-task-dir"){try{const L=await f.openDirectory({taskId:B});m(C,(L==null?void 0:L.message)||"已请求后端打开目录")}catch(L){g.error("打开任务目录失败",L),m(C,`打开目录失败: ${(L==null?void 0:L.message)||"未知错误"}`)}return}if(q==="cancel-task")try{await f.cancelTask(B),m(C,`任务 ${B} 正在取消`)}catch(L){g.error("取消任务失败",L),m(C,`取消任务失败: ${(L==null?void 0:L.message)||"未知错误"}`)}}),N.addEventListener("click",async()=>{if(t.length===0){alert("请先选择要下载的视频");return}const v=t.filter(k=>(k==null?void 0:k.src)&&(k==null?void 0:k.supported)!==!1&&!String(k.src).startsWith("blob:"));if(v.length===0){alert("当前选中资源都不支持提交到后端，请至少选择一个可下载资源");return}g.info("提交后端视频任务",{count:v.length}),m(C,`正在提交任务（${v.length} 个）...`);try{let k=0;const B=[];for(const q of v){const L=He([q]);try{const X=await f.createTask(L),ne=X==null?void 0:X.taskId;if(!ne)throw new Error("后端未返回 taskId");const Ye=await f.getTask(ne);P(Ye,c,M),k+=1,y||V(ne,C,U,c,M)}catch(X){const ne=String((q==null?void 0:q.fileName)||ae((q==null?void 0:q.src)||"")||"未命名");B.push(`${ne}: ${(X==null?void 0:X.message)||"未知错误"}`)}}if(B.length===0)m(C,`任务已提交: ${k} 个`);else if(k>0)m(C,`部分提交失败（成功 ${k}，失败 ${B.length}）`),alert(`以下任务提交失败:
${B.join(`
`)}`);else throw new Error(B.join("; "))}catch(k){g.error("任务提交失败",k),m(C,`任务提交失败: ${(k==null?void 0:k.message)||"未知错误"}`)}});function z(){const v=t.length;N.disabled=v===0,N.textContent=v===0?"提交任务":`提交任务 (${v})`}await be(U,C,c,M);try{await G(c,M)}catch(v){g.warn("初始化任务列表失败",v),m(C,`后端暂不可用: ${(v==null?void 0:v.message)||"未知错误"}`),$(U,"polling","后端: 请求失败，轮询模式")}z(),g.info("videoDownloader 初始化完成",{downloadedCount:s.length})}function ve(){Oe().catch(n=>{g.error("videoDownloader 初始化失败",n)})}if(_e(),!r){g.debug("videoDownloader 已在子 frame 启用捕获桥接");return}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ve):ve()})();
