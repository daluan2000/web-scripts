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

function P(r,e={},t="",o=""){const a=document.createElement(r);for(const[d,p]of Object.entries(e))if(d==="className")a.className=p;else if(d==="dataset")for(const[u,g]of Object.entries(p))a.dataset[u]=g;else d.startsWith("on")?a.addEventListener(d.slice(2).toLowerCase(),p):a.setAttribute(d,p);return t?a.innerHTML=t:o&&(a.textContent=o),a}function Ke(r){const e=P("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const j={logLevel:"info",storagePrefix:"userscript_",videoDownloader:{storageKeys:{downloadHistory:"videoDownloader_download_history"},backend:{baseUrl:"http://127.0.0.1:8787",wsUrl:"",requestTimeout:2e4,pollingInterval:2500}}};function Ge(r){return j.storagePrefix+r}const Ne={debug:0,info:1,warn:2,error:3};function se(r,e,...t){const o=Ne[j.logLevel];if(Ne[r]<o)return;const a=`[${r.toUpperCase()}]`,d=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${a} [${d}]`,e,...t);break;case"warn":console.warn(`${a} [${d}]`,e,...t);break;case"error":console.error(`${a} [${d}]`,e,...t);break}}const b={debug:(r,...e)=>se("debug",r,...e),info:(r,...e)=>se("info",r,...e),warn:(r,...e)=>se("warn",r,...e),error:(r,...e)=>se("error",r,...e)};async function $e(r,e){return new Promise(t=>{const o=JSON.stringify(e);GM_setValue(Ge(r),o),t()})}async function Z(r,e={}){const{method:t="GET",headers:o={},body:a=null,dataType:d="json",responseType:p="",timeout:u=3e4}=e;return new Promise((g,w)=>{const k={method:t,url:r,headers:o,timeout:u,responseType:p,onload:f=>{if(f.status>=200&&f.status<300)try{let y;p==="blob"||p==="arraybuffer"?y=f.response:d==="text"?y=f.responseText:d==="json"?y=JSON.parse(f.responseText):y=f.responseText,g({data:y,status:f.status,headers:f.responseHeaders})}catch{g({data:f.responseText,status:f.status})}else{let y="";const m=String(f.responseText||"").trim();if(m)try{const M=JSON.parse(m);y=String((M==null?void 0:M.detail)||m)}catch{y=m}const U=y?`请求失败: ${f.status} - ${y}`:`请求失败: ${f.status}`;w(new Error(U))}},onerror:()=>w(new Error("网络请求失败")),ontimeout:()=>w(new Error("请求超时"))};a&&(k.data=typeof a=="string"?a:JSON.stringify(a),!k.headers["Content-Type"]&&!k.headers["content-type"]&&(k.headers["Content-Type"]="application/json")),GM_xmlhttpRequest(k)})}function ce(r){const e="http://127.0.0.1:8787",t=String(r||"").trim()||e;try{const o=new URL(t);return o.pathname="",o.search="",o.hash="",o.toString().replace(/\/$/,"")}catch{return e}}function Ue(r,e=""){if(e&&String(e).trim())return String(e).trim().replace(/\/$/,"");const t=ce(r);return t.startsWith("https://")?t.replace("https://","wss://"):t.replace("http://","ws://")}class Je{constructor(e={}){this.baseUrl=ce(e.baseUrl),this.wsUrl=Ue(this.baseUrl,e.wsUrl),this.timeout=e.timeout||2e4}setBaseUrl(e,t=""){this.baseUrl=ce(e),this.wsUrl=Ue(this.baseUrl,t)}getBaseUrl(){return this.baseUrl}getWsUrl(){return this.wsUrl}async createTask(e){return(await Z(this.buildUrl("/api/video/tasks"),{method:"POST",body:e,timeout:this.timeout,dataType:"json"})).data}async getTask(e){return(await Z(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}`),{method:"GET",timeout:this.timeout,dataType:"json"})).data}async listTasks(){var t;return((t=(await Z(this.buildUrl("/api/video/tasks"),{method:"GET",timeout:this.timeout,dataType:"json"})).data)==null?void 0:t.tasks)||[]}async cancelTask(e){return(await Z(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}/cancel`),{method:"POST",timeout:this.timeout,dataType:"json"})).data}async openDirectory({taskId:e="",path:t=""}={}){return(await Z(this.buildUrl("/api/video/tasks/open-dir"),{method:"POST",body:{taskId:e,path:t},timeout:this.timeout,dataType:"json"})).data}async cleanupPartDirs(){return(await Z(this.buildUrl("/api/video/tasks/cleanup-part-dirs"),{method:"POST",timeout:this.timeout,dataType:"json"})).data}connectTaskStream({taskId:e="",onOpen:t,onMessage:o,onClose:a,onError:d}){const u=`${this.getWsUrl()}/api/video/tasks/ws`,g=e?`?taskId=${encodeURIComponent(e)}`:"",w=`${u}${g}`;b.info("连接后端任务 WebSocket",{wsUrl:w});const k=new WebSocket(w);return k.onopen=()=>{t==null||t()},k.onmessage=f=>{try{const y=JSON.parse(f.data);o==null||o(y)}catch(y){b.warn("WebSocket 消息解析失败",y)}},k.onerror=f=>{d==null||d(f)},k.onclose=f=>{a==null||a(f)},{close(){try{k.close()}catch(f){b.warn("关闭 WebSocket 失败",f)}}}}buildUrl(e){return`${this.baseUrl}${e}`}}const Qe=`/* 视频批量下载器样式 */

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
  height: 675px;
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 6px;
  border: 1px solid #dbe6ee;
  border-radius: 6px;
  background: #f8fafc;
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
`;function Be(r){const{target:e,handle:t=e,onClick:o,shouldStart:a,dragThreshold:d=4,clampToViewport:p=!0,dragClassName:u,bodyCursor:g="",removeTransformOnStart:w=!1,onDragStart:k,onDrag:f,onDragEnd:y}=r||{};if(!e||!t)return()=>{};let m=null,U=0,M=0,L=0,X=0,F=!1,V=!1;const K=E=>{if(o){if(V){E.preventDefault(),E.stopPropagation(),V=!1;return}o(E)}},ee=E=>{if(E.pointerType==="mouse"&&E.button!==0||typeof a=="function"&&!a(E))return;const O=e.getBoundingClientRect();U=E.clientX,M=E.clientY,L=O.left,X=O.top,F=!1,m=E.pointerId,e.style.left=`${L}px`,e.style.top=`${X}px`,e.style.right="auto",e.style.bottom="auto",w&&(e.style.transform="none"),u&&e.classList.add(u),t.setPointerCapture(m),document.body.style.userSelect="none",g&&(document.body.style.cursor=g),typeof k=="function"&&k(E),E.preventDefault()},R=E=>{if(E.pointerId!==m)return;const O=E.clientX-U,te=E.clientY-M;if(!F&&Math.hypot(O,te)>=d&&(F=!0,V=!0),!F)return;let G=L+O,ne=X+te;if(p){const oe=Math.max(0,window.innerWidth-e.offsetWidth),re=Math.max(0,window.innerHeight-e.offsetHeight);G=Math.max(0,Math.min(G,oe)),ne=Math.max(0,Math.min(ne,re))}e.style.left=`${G}px`,e.style.top=`${ne}px`,typeof f=="function"&&f(E)},H=E=>{E.pointerId===m&&(t.hasPointerCapture(m)&&t.releasePointerCapture(m),m=null,u&&e.classList.remove(u),document.body.style.userSelect="",g&&(document.body.style.cursor=""),typeof y=="function"&&y(E))};return t.addEventListener("click",K),t.addEventListener("pointerdown",ee),t.addEventListener("pointermove",R),t.addEventListener("pointerup",H),t.addEventListener("pointercancel",H),()=>{t.removeEventListener("click",K),t.removeEventListener("pointerdown",ee),t.removeEventListener("pointermove",R),t.removeEventListener("pointerup",H),t.removeEventListener("pointercancel",H)}}const Ze=30,et=92;function Ae(r){if(!r)return;const e=r.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),o=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/o)))}function tt(r){if(!r)return;const e=Number(r.dataset.ratioX),t=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const o=Math.max(0,window.innerWidth-r.offsetWidth),a=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(o*e)}px`,r.style.top=`${Math.round(a*t)}px`,r.style.right="auto",r.style.bottom="auto"}function nt(r){const e=P("div",{id:"vd-floating-btn",title:"视频批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${Ze}px`,e.style.bottom=`${et}px`,Be({target:e,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{Ae(e)}}),requestAnimationFrame(()=>{Ae(e)}),window.addEventListener("resize",()=>{tt(e)})}function Pe(){const r=document.getElementById("vd-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("vd-floating-btn");e&&e.classList.add("active")}function le(){const r=document.getElementById("vd-panel");r&&(r.style.display="none");const e=document.getElementById("vd-floating-btn");e&&e.classList.remove("active")}function rt(){const r=document.getElementById("vd-panel");r&&(r.style.display==="none"||r.style.display===""?Pe():le())}const ue=[{name:"default",displayName:"通用视频源",priority:0,urlPattern:/.*/i,pagePattern:/.*/i,enhance(r){return r}}];function at(r){const e=window.location.href;for(const t of ue)if(t.pagePattern.test(e))return t;return null}function st(r){const e=at();return e?e.name:null}function ot(r){const e=ue.find(t=>t.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function it(r){if(!r)return r;for(const e of ue)if(e.urlPattern.test(r))return e.enhance(r);return r}class dt{constructor(){this.videoExtensions=["mp4","webm","m4v","mov","mkv","avi","flv","m3u8","mpd"],this.dynamicScriptExtensions=["php","asp","aspx","jsp","cgi","do","action"],this.pageExtensions=["html","htm","shtml","xhtml"]}getAllVideos(){const e=[],t=new Set;return this.captureFromVideoElements(e,t),this.captureFromLinks(e,t),this.captureFromDataAttrs(e,t),e.filter(o=>this.isLikelyVideoUrl(o.src,o.captureSource))}captureFromVideoElements(e,t){document.querySelectorAll("video").forEach(a=>{const d=[];a.currentSrc&&d.push(a.currentSrc),a.src&&d.push(a.src),a.querySelectorAll("source").forEach(u=>{u.src&&d.push(u.src),u.getAttribute("src")&&d.push(u.getAttribute("src"))}),this.captureFromCandidates(d,{poster:a.poster||"",duration:Number.isFinite(a.duration)?Math.round(a.duration):0,width:a.videoWidth||a.clientWidth||0,height:a.videoHeight||a.clientHeight||0,title:a.getAttribute("title")||document.title||""},e,t,"video-element")})}captureFromLinks(e,t){document.querySelectorAll("a[href]").forEach(a=>{var p;const d=a.getAttribute("href");this.captureFromCandidates([d],{poster:"",duration:0,width:0,height:0,title:((p=a.textContent)==null?void 0:p.trim())||a.getAttribute("title")||document.title||""},e,t,"link")})}captureFromDataAttrs(e,t){const o=["[data-video-url]","[data-video]","[data-src]","[data-play-url]","[data-playurl]","[data-m3u8]","[data-stream-url]"];document.querySelectorAll(o.join(",")).forEach(d=>{const p=[d.getAttribute("data-video-url"),d.getAttribute("data-video"),d.getAttribute("data-src"),d.getAttribute("data-play-url"),d.getAttribute("data-playurl"),d.getAttribute("data-m3u8"),d.getAttribute("data-stream-url")];this.captureFromCandidates(p,{poster:d.getAttribute("poster")||"",duration:0,width:0,height:0,title:d.getAttribute("title")||document.title||""},e,t,"data-attr")})}captureFromCandidates(e,t,o,a,d="unknown"){e.map(p=>this.normalizeUrl(p)).filter(Boolean).forEach(p=>{if(a.has(p))return;a.add(p);const u=it(p),g=this.detectMediaType(u);if(g==="ts"&&this.isLikelyHlsSegmentUrl(u))return;const w=g!=="blob"&&g!=="dash"&&g!=="dynamic";o.push({src:u,type:g,captureSource:d,mimeType:this.guessMimeType(u),duration:t.duration||0,width:t.width||0,height:t.height||0,poster:t.poster||"",title:t.title||"",supported:w,unsupportedReason:w?"":this.getUnsupportedReason(g)})})}normalizeUrl(e){if(!e||typeof e!="string")return null;const t=e.trim();if(!t||t.startsWith("data:"))return null;if(t.startsWith("blob:"))return t;if(t.startsWith("//"))return`${window.location.protocol}${t}`;try{return new URL(t,window.location.href).href.split("#")[0]}catch{return null}}getUrlMatchTarget(e){try{const t=new URL(e);return`${t.pathname||""}${t.search||""}`.toLowerCase()}catch{return String(e||"").toLowerCase()}}isLikelyVideoUrl(e,t="unknown"){if(!e)return!1;if(String(e).toLowerCase().startsWith("blob:"))return!0;const a=this.getUrlMatchTarget(e),d=this.extractExtension(a);if(d&&this.pageExtensions.includes(d))return!1;if(d&&this.videoExtensions.includes(d)||d&&this.dynamicScriptExtensions.includes(d)||a.includes(".m3u8")||a.includes(".mpd")||t==="video-element")return!0;const p=/(?:^|[/?#&=_-])(stream|playurl|m3u8|mpd)(?:[/?#&=_-]|$)/i;return t==="link"||t==="data-attr"||t==="unknown"?p.test(a):!1}detectMediaType(e){const t=(e||"").toLowerCase();if(t.startsWith("blob:"))return"blob";if(t.includes(".m3u8"))return"m3u8";if(t.includes(".mpd"))return"dash";const o=this.extractExtension(t);return o?this.dynamicScriptExtensions.includes(o)?"dynamic":o==="m3u8"?"m3u8":o==="mpd"?"dash":o:"video"}isLikelyHlsSegmentUrl(e){const t=(e||"").toLowerCase();return t.includes(".ts")?/\/(seg|segment|chunk|frag|media|part)[^/]*\d+[^/]*\.ts(\?|$)/i.test(t)||/[?&](seg|segment|chunk|frag|part|start|end)=/i.test(t)||/\/\d{1,6}\.ts(\?|$)/i.test(t):!1}extractExtension(e){const o=(e||"").split("?")[0].split(".");if(o.length<2)return"";const a=o[o.length-1].trim();return a.length>6?"":a}guessMimeType(e){const t=this.extractExtension((e||"").toLowerCase());return{mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/x-m4v",m3u8:"application/vnd.apple.mpegurl",ts:"video/mp2t",mkv:"video/x-matroska",avi:"video/x-msvideo",flv:"video/x-flv",mpd:"application/dash+xml"}[t]||"video/mp4"}getUnsupportedReason(e){return e==="blob"?"blob 资源无法直接提取源地址":e==="dash"?"dash/mpd 暂不支持":e==="dynamic"?"动态脚本地址（如 .php）暂不支持自动下载":"当前资源暂不支持"}}class ct{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,o)=>{const a=this.createResourceItem(t,o);this.grid.appendChild(a)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const o=this.resources[e];if(!this.isSelectable(o,e)){const a=this.getDisabledReason(o,e);t.title=a||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const o=P("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(o.classList.add("unselectable"),o.title=this.getDisabledReason(e,t)||"",o.setAttribute("aria-disabled","true"));const a={toggle:()=>this.toggle(t),createElement:P,updateResource:g=>{if(!(!g||typeof g!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],g);return}this.resources[t]={...g}}}},d=this.createThumbnail(e,t,a);d&&o.appendChild(d);const p=P("div",{className:this.classNames.checkbox,onClick:g=>{g.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),u=this.createInfo(e,t,a);return o.appendChild(p),u&&o.appendChild(u),o}defaultCreateThumbnail(e,t,o){const a=P("div",{className:this.classNames.thumb}),d=P("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return a.appendChild(d),a.addEventListener("click",()=>o.toggle()),a}defaultCreateInfo(e){const t=P("div",{className:this.classNames.info}),o=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(P("span",{},this.truncate(o,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const o=parseInt(t.dataset.index||"-1",10);this.selected.has(o)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var a;if(!e)return"未命名";const t=String(e).split("/"),o=((a=t[t.length-1])==null?void 0:a.split("?")[0])||"未命名";try{return decodeURIComponent(o)||"未命名"}catch{return o||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function Fe(r){var o;if(!r)return"未命名";const e=String(r).split("/"),t=((o=e[e.length-1])==null?void 0:o.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function lt(r){const e=String((r==null?void 0:r.fileName)||"").trim();return e||Fe((r==null?void 0:r.src)||"").replace(/\.[0-9A-Za-z]{1,6}$/,"")}function ut(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}function pt(r){const e=Number(r||0);if(!e||!Number.isFinite(e))return"--:--";const t=Math.floor(e/3600),o=Math.floor(e%3600/60),a=Math.floor(e%60);return t>0?`${String(t).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function ft(r){return r?r==="m3u8"?"HLS":r==="dash"?"DASH":r==="blob"?"BLOB":String(r).toUpperCase():"video"}function Me(r){return(r==null?void 0:r.supported)!==!1}function De(r){return`不可下载: ${String((r==null?void 0:r.unsupportedReason)||"").trim()||"当前资源暂不支持下载"}`}class ht extends ct{constructor(e){super({...e,emptyText:"未找到视频资源",classNames:{item:"vd-video-item",selected:"selected",empty:"vd-empty",thumb:"vd-video-thumb",checkbox:"vd-checkbox",info:"vd-video-info"},isSelectable:t=>Me(t),getDisabledReason:t=>De(t),createThumbnail:(t,o,a)=>{const d=a.createElement("div",{className:"vd-video-thumb"});if(t.poster){const u=a.createElement("img",{src:t.poster,alt:t.title||`视频 ${o+1}`,loading:"lazy",onerror:()=>{d.classList.add("vd-video-thumb-fallback")}});d.appendChild(u)}else if(t.type!=="m3u8"&&t.type!=="dash"&&t.type!=="blob"){const u=a.createElement("video",{src:t.src,preload:"metadata",muted:"muted",playsinline:"playsinline"});u.onloadedmetadata=()=>{const g=Number.isFinite(u.duration)?Math.round(u.duration):0;a.updateResource({duration:g,width:u.videoWidth||t.width||0,height:u.videoHeight||t.height||0})},u.onerror=()=>{d.classList.add("vd-video-thumb-fallback"),u.remove()},d.appendChild(u)}else d.classList.add("vd-video-thumb-fallback");const p=a.createElement("span",{className:"vd-play-badge"},"▶");return d.appendChild(p),d.addEventListener("click",()=>{a.toggle()}),d},createInfo:(t,o,a)=>{const d=a.createElement("div",{className:"vd-video-info"}),p=Fe(t.src),u=lt(t),g=`${ft(t.type)}  ·  ${pt(t.duration)}`,w=a.createElement("input",{className:"vd-filename-input",type:"text",value:u,placeholder:"自定义文件名",title:"下载文件名（无需扩展名）"});Me(t)||(w.disabled=!0,w.title=De(t));const k=()=>{const f=String(w.value||"").trim();a.updateResource({fileName:f||u})};return w.addEventListener("click",f=>{f.stopPropagation()}),w.addEventListener("input",k),w.addEventListener("change",k),d.appendChild(w),d.appendChild(a.createElement("span",{className:"vd-filename",title:t.src},ut(p,26))),d.appendChild(a.createElement("span",{className:"vd-meta"},g)),t.supported?t.type==="m3u8"&&d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-hls"},"m3u8")):d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-unsupported"},"暂不支持")),d}})}getSelectedVideos(){return this.getSelectedResources()}}function mt(r={}){const{target:e,handle:t=e,minWidth:o=300,minHeight:a=200,onResizeStart:d,onResize:p,onResizeEnd:u}=r;if(!e||!t)return()=>{};let g=!1,w=0,k=0,f=0,y=0;const m=L=>{L.preventDefault(),L.stopPropagation(),g=!0,w=L.clientX,k=L.clientY,f=e.offsetWidth,y=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",d==null||d(L)},U=L=>{if(!g)return;const X=L.clientX-w,F=L.clientY-k,V=Math.max(o,f+X),K=Math.max(a,y+F);e.style.width=`${V}px`,e.style.height=`${K}px`,p==null||p(L,{width:V,height:K})},M=L=>{g&&(g=!1,document.body.style.userSelect="",document.body.style.cursor="",u==null||u(L))};return t.addEventListener("mousedown",m),document.addEventListener("mousemove",U),document.addEventListener("mouseup",M),()=>{t.removeEventListener("mousedown",m),document.removeEventListener("mousemove",U),document.removeEventListener("mouseup",M)}}function gt(){const r=document.getElementById("vd-panel");if(r)return r;const e=P("div",{id:"vd-panel",className:"vd-panel"});return e.innerHTML=`
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
      <button class="vd-btn" id="vd-cleanup-parts">清理 part 目录</button>
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
  `,document.body.appendChild(e),bt(e),vt(e),e.querySelector("#vd-close-btn").addEventListener("click",()=>{le()}),e}function bt(r){const e=r.querySelector(".vd-panel-header");Be({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".vd-panel-close")})}function vt(r){const e=r.querySelector(".vd-resize-handle");e&&mt({target:r,handle:e,minWidth:300,minHeight:200})}Ke(Qe);const wt="v";var ze,qe;const ie=(qe=(ze=j.videoDownloader)==null?void 0:ze.storageKeys)==null?void 0:qe.downloadHistory,_=new Set(["success","failed","cancelled"]),de="videoDownloader.frameCapture.v1",Ie="capture-request",Re="capture-response",yt=1200;(function(){var we,ye,xe,ke,Se,Ee;if(window.__videoDownloaderInitialized)return;window.__videoDownloaderInitialized=!0;const r=window.top===window.self;let e=[],t=[];const o=[],a=new Map,d=new Set,p=new Map,u=new Set;let g=!0,w=null,k=!1;const f=new Je({baseUrl:(ye=(we=j.videoDownloader)==null?void 0:we.backend)==null?void 0:ye.baseUrl,wsUrl:(ke=(xe=j.videoDownloader)==null?void 0:xe.backend)==null?void 0:ke.wsUrl,timeout:(Ee=(Se=j.videoDownloader)==null?void 0:Se.backend)==null?void 0:Ee.requestTimeout});function y(n){n&&(n.textContent=`历史下载数: ${o.length}`)}function m(n,s){n&&(n.textContent=s)}function U(n,s,i){n&&(n.classList.remove("connected","disconnected","polling"),n.classList.add(s),n.textContent=i)}function M(n){return n&&typeof n=="object"&&typeof n.url=="string"&&n.url?{url:n.url,downloadedAt:typeof n.downloadedAt=="string"?n.downloadedAt:null}:null}async function L(n){try{const s=await getItem(ie,[]);Array.isArray(s)&&s.forEach(i=>{const l=M(i);l&&o.push(l)}),y(n),b.info("已加载视频下载历史",{count:o.length})}catch(s){b.error("读取视频下载历史失败",s),y(n)}}async function X(){try{await $e(ie,o),b.debug("视频下载历史已保存",{count:o.length})}catch(n){b.error("保存视频下载历史失败",n)}}function F(n){switch(n){case"queued":return"排队中";case"running":return"执行中";case"success":return"已完成";case"failed":return"有失败";case"cancelled":return"已取消";default:return n||"未知"}}function V(n){if(!n)return"等待后端更新状态";const s=String(n.progressText||"").trim();return n.status==="running"&&s?s:_.has(n.status)?n.message||"任务已结束":s||"等待后端进度输出..."}function K(n,s){if(!n||!_.has(n.status)||d.has(n.id))return;const i=(n.items||[]).filter(c=>c.status==="success");if(i.length===0){d.add(n.id);return}const l=new Date().toISOString();i.forEach(c=>{c.src&&o.push({url:c.src,downloadedAt:l})}),d.add(n.id),y(s),X()}function ee(n){if(!n)return;n.innerHTML="";const s=Array.from(a.values()).map((i,l)=>({task:i,index:l})).sort((i,l)=>{const c=Date.parse(i.task.createdAt||0)||0,S=Date.parse(l.task.createdAt||0)||0;return S!==c?S-c:i.index-l.index}).map(({task:i})=>i);if(s.length===0){const i=document.createElement("div");i.className="vd-task-empty",i.textContent="暂无任务，选择视频后点击「提交任务」",n.appendChild(i);return}s.forEach(i=>{const l=document.createElement("div");l.className="vd-task-item";const c=document.createElement("div");c.className="vd-task-row";const S=document.createElement("span");S.className="vd-task-id",S.textContent=String(i.id||"-");const A=document.createElement("span");A.className=`vd-task-status ${i.status||"queued"}`,A.textContent=F(i.status),c.appendChild(S),c.appendChild(A),l.appendChild(c);const N=document.createElement("div");N.className="vd-task-message",N.textContent=V(i),l.appendChild(N);const D=document.createElement("div");D.className="vd-task-row";const T=document.createElement("span");T.className="vd-task-id",T.textContent=`目录: ${i.outputDir||"-"}`;const J=document.createElement("div");J.className="vd-task-actions";const I=document.createElement("button");if(I.className="vd-task-open",I.dataset.action="open-task-dir",I.dataset.taskId=i.id,I.textContent="打开目录",J.appendChild(I),!_.has(i.status)){const z=document.createElement("button");z.className="vd-task-cancel",z.dataset.action="cancel-task",z.dataset.taskId=i.id,z.textContent="取消任务",J.appendChild(z)}D.appendChild(T),D.appendChild(J),l.appendChild(D),n.appendChild(l)})}function R(n,s,i){!n||!n.id||(a.set(n.id,n),_.has(n.status)&&H(n.id),K(n,i),ee(s))}function H(n){const s=p.get(n);s&&(clearInterval(s),p.delete(n))}function E(){p.forEach(n=>clearInterval(n)),p.clear()}function O(n,s,i,l,c){var N,D;if(!n||p.has(n))return;const S=(D=(N=j.videoDownloader)==null?void 0:N.backend)==null?void 0:D.pollingInterval,A=setInterval(async()=>{try{const T=await f.getTask(n);R(T,l,c),_.has(T.status)&&H(n)}catch(T){if(String((T==null?void 0:T.message)||"").includes("请求失败: 404")){H(n);const I=a.get(n);I&&!_.has(I.status)&&R({...I,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()},l,c),b.warn("任务不存在，停止轮询",{taskId:n});return}U(i,"polling","后端: 轮询中"),b.warn("轮询任务状态失败",{taskId:n,error:(T==null?void 0:T.message)||T}),m(s,`任务轮询失败: ${(T==null?void 0:T.message)||"未知错误"}`)}},S);p.set(n,A)}function te(n,s,i,l){a.forEach(c=>{_.has(c.status)||O(c.id,n,s,i,l)})}async function G(n,s){const i=await f.listTasks(),l=new Set(i.map(c=>c.id).filter(Boolean));Array.from(a.keys()).forEach(c=>{if(l.has(c))return;H(c);const S=a.get(c);S&&!_.has(S.status)&&a.set(c,{...S,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()})}),i.forEach(c=>R(c,n,s)),ee(n)}function ne(n){const s=re((n==null?void 0:n.src)||""),i=String((n==null?void 0:n.fileName)||"").trim();return{src:n.src,type:n.type||"unknown",title:n.title||"",duration:Number(n.duration||0)||0,mimeType:n.mimeType||"",fileName:i||s,requestHeaders:oe()}}function oe(){var c;const n={},s=String((navigator==null?void 0:navigator.userAgent)||"").trim(),i=String(((c=window==null?void 0:window.location)==null?void 0:c.href)||"").trim(),l=String((document==null?void 0:document.cookie)||"").trim();return s&&(n["User-Agent"]=s),i&&(n.Referer=i),l&&(n.Cookie=l),n}function re(n){var i;const s=((i=String(n||"").split("/").pop())==null?void 0:i.split("?")[0])||"";if(!s)return"";try{return decodeURIComponent(s).replace(/\.[0-9A-Za-z]{1,6}$/,"")}catch{return s.replace(/\.[0-9A-Za-z]{1,6}$/,"")}}function He(n){return{videos:n.map(s=>ne(s)),pageUrl:window.location.href,pageTitle:document.title}}function pe(n,s){return n&&typeof n=="object"&&n.channel===de&&n.type===s&&typeof n.requestId=="string"}function We(){const n=document.querySelectorAll("iframe, frame"),s=[];return n.forEach(i=>{i!=null&&i.contentWindow&&s.push(i.contentWindow)}),s}function fe(n){const s={channel:de,type:Ie,requestId:n};We().forEach(i=>{try{i.postMessage(s,"*")}catch(l){b.debug("向子 frame 分发捕获请求失败",l)}})}function he(){return new dt().getAllVideos().map(i=>({...i,frameUrl:window.location.href,frameTitle:document.title||""}))}function me(n,s="",i=""){return!n||typeof n!="object"||!n.src?null:{...n,frameUrl:String(n.frameUrl||s||""),frameTitle:String(n.frameTitle||i||"")}}function _e(n,s){if(!n||s!=null&&s.supported&&(n==null?void 0:n.supported)===!1)return s;if((s==null?void 0:s.supported)===!1&&(n!=null&&n.supported))return n;const i=Number((n==null?void 0:n.duration)||0)+Number((n==null?void 0:n.width)||0)*Number((n==null?void 0:n.height)||0);return Number((s==null?void 0:s.duration)||0)+Number((s==null?void 0:s.width)||0)*Number((s==null?void 0:s.height)||0)>i?s:n}function je(n){const s=new Map;return n.forEach(i=>{const l=me(i);if(!l)return;const c=String(l.src||"").trim();if(!c)return;const S=s.get(c);s.set(c,_e(S,l))}),Array.from(s.values())}async function ge(n=yt){const s=`vd_capture_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,i=he(),l=[...i],c=A=>{const N=A==null?void 0:A.data;pe(N,Re)&&N.requestId===s&&Array.isArray(N.videos)&&N.videos.forEach(D=>{const T=me(D,N.frameUrl,N.frameTitle);T&&l.push(T)})};window.addEventListener("message",c);try{fe(s),await new Promise(A=>{window.setTimeout(A,n)})}finally{window.removeEventListener("message",c)}const S=je(l);return b.info("跨 frame 捕获完成",{localCount:i.length,totalCount:S.length,remoteCount:Math.max(0,S.length-i.length)}),S}function Ve(){window.addEventListener("message",n=>{const s=n==null?void 0:n.data;if(!pe(s,Ie))return;const i=s.requestId;if(u.has(i))return;u.add(i);let l=[];try{l=he()}catch(c){b.warn("子 frame 捕获视频失败",c)}fe(i);try{window.top.postMessage({channel:de,type:Re,requestId:i,frameUrl:window.location.href,frameTitle:document.title||"",videos:l},"*")}catch(c){b.warn("子 frame 回传捕获结果失败",c)}window.setTimeout(()=>{u.delete(i)},15e3)})}function Oe(n,s){document.addEventListener("keydown",async i=>{const l=String(i.key||"").toLowerCase();if(i.ctrlKey&&i.shiftKey&&l===wt){if(i.preventDefault(),!g)return;g=!1;const c=document.getElementById("vd-panel");(!c||c.style.display==="none"||c.style.display==="")&&Pe(),m(s,"正在跨 frame 捕获视频...");try{e=await ge(),n.render(e),m(s,`已捕获 ${e.length} 个视频资源`)}catch(S){b.error("快捷键捕获视频失败",S),m(s,`捕获失败: ${(S==null?void 0:S.message)||"未知错误"}`)}setTimeout(()=>{g=!0},500)}})}function Ye(n,s,i,l){if(!(!n||typeof n!="object")){if(n.event==="task.list"&&Array.isArray(n.tasks)){n.tasks.forEach(c=>R(c,i,l));return}n.task&&(R(n.task,i,l),n.event&&n.event.startsWith("task.")&&m(s,`后端状态: ${F(n.task.status)}`))}}async function be(n,s,i,l){w&&(w.close(),w=null),U(n,"disconnected","后端: 连接中"),w=f.connectTaskStream({onOpen:()=>{k=!0,U(n,"connected","后端: WebSocket 已连接"),E()},onMessage:c=>{Ye(c,s,i,l)},onClose:()=>{k=!1,U(n,"polling","后端: WebSocket 断开，切换轮询"),te(s,n,i,l)},onError:c=>{k=!1,U(n,"polling","后端: 连接异常，切换轮询"),b.warn("WebSocket 异常",c),te(s,n,i,l)}})}async function Xe(){var Ce,Le;b.info("videoDownloader 初始化开始",{logLevel:j.logLevel});const n=gt(),s=st(),i=n.querySelector(".vd-panel-note");if(s&&i){const v=ot(s);i.textContent=`支持直链视频与 m3u8 基础下载，当前来源策略：${v}`}nt({onToggle:rt}),le();const l=n.querySelector(".vd-video-grid"),c=n.querySelector("#vd-task-list"),S=n.querySelector("#vd-select-all"),A=n.querySelector("#vd-select-none"),N=n.querySelector("#vd-download"),D=n.querySelector("#vd-cleanup-parts"),T=n.querySelector("#vd-clear-storage"),J=n.querySelector("#vd-capture"),I=n.querySelector("#vd-reconnect"),z=n.querySelector("#vd-backend-status"),C=n.querySelector(".vd-status"),q=n.querySelector("#vd-downloaded-count");await L(q),f.setBaseUrl((Le=(Ce=j.videoDownloader)==null?void 0:Ce.backend)==null?void 0:Le.baseUrl,"");const ae=new ht({grid:l,onSelectionChange:v=>{t=v,Te()}});Oe(ae,C),J.addEventListener("click",async()=>{b.info("开始手动捕获视频"),m(C,"正在跨 frame 捕获视频...");try{e=await ge(),ae.render(e),m(C,`已捕获 ${e.length} 个视频资源`),b.info("手动捕获完成",{count:e.length})}catch(v){b.error("手动捕获失败",v),m(C,`捕获失败: ${(v==null?void 0:v.message)||"未知错误"}`)}}),S.addEventListener("click",()=>{ae.selectAll()}),A.addEventListener("click",()=>{ae.selectNone()}),T.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){o.length=0;try{await $e(ie,[]),y(q),m(C,"存储已清除"),b.info("视频脚本存储已清除")}catch(h){m(C,"清除存储失败"),b.error("清除视频脚本存储失败",h)}}}),D.addEventListener("click",async()=>{if(window.confirm("确认删除所有非当前下载中的 part 目录吗？"))try{const h=await f.cleanupPartDirs(),$=Number((h==null?void 0:h.deletedCount)||0)||0;m(C,`已清理 part 目录: ${$} 个`),b.info("已清理非运行中的 part 目录",{deletedCount:$,deletedDirs:(h==null?void 0:h.deletedDirs)||[],runningTaskIds:(h==null?void 0:h.runningTaskIds)||[]})}catch(h){b.error("清理 part 目录失败",h),m(C,`清理 part 目录失败: ${(h==null?void 0:h.message)||"未知错误"}`)}}),I.addEventListener("click",async()=>{await be(z,C,c,q);try{await G(c,q)}catch(v){b.warn("刷新任务列表失败",v)}}),c.addEventListener("click",async v=>{const h=v.target.closest("[data-action]");if(!h)return;const $=h.dataset.taskId;if(!$)return;const B=h.dataset.action;if(B==="open-task-dir"){try{const x=await f.openDirectory({taskId:$});m(C,(x==null?void 0:x.message)||"已请求后端打开目录")}catch(x){b.error("打开任务目录失败",x),m(C,`打开目录失败: ${(x==null?void 0:x.message)||"未知错误"}`)}return}if(B!=="cancel-task")return;const Q=h,W=Q.textContent;Q.disabled=!0,Q.textContent="取消中...",m(C,`任务 ${$} 正在取消...`);try{const x=await f.cancelTask($);m(C,`任务 ${$}: ${(x==null?void 0:x.message)||"已发送取消请求"}`);try{const Y=await f.getTask($);R(Y,c,q)}catch(Y){b.warn("刷新单任务状态失败",{taskId:$,error:Y})}try{await G(c,q)}catch(Y){b.warn("取消后刷新任务列表失败",Y)}}catch(x){b.error("取消任务失败",x),m(C,`取消任务失败: ${(x==null?void 0:x.message)||"未知错误"}`)}finally{const x=a.get($);(x?_.has(x.status):!1)||(Q.disabled=!1,Q.textContent=W)}}),N.addEventListener("click",async()=>{if(t.length===0){alert("请先选择要下载的视频");return}const v=t.filter(h=>(h==null?void 0:h.src)&&(h==null?void 0:h.supported)!==!1&&!String(h.src).startsWith("blob:"));if(v.length===0){alert("当前选中资源都不支持提交到后端，请至少选择一个可下载资源");return}b.info("提交后端视频任务",{count:v.length}),m(C,`正在提交任务（${v.length} 个）...`);try{let h=0;const $=[];for(const B of v){const Q=He([B]);try{const W=await f.createTask(Q),x=W==null?void 0:W.taskId;if(!x)throw new Error("后端未返回 taskId");const Y=await f.getTask(x);R(Y,c,q),h+=1,k||O(x,C,z,c,q)}catch(W){const x=String((B==null?void 0:B.fileName)||re((B==null?void 0:B.src)||"")||"未命名");$.push(`${x}: ${(W==null?void 0:W.message)||"未知错误"}`)}}if($.length===0)m(C,`任务已提交: ${h} 个`);else if(h>0)m(C,`部分提交失败（成功 ${h}，失败 ${$.length}）`),alert(`以下任务提交失败:
${$.join(`
`)}`);else throw new Error($.join("; "))}catch(h){b.error("任务提交失败",h),m(C,`任务提交失败: ${(h==null?void 0:h.message)||"未知错误"}`)}});function Te(){const v=t.length;N.disabled=v===0,N.textContent=v===0?"提交任务":`提交任务 (${v})`}await be(z,C,c,q);try{await G(c,q)}catch(v){b.warn("初始化任务列表失败",v),m(C,`后端暂不可用: ${(v==null?void 0:v.message)||"未知错误"}`),U(z,"polling","后端: 请求失败，轮询模式")}Te(),b.info("videoDownloader 初始化完成",{downloadedCount:o.length})}function ve(){Xe().catch(n=>{b.error("videoDownloader 初始化失败",n)})}if(Ve(),!r){b.debug("videoDownloader 已在子 frame 启用捕获桥接");return}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ve):ve()})();
