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

function F(r,e={},n="",o=""){const a=document.createElement(r);for(const[d,p]of Object.entries(e))if(d==="className")a.className=p;else if(d==="dataset")for(const[u,h]of Object.entries(p))a.dataset[u]=h;else d.startsWith("on")?a.addEventListener(d.slice(2).toLowerCase(),p):a.setAttribute(d,p);return n?a.innerHTML=n:o&&(a.textContent=o),a}function Qe(r){const e=F("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const _={logLevel:"info",storagePrefix:"userscript_",videoDownloader:{storageKeys:{downloadHistory:"videoDownloader_download_history"},backend:{baseUrl:"http://127.0.0.1:8787",wsUrl:"",requestTimeout:2e4,pollingInterval:2500}}};function Ze(r){return _.storagePrefix+r}const Ue={debug:0,info:1,warn:2,error:3};function ae(r,e,...n){const o=Ue[_.logLevel];if(Ue[r]<o)return;const a=`[${r.toUpperCase()}]`,d=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${a} [${d}]`,e,...n);break;case"warn":console.warn(`${a} [${d}]`,e,...n);break;case"error":console.error(`${a} [${d}]`,e,...n);break}}const g={debug:(r,...e)=>ae("debug",r,...e),info:(r,...e)=>ae("info",r,...e),warn:(r,...e)=>ae("warn",r,...e),error:(r,...e)=>ae("error",r,...e)};async function Ae(r,e){return new Promise(n=>{const o=JSON.stringify(e);GM_setValue(Ze(r),o),n()})}async function J(r,e={}){const{method:n="GET",headers:o={},body:a=null,dataType:d="json",responseType:p="",timeout:u=3e4}=e;return new Promise((h,k)=>{const S={method:n,url:r,headers:o,timeout:u,responseType:p,onload:m=>{if(m.status>=200&&m.status<300)try{let b;p==="blob"||p==="arraybuffer"?b=m.response:d==="text"?b=m.responseText:d==="json"?b=JSON.parse(m.responseText):b=m.responseText,h({data:b,status:m.status,headers:m.responseHeaders})}catch{h({data:m.responseText,status:m.status})}else{let b="";const N=String(m.responseText||"").trim();if(N)try{const A=JSON.parse(N);b=String((A==null?void 0:A.detail)||N)}catch{b=N}const v=b?`请求失败: ${m.status} - ${b}`:`请求失败: ${m.status}`;k(new Error(v))}},onerror:()=>k(new Error("网络请求失败")),ontimeout:()=>k(new Error("请求超时"))};a&&(S.data=typeof a=="string"?a:JSON.stringify(a),!S.headers["Content-Type"]&&!S.headers["content-type"]&&(S.headers["Content-Type"]="application/json")),GM_xmlhttpRequest(S)})}function le(r){const e="http://127.0.0.1:8787",n=String(r||"").trim()||e;try{const o=new URL(n);return o.pathname="",o.search="",o.hash="",o.toString().replace(/\/$/,"")}catch{return e}}function Me(r,e=""){if(e&&String(e).trim())return String(e).trim().replace(/\/$/,"");const n=le(r);return n.startsWith("https://")?n.replace("https://","wss://"):n.replace("http://","ws://")}class et{constructor(e={}){this.baseUrl=le(e.baseUrl),this.wsUrl=Me(this.baseUrl,e.wsUrl),this.timeout=e.timeout||2e4}setBaseUrl(e,n=""){this.baseUrl=le(e),this.wsUrl=Me(this.baseUrl,n)}getBaseUrl(){return this.baseUrl}getWsUrl(){return this.wsUrl}async createTask(e){return(await J(this.buildUrl("/api/video/tasks"),{method:"POST",body:e,timeout:this.timeout,dataType:"json"})).data}async getTask(e){return(await J(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}`),{method:"GET",timeout:this.timeout,dataType:"json"})).data}async listTasks(){var n;return((n=(await J(this.buildUrl("/api/video/tasks"),{method:"GET",timeout:this.timeout,dataType:"json"})).data)==null?void 0:n.tasks)||[]}async cancelTask(e){return(await J(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}/cancel`),{method:"POST",timeout:this.timeout,dataType:"json"})).data}async openDirectory({taskId:e="",path:n=""}={}){return(await J(this.buildUrl("/api/video/tasks/open-dir"),{method:"POST",body:{taskId:e,path:n},timeout:this.timeout,dataType:"json"})).data}async cleanupPartDirs(){return(await J(this.buildUrl("/api/video/tasks/cleanup-part-dirs"),{method:"POST",timeout:this.timeout,dataType:"json"})).data}connectTaskStream({taskId:e="",onOpen:n,onMessage:o,onClose:a,onError:d}){const u=`${this.getWsUrl()}/api/video/tasks/ws`,h=e?`?taskId=${encodeURIComponent(e)}`:"",k=`${u}${h}`;g.info("连接后端任务 WebSocket",{wsUrl:k});const S=new WebSocket(k);return S.onopen=()=>{n==null||n()},S.onmessage=m=>{try{const b=JSON.parse(m.data);o==null||o(b)}catch(b){g.warn("WebSocket 消息解析失败",b)}},S.onerror=m=>{d==null||d(m)},S.onclose=m=>{a==null||a(m)},{close(){try{S.close()}catch(m){g.warn("关闭 WebSocket 失败",m)}}}}buildUrl(e){return`${this.baseUrl}${e}`}}const tt=`/* 视频批量下载器样式 */

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

.vd-task-status.cancelling {
  color: #9a3412;
  background: #fef3c7;
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

.vd-task-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.vd-task-cancel.is-processing {
  border-color: #d97706;
  background: #fef3c7;
  color: #9a3412;
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
`;function Fe(r){const{target:e,handle:n=e,onClick:o,shouldStart:a,dragThreshold:d=4,clampToViewport:p=!0,dragClassName:u,bodyCursor:h="",removeTransformOnStart:k=!1,onDragStart:S,onDrag:m,onDragEnd:b}=r||{};if(!e||!n)return()=>{};let N=null,v=0,A=0,$=0,O=0,j=!1,H=!1;const Y=y=>{if(o){if(H){y.preventDefault(),y.stopPropagation(),H=!1;return}o(y)}},Q=y=>{if(y.pointerType==="mouse"&&y.button!==0||typeof a=="function"&&!a(y))return;const z=e.getBoundingClientRect();v=y.clientX,A=y.clientY,$=z.left,O=z.top,j=!1,N=y.pointerId,e.style.left=`${$}px`,e.style.top=`${O}px`,e.style.right="auto",e.style.bottom="auto",k&&(e.style.transform="none"),u&&e.classList.add(u),n.setPointerCapture(N),document.body.style.userSelect="none",h&&(document.body.style.cursor=h),typeof S=="function"&&S(y),y.preventDefault()},Z=y=>{if(y.pointerId!==N)return;const z=y.clientX-v,ee=y.clientY-A;if(!j&&Math.hypot(z,ee)>=d&&(j=!0,H=!0),!j)return;let K=$+z,G=O+ee;if(p){const te=Math.max(0,window.innerWidth-e.offsetWidth),se=Math.max(0,window.innerHeight-e.offsetHeight);K=Math.max(0,Math.min(K,te)),G=Math.max(0,Math.min(G,se))}e.style.left=`${K}px`,e.style.top=`${G}px`,typeof m=="function"&&m(y)},W=y=>{y.pointerId===N&&(n.hasPointerCapture(N)&&n.releasePointerCapture(N),N=null,u&&e.classList.remove(u),document.body.style.userSelect="",h&&(document.body.style.cursor=""),typeof b=="function"&&b(y))};return n.addEventListener("click",Y),n.addEventListener("pointerdown",Q),n.addEventListener("pointermove",Z),n.addEventListener("pointerup",W),n.addEventListener("pointercancel",W),()=>{n.removeEventListener("click",Y),n.removeEventListener("pointerdown",Q),n.removeEventListener("pointermove",Z),n.removeEventListener("pointerup",W),n.removeEventListener("pointercancel",W)}}const nt=30,rt=92;function De(r){if(!r)return;const e=r.getBoundingClientRect(),n=Math.max(1,window.innerWidth-e.width),o=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/n))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/o)))}function at(r){if(!r)return;const e=Number(r.dataset.ratioX),n=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(n))return;const o=Math.max(0,window.innerWidth-r.offsetWidth),a=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(o*e)}px`,r.style.top=`${Math.round(a*n)}px`,r.style.right="auto",r.style.bottom="auto"}function st(r){const e=F("div",{id:"vd-floating-btn",title:"视频批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${nt}px`,e.style.bottom=`${rt}px`,Fe({target:e,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{De(e)}}),requestAnimationFrame(()=>{De(e)}),window.addEventListener("resize",()=>{at(e)})}function He(){const r=document.getElementById("vd-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("vd-floating-btn");e&&e.classList.add("active")}function ue(){const r=document.getElementById("vd-panel");r&&(r.style.display="none");const e=document.getElementById("vd-floating-btn");e&&e.classList.remove("active")}function ot(){const r=document.getElementById("vd-panel");r&&(r.style.display==="none"||r.style.display===""?He():ue())}const pe=[{name:"default",displayName:"通用视频源",priority:0,urlPattern:/.*/i,pagePattern:/.*/i,enhance(r){return r}}];function it(r){const e=window.location.href;for(const n of pe)if(n.pagePattern.test(e))return n;return null}function dt(r){const e=it();return e?e.name:null}function ct(r){const e=pe.find(n=>n.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function lt(r){if(!r)return r;for(const e of pe)if(e.urlPattern.test(r))return e.enhance(r);return r}class ut{constructor(){this.videoExtensions=["mp4","webm","m4v","mov","mkv","avi","flv","m3u8","mpd"],this.dynamicScriptExtensions=["php","asp","aspx","jsp","cgi","do","action"],this.pageExtensions=["html","htm","shtml","xhtml"]}getAllVideos(){const e=[],n=new Set;return this.captureFromVideoElements(e,n),this.captureFromLinks(e,n),this.captureFromDataAttrs(e,n),e.filter(o=>this.isLikelyVideoUrl(o.src,o.captureSource))}captureFromVideoElements(e,n){document.querySelectorAll("video").forEach(a=>{const d=[];a.currentSrc&&d.push(a.currentSrc),a.src&&d.push(a.src),a.querySelectorAll("source").forEach(u=>{u.src&&d.push(u.src),u.getAttribute("src")&&d.push(u.getAttribute("src"))}),this.captureFromCandidates(d,{poster:a.poster||"",duration:Number.isFinite(a.duration)?Math.round(a.duration):0,width:a.videoWidth||a.clientWidth||0,height:a.videoHeight||a.clientHeight||0,title:a.getAttribute("title")||document.title||""},e,n,"video-element")})}captureFromLinks(e,n){document.querySelectorAll("a[href]").forEach(a=>{var p;const d=a.getAttribute("href");this.captureFromCandidates([d],{poster:"",duration:0,width:0,height:0,title:((p=a.textContent)==null?void 0:p.trim())||a.getAttribute("title")||document.title||""},e,n,"link")})}captureFromDataAttrs(e,n){const o=["[data-video-url]","[data-video]","[data-src]","[data-play-url]","[data-playurl]","[data-m3u8]","[data-stream-url]"];document.querySelectorAll(o.join(",")).forEach(d=>{const p=[d.getAttribute("data-video-url"),d.getAttribute("data-video"),d.getAttribute("data-src"),d.getAttribute("data-play-url"),d.getAttribute("data-playurl"),d.getAttribute("data-m3u8"),d.getAttribute("data-stream-url")];this.captureFromCandidates(p,{poster:d.getAttribute("poster")||"",duration:0,width:0,height:0,title:d.getAttribute("title")||document.title||""},e,n,"data-attr")})}captureFromCandidates(e,n,o,a,d="unknown"){e.map(p=>this.normalizeUrl(p)).filter(Boolean).forEach(p=>{if(a.has(p))return;a.add(p);const u=lt(p),h=this.detectMediaType(u);if(h==="ts"&&this.isLikelyHlsSegmentUrl(u))return;const k=h!=="blob"&&h!=="dash"&&h!=="dynamic";o.push({src:u,type:h,captureSource:d,mimeType:this.guessMimeType(u),duration:n.duration||0,width:n.width||0,height:n.height||0,poster:n.poster||"",title:n.title||"",supported:k,unsupportedReason:k?"":this.getUnsupportedReason(h)})})}normalizeUrl(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("data:"))return null;if(n.startsWith("blob:"))return n;if(n.startsWith("//"))return`${window.location.protocol}${n}`;try{return new URL(n,window.location.href).href.split("#")[0]}catch{return null}}getUrlMatchTarget(e){try{const n=new URL(e);return`${n.pathname||""}${n.search||""}`.toLowerCase()}catch{return String(e||"").toLowerCase()}}isLikelyVideoUrl(e,n="unknown"){if(!e)return!1;if(String(e).toLowerCase().startsWith("blob:"))return!0;const a=this.getUrlMatchTarget(e),d=this.extractExtension(a);if(d&&this.pageExtensions.includes(d))return!1;if(d&&this.videoExtensions.includes(d)||d&&this.dynamicScriptExtensions.includes(d)||a.includes(".m3u8")||a.includes(".mpd")||n==="video-element")return!0;const p=/(?:^|[/?#&=_-])(stream|playurl|m3u8|mpd)(?:[/?#&=_-]|$)/i;return n==="link"||n==="data-attr"||n==="unknown"?p.test(a):!1}detectMediaType(e){const n=(e||"").toLowerCase();if(n.startsWith("blob:"))return"blob";if(n.includes(".m3u8"))return"m3u8";if(n.includes(".mpd"))return"dash";const o=this.extractExtension(n);return o?this.dynamicScriptExtensions.includes(o)?"dynamic":o==="m3u8"?"m3u8":o==="mpd"?"dash":o:"video"}isLikelyHlsSegmentUrl(e){const n=(e||"").toLowerCase();return n.includes(".ts")?/\/(seg|segment|chunk|frag|media|part)[^/]*\d+[^/]*\.ts(\?|$)/i.test(n)||/[?&](seg|segment|chunk|frag|part|start|end)=/i.test(n)||/\/\d{1,6}\.ts(\?|$)/i.test(n):!1}extractExtension(e){const o=(e||"").split("?")[0].split(".");if(o.length<2)return"";const a=o[o.length-1].trim();return a.length>6?"":a}guessMimeType(e){const n=this.extractExtension((e||"").toLowerCase());return{mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/x-m4v",m3u8:"application/vnd.apple.mpegurl",ts:"video/mp2t",mkv:"video/x-matroska",avi:"video/x-msvideo",flv:"video/x-flv",mpd:"application/dash+xml"}[n]||"video/mp4"}getUnsupportedReason(e){return e==="blob"?"blob 资源无法直接提取源地址":e==="dash"?"dash/mpd 暂不支持":e==="dynamic"?"动态脚本地址（如 .php）暂不支持自动下载":"当前资源暂不支持"}}class pt{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((n,o)=>{const a=this.createResourceItem(n,o);this.grid.appendChild(a)}),this.onSelectionChange([])}toggle(e){const n=this.grid.querySelector(`[data-index="${e}"]`);if(!n)return;const o=this.resources[e];if(!this.isSelectable(o,e)){const a=this.getDisabledReason(o,e);n.title=a||"";return}this.selected.has(e)?(this.selected.delete(e),n.classList.remove(this.classNames.selected)):(this.selected.add(e),n.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,n)=>{this.isSelectable(e,n)&&this.selected.add(n)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,n){const o=F("div",{className:this.classNames.item,dataset:{index:n}});this.isSelectable(e,n)||(o.classList.add("unselectable"),o.title=this.getDisabledReason(e,n)||"",o.setAttribute("aria-disabled","true"));const a={toggle:()=>this.toggle(n),createElement:F,updateResource:h=>{if(!(!h||typeof h!="object")){if(this.resources[n]&&typeof this.resources[n]=="object"){Object.assign(this.resources[n],h);return}this.resources[n]={...h}}}},d=this.createThumbnail(e,n,a);d&&o.appendChild(d);const p=F("div",{className:this.classNames.checkbox,onClick:h=>{h.stopPropagation(),this.toggle(n)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),u=this.createInfo(e,n,a);return o.appendChild(p),u&&o.appendChild(u),o}defaultCreateThumbnail(e,n,o){const a=F("div",{className:this.classNames.thumb}),d=F("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${n+1}`,loading:"lazy"});return a.appendChild(d),a.addEventListener("click",()=>o.toggle()),a}defaultCreateInfo(e){const n=F("div",{className:this.classNames.info}),o=this.getFileName((e==null?void 0:e.src)||"");return n.appendChild(F("span",{},this.truncate(o,28))),n}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(n=>{const o=parseInt(n.dataset.index||"-1",10);this.selected.has(o)?n.classList.add(this.classNames.selected):n.classList.remove(this.classNames.selected)})}getFileName(e){var a;if(!e)return"未命名";const n=String(e).split("/"),o=((a=n[n.length-1])==null?void 0:a.split("?")[0])||"未命名";try{return decodeURIComponent(o)||"未命名"}catch{return o||"未命名"}}truncate(e,n){return!e||e.length<=n?e:e.slice(0,Math.max(0,n-3))+"..."}}function We(r){var o;if(!r)return"未命名";const e=String(r).split("/"),n=((o=e[e.length-1])==null?void 0:o.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}function ft(r){const e=String((r==null?void 0:r.fileName)||"").trim();return e||We((r==null?void 0:r.src)||"").replace(/\.[0-9A-Za-z]{1,6}$/,"")}function ht(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}function mt(r){const e=Number(r||0);if(!e||!Number.isFinite(e))return"--:--";const n=Math.floor(e/3600),o=Math.floor(e%3600/60),a=Math.floor(e%60);return n>0?`${String(n).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function gt(r){return r?r==="m3u8"?"HLS":r==="dash"?"DASH":r==="blob"?"BLOB":String(r).toUpperCase():"video"}function Ie(r){return(r==null?void 0:r.supported)!==!1}function Re(r){return`不可下载: ${String((r==null?void 0:r.unsupportedReason)||"").trim()||"当前资源暂不支持下载"}`}class bt extends pt{constructor(e){super({...e,emptyText:"未找到视频资源",classNames:{item:"vd-video-item",selected:"selected",empty:"vd-empty",thumb:"vd-video-thumb",checkbox:"vd-checkbox",info:"vd-video-info"},isSelectable:n=>Ie(n),getDisabledReason:n=>Re(n),createThumbnail:(n,o,a)=>{const d=a.createElement("div",{className:"vd-video-thumb"});if(n.poster){const u=a.createElement("img",{src:n.poster,alt:n.title||`视频 ${o+1}`,loading:"lazy",onerror:()=>{d.classList.add("vd-video-thumb-fallback")}});d.appendChild(u)}else if(n.type!=="m3u8"&&n.type!=="dash"&&n.type!=="blob"){const u=a.createElement("video",{src:n.src,preload:"metadata",muted:"muted",playsinline:"playsinline"});u.onloadedmetadata=()=>{const h=Number.isFinite(u.duration)?Math.round(u.duration):0;a.updateResource({duration:h,width:u.videoWidth||n.width||0,height:u.videoHeight||n.height||0})},u.onerror=()=>{d.classList.add("vd-video-thumb-fallback"),u.remove()},d.appendChild(u)}else d.classList.add("vd-video-thumb-fallback");const p=a.createElement("span",{className:"vd-play-badge"},"▶");return d.appendChild(p),d.addEventListener("click",()=>{a.toggle()}),d},createInfo:(n,o,a)=>{const d=a.createElement("div",{className:"vd-video-info"}),p=We(n.src),u=ft(n),h=`${gt(n.type)}  ·  ${mt(n.duration)}`,k=a.createElement("input",{className:"vd-filename-input",type:"text",value:u,placeholder:"自定义文件名",title:"下载文件名（无需扩展名）"});Ie(n)||(k.disabled=!0,k.title=Re(n));const S=()=>{const m=String(k.value||"").trim();a.updateResource({fileName:m||u})};return k.addEventListener("click",m=>{m.stopPropagation()}),k.addEventListener("input",S),k.addEventListener("change",S),d.appendChild(k),d.appendChild(a.createElement("span",{className:"vd-filename",title:n.src},ht(p,26))),d.appendChild(a.createElement("span",{className:"vd-meta"},h)),n.supported?n.type==="m3u8"&&d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-hls"},"m3u8")):d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-unsupported"},"暂不支持")),d}})}getSelectedVideos(){return this.getSelectedResources()}}function vt(r={}){const{target:e,handle:n=e,minWidth:o=300,minHeight:a=200,onResizeStart:d,onResize:p,onResizeEnd:u}=r;if(!e||!n)return()=>{};let h=!1,k=0,S=0,m=0,b=0;const N=$=>{$.preventDefault(),$.stopPropagation(),h=!0,k=$.clientX,S=$.clientY,m=e.offsetWidth,b=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",d==null||d($)},v=$=>{if(!h)return;const O=$.clientX-k,j=$.clientY-S,H=Math.max(o,m+O),Y=Math.max(a,b+j);e.style.width=`${H}px`,e.style.height=`${Y}px`,p==null||p($,{width:H,height:Y})},A=$=>{h&&(h=!1,document.body.style.userSelect="",document.body.style.cursor="",u==null||u($))};return n.addEventListener("mousedown",N),document.addEventListener("mousemove",v),document.addEventListener("mouseup",A),()=>{n.removeEventListener("mousedown",N),document.removeEventListener("mousemove",v),document.removeEventListener("mouseup",A)}}function wt(){const r=document.getElementById("vd-panel");if(r)return r;const e=F("div",{id:"vd-panel",className:"vd-panel"});return e.innerHTML=`
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
  `,document.body.appendChild(e),yt(e),xt(e),e.querySelector("#vd-close-btn").addEventListener("click",()=>{ue()}),e}function yt(r){const e=r.querySelector(".vd-panel-header");Fe({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:n=>!n.target.closest(".vd-panel-close")})}function xt(r){const e=r.querySelector(".vd-resize-handle");e&&vt({target:r,handle:e,minWidth:300,minHeight:200})}Qe(tt);const kt="v";var Be,Pe;const de=(Pe=(Be=_.videoDownloader)==null?void 0:Be.storageKeys)==null?void 0:Pe.downloadHistory,V=new Set(["success","failed","cancelled"]),ce="videoDownloader.frameCapture.v1",ze="capture-request",qe="capture-response",St=1200;(function(){var xe,ke,Se,Ee,Te,Ce;if(window.__videoDownloaderInitialized)return;window.__videoDownloaderInitialized=!0;const r=window.top===window.self;let e=[],n=[];const o=[],a=new Map,d=new Set,p=new Set,u=new Map,h=new Set;let k=!0,S=null,m=!1;const b=new et({baseUrl:(ke=(xe=_.videoDownloader)==null?void 0:xe.backend)==null?void 0:ke.baseUrl,wsUrl:(Ee=(Se=_.videoDownloader)==null?void 0:Se.backend)==null?void 0:Ee.wsUrl,timeout:(Ce=(Te=_.videoDownloader)==null?void 0:Te.backend)==null?void 0:Ce.requestTimeout});function N(t){t&&(t.textContent=`历史下载数: ${o.length}`)}function v(t,s){t&&(t.textContent=s)}function A(t,s,i){t&&(t.classList.remove("connected","disconnected","polling"),t.classList.add(s),t.textContent=i)}function $(t){return t&&typeof t=="object"&&typeof t.url=="string"&&t.url?{url:t.url,downloadedAt:typeof t.downloadedAt=="string"?t.downloadedAt:null}:null}async function O(t){try{const s=await getItem(de,[]);Array.isArray(s)&&s.forEach(i=>{const l=$(i);l&&o.push(l)}),N(t),g.info("已加载视频下载历史",{count:o.length})}catch(s){g.error("读取视频下载历史失败",s),N(t)}}async function j(){try{await Ae(de,o),g.debug("视频下载历史已保存",{count:o.length})}catch(t){g.error("保存视频下载历史失败",t)}}function H(t){switch(t){case"queued":return"排队中";case"running":return"执行中";case"cancelling":return"取消中";case"success":return"已完成";case"failed":return"有失败";case"cancelled":return"已取消";default:return t||"未知"}}function Y(t){if(!t)return"等待后端更新状态";if(t.status==="cancelling"||t.cancelRequested)return t.message||"正在停止下载并清理临时文件...";const s=String(t.progressText||"").trim();return t.status==="running"&&s?s:V.has(t.status)?t.message||"任务已结束":s||"等待后端进度输出..."}function Q(t){return!t||!t.id?!1:d.has(t.id)||t.status==="cancelling"||!!t.cancelRequested}function Z(t,s){if(!t||!V.has(t.status)||p.has(t.id))return;const i=(t.items||[]).filter(c=>c.status==="success");if(i.length===0){p.add(t.id);return}const l=new Date().toISOString();i.forEach(c=>{c.src&&o.push({url:c.src,downloadedAt:l})}),p.add(t.id),N(s),j()}function W(t){if(!t)return;t.innerHTML="";const s=Array.from(a.values()).map((i,l)=>({task:i,index:l})).sort((i,l)=>{const c=Date.parse(i.task.createdAt||0)||0,E=Date.parse(l.task.createdAt||0)||0;return E!==c?E-c:i.index-l.index}).map(({task:i})=>i);if(s.length===0){const i=document.createElement("div");i.className="vd-task-empty",i.textContent="暂无任务，选择视频后点击「提交任务」",t.appendChild(i);return}s.forEach(i=>{const l=document.createElement("div");l.className="vd-task-item";const c=document.createElement("div");c.className="vd-task-row";const E=document.createElement("span");E.className="vd-task-id",E.textContent=String(i.id||"-");const M=document.createElement("span");M.className=`vd-task-status ${i.status||"queued"}`,M.textContent=H(i.status),c.appendChild(E),c.appendChild(M),l.appendChild(c);const U=document.createElement("div");U.className="vd-task-message",U.textContent=Y(i),l.appendChild(U);const I=document.createElement("div");I.className="vd-task-row";const T=document.createElement("span");T.className="vd-task-id",T.textContent=`目录: ${i.outputDir||"-"}`;const X=document.createElement("div");X.className="vd-task-actions";const R=document.createElement("button");if(R.className="vd-task-open",R.dataset.action="open-task-dir",R.dataset.taskId=i.id,R.textContent="打开目录",X.appendChild(R),!V.has(i.status)){const D=document.createElement("button");D.className="vd-task-cancel",D.dataset.action="cancel-task",D.dataset.taskId=i.id,Q(i)?(D.disabled=!0,D.classList.add("is-processing"),D.textContent="取消执行中..."):D.textContent="取消任务",X.appendChild(D)}I.appendChild(T),I.appendChild(X),l.appendChild(I),t.appendChild(l)})}function y(t,s,i){!t||!t.id||(a.set(t.id,t),d.delete(t.id),V.has(t.status)&&z(t.id),Z(t,i),W(s))}function z(t){const s=u.get(t);s&&(clearInterval(s),u.delete(t))}function ee(){u.forEach(t=>clearInterval(t)),u.clear()}function K(t,s,i,l,c){var U,I;if(!t||u.has(t))return;const E=(I=(U=_.videoDownloader)==null?void 0:U.backend)==null?void 0:I.pollingInterval,M=setInterval(async()=>{try{const T=await b.getTask(t);y(T,l,c),V.has(T.status)&&z(t)}catch(T){if(String((T==null?void 0:T.message)||"").includes("请求失败: 404")){z(t);const R=a.get(t);R&&!V.has(R.status)&&y({...R,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()},l,c),g.warn("任务不存在，停止轮询",{taskId:t});return}A(i,"polling","后端: 轮询中"),g.warn("轮询任务状态失败",{taskId:t,error:(T==null?void 0:T.message)||T}),v(s,`任务轮询失败: ${(T==null?void 0:T.message)||"未知错误"}`)}},E);u.set(t,M)}function G(t,s,i,l){a.forEach(c=>{V.has(c.status)||K(c.id,t,s,i,l)})}async function te(t,s){const i=await b.listTasks(),l=new Set(i.map(c=>c.id).filter(Boolean));Array.from(a.keys()).forEach(c=>{if(l.has(c))return;z(c);const E=a.get(c);E&&!V.has(E.status)&&(d.delete(c),a.set(c,{...E,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()}))}),i.forEach(c=>y(c,t,s)),W(t)}function se(t){const s=fe((t==null?void 0:t.src)||""),i=String((t==null?void 0:t.fileName)||"").trim();return{src:t.src,type:t.type||"unknown",title:t.title||"",duration:Number(t.duration||0)||0,mimeType:t.mimeType||"",fileName:i||s,requestHeaders:_e()}}function _e(){var c;const t={},s=String((navigator==null?void 0:navigator.userAgent)||"").trim(),i=String(((c=window==null?void 0:window.location)==null?void 0:c.href)||"").trim(),l=String((document==null?void 0:document.cookie)||"").trim();return s&&(t["User-Agent"]=s),i&&(t.Referer=i),l&&(t.Cookie=l),t}function fe(t){var i;const s=((i=String(t||"").split("/").pop())==null?void 0:i.split("?")[0])||"";if(!s)return"";try{return decodeURIComponent(s).replace(/\.[0-9A-Za-z]{1,6}$/,"")}catch{return s.replace(/\.[0-9A-Za-z]{1,6}$/,"")}}function je(t){return{videos:t.map(s=>se(s)),pageUrl:window.location.href,pageTitle:document.title}}function he(t,s){return t&&typeof t=="object"&&t.channel===ce&&t.type===s&&typeof t.requestId=="string"}function Ve(){const t=document.querySelectorAll("iframe, frame"),s=[];return t.forEach(i=>{i!=null&&i.contentWindow&&s.push(i.contentWindow)}),s}function me(t){const s={channel:ce,type:ze,requestId:t};Ve().forEach(i=>{try{i.postMessage(s,"*")}catch(l){g.debug("向子 frame 分发捕获请求失败",l)}})}function ge(){return new ut().getAllVideos().map(i=>({...i,frameUrl:window.location.href,frameTitle:document.title||""}))}function be(t,s="",i=""){return!t||typeof t!="object"||!t.src?null:{...t,frameUrl:String(t.frameUrl||s||""),frameTitle:String(t.frameTitle||i||"")}}function Oe(t,s){if(!t||s!=null&&s.supported&&(t==null?void 0:t.supported)===!1)return s;if((s==null?void 0:s.supported)===!1&&(t!=null&&t.supported))return t;const i=Number((t==null?void 0:t.duration)||0)+Number((t==null?void 0:t.width)||0)*Number((t==null?void 0:t.height)||0);return Number((s==null?void 0:s.duration)||0)+Number((s==null?void 0:s.width)||0)*Number((s==null?void 0:s.height)||0)>i?s:t}function Ye(t){const s=new Map;return t.forEach(i=>{const l=be(i);if(!l)return;const c=String(l.src||"").trim();if(!c)return;const E=s.get(c);s.set(c,Oe(E,l))}),Array.from(s.values())}async function ve(t=St){const s=`vd_capture_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,i=ge(),l=[...i],c=M=>{const U=M==null?void 0:M.data;he(U,qe)&&U.requestId===s&&Array.isArray(U.videos)&&U.videos.forEach(I=>{const T=be(I,U.frameUrl,U.frameTitle);T&&l.push(T)})};window.addEventListener("message",c);try{me(s),await new Promise(M=>{window.setTimeout(M,t)})}finally{window.removeEventListener("message",c)}const E=Ye(l);return g.info("跨 frame 捕获完成",{localCount:i.length,totalCount:E.length,remoteCount:Math.max(0,E.length-i.length)}),E}function Xe(){window.addEventListener("message",t=>{const s=t==null?void 0:t.data;if(!he(s,ze))return;const i=s.requestId;if(h.has(i))return;h.add(i);let l=[];try{l=ge()}catch(c){g.warn("子 frame 捕获视频失败",c)}me(i);try{window.top.postMessage({channel:ce,type:qe,requestId:i,frameUrl:window.location.href,frameTitle:document.title||"",videos:l},"*")}catch(c){g.warn("子 frame 回传捕获结果失败",c)}window.setTimeout(()=>{h.delete(i)},15e3)})}function Ke(t,s){document.addEventListener("keydown",async i=>{const l=String(i.key||"").toLowerCase();if(i.ctrlKey&&i.shiftKey&&l===kt){if(i.preventDefault(),!k)return;k=!1;const c=document.getElementById("vd-panel");(!c||c.style.display==="none"||c.style.display==="")&&He(),v(s,"正在跨 frame 捕获视频...");try{e=await ve(),t.render(e),v(s,`已捕获 ${e.length} 个视频资源`)}catch(E){g.error("快捷键捕获视频失败",E),v(s,`捕获失败: ${(E==null?void 0:E.message)||"未知错误"}`)}setTimeout(()=>{k=!0},500)}})}function Ge(t,s,i,l){if(!(!t||typeof t!="object")){if(t.event==="task.list"&&Array.isArray(t.tasks)){t.tasks.forEach(c=>y(c,i,l));return}t.task&&(y(t.task,i,l),t.event&&t.event.startsWith("task.")&&v(s,`后端状态: ${H(t.task.status)}`))}}async function we(t,s,i,l){S&&(S.close(),S=null),A(t,"disconnected","后端: 连接中"),S=b.connectTaskStream({onOpen:()=>{m=!0,A(t,"connected","后端: WebSocket 已连接"),ee()},onMessage:c=>{Ge(c,s,i,l)},onClose:()=>{m=!1,A(t,"polling","后端: WebSocket 断开，切换轮询"),G(s,t,i,l)},onError:c=>{m=!1,A(t,"polling","后端: 连接异常，切换轮询"),g.warn("WebSocket 异常",c),G(s,t,i,l)}})}async function Je(){var Ne,$e;g.info("videoDownloader 初始化开始",{logLevel:_.logLevel});const t=wt(),s=dt(),i=t.querySelector(".vd-panel-note");if(s&&i){const x=ct(s);i.textContent=`支持直链视频与 m3u8 基础下载，当前来源策略：${x}`}st({onToggle:ot}),ue();const l=t.querySelector(".vd-video-grid"),c=t.querySelector("#vd-task-list"),E=t.querySelector("#vd-select-all"),M=t.querySelector("#vd-select-none"),U=t.querySelector("#vd-download"),I=t.querySelector("#vd-cleanup-parts"),T=t.querySelector("#vd-clear-storage"),X=t.querySelector("#vd-capture"),R=t.querySelector("#vd-reconnect"),D=t.querySelector("#vd-backend-status"),C=t.querySelector(".vd-status"),q=t.querySelector("#vd-downloaded-count");await O(q),b.setBaseUrl(($e=(Ne=_.videoDownloader)==null?void 0:Ne.backend)==null?void 0:$e.baseUrl,"");const ne=new bt({grid:l,onSelectionChange:x=>{n=x,Le()}});Ke(ne,C),X.addEventListener("click",async()=>{g.info("开始手动捕获视频"),v(C,"正在跨 frame 捕获视频...");try{e=await ve(),ne.render(e),v(C,`已捕获 ${e.length} 个视频资源`),g.info("手动捕获完成",{count:e.length})}catch(x){g.error("手动捕获失败",x),v(C,`捕获失败: ${(x==null?void 0:x.message)||"未知错误"}`)}}),E.addEventListener("click",()=>{ne.selectAll()}),M.addEventListener("click",()=>{ne.selectNone()}),T.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){o.length=0;try{await Ae(de,[]),N(q),v(C,"存储已清除"),g.info("视频脚本存储已清除")}catch(f){v(C,"清除存储失败"),g.error("清除视频脚本存储失败",f)}}}),I.addEventListener("click",async()=>{if(window.confirm("确认删除所有非当前下载中的 part 目录吗？"))try{const f=await b.cleanupPartDirs(),L=Number((f==null?void 0:f.deletedCount)||0)||0;v(C,`已清理 part 目录: ${L} 个`),g.info("已清理非运行中的 part 目录",{deletedCount:L,deletedDirs:(f==null?void 0:f.deletedDirs)||[],runningTaskIds:(f==null?void 0:f.runningTaskIds)||[]})}catch(f){g.error("清理 part 目录失败",f),v(C,`清理 part 目录失败: ${(f==null?void 0:f.message)||"未知错误"}`)}}),R.addEventListener("click",async()=>{await we(D,C,c,q);try{await te(c,q)}catch(x){g.warn("刷新任务列表失败",x)}}),c.addEventListener("click",async x=>{const f=x.target.closest("[data-action]");if(!f)return;const L=f.dataset.taskId;if(!L)return;const B=f.dataset.action;if(B==="open-task-dir"){try{const w=await b.openDirectory({taskId:L});v(C,(w==null?void 0:w.message)||"已请求后端打开目录")}catch(w){g.error("打开任务目录失败",w),v(C,`打开目录失败: ${(w==null?void 0:w.message)||"未知错误"}`)}return}if(B!=="cancel-task")return;const re=a.get(L);if(re&&Q(re)){v(C,`任务 ${L} 的取消正在执行中，请稍候`);return}d.add(L),W(c),v(C,`任务 ${L} 正在取消...`);try{const w=await b.cancelTask(L),oe=!!(w!=null&&w.cancelled)||(w==null?void 0:w.status)==="cancelled"?"任务已取消":"取消请求已发送，等待后端完成";if(v(C,`任务 ${L}: ${(w==null?void 0:w.message)||oe}`),!m)try{const ie=await b.getTask(L);y(ie,c,q)}catch(ie){g.warn("取消后刷新单任务状态失败",{taskId:L,error:ie})}}catch(w){g.error("取消任务失败",w),v(C,`取消任务失败: ${(w==null?void 0:w.message)||"未知错误"}`);try{const P=await b.getTask(L);y(P,c,q)}catch(P){g.warn("取消失败后刷新单任务状态失败",{taskId:L,error:P})}}finally{d.delete(L),W(c)}}),U.addEventListener("click",async()=>{if(n.length===0){alert("请先选择要下载的视频");return}const x=n.filter(f=>(f==null?void 0:f.src)&&(f==null?void 0:f.supported)!==!1&&!String(f.src).startsWith("blob:"));if(x.length===0){alert("当前选中资源都不支持提交到后端，请至少选择一个可下载资源");return}g.info("提交后端视频任务",{count:x.length}),v(C,`正在提交任务（${x.length} 个）...`);try{let f=0;const L=[];for(const B of x){const re=je([B]);try{const w=await b.createTask(re),P=w==null?void 0:w.taskId;if(!P)throw new Error("后端未返回 taskId");const oe=await b.getTask(P);y(oe,c,q),f+=1,m||K(P,C,D,c,q)}catch(w){const P=String((B==null?void 0:B.fileName)||fe((B==null?void 0:B.src)||"")||"未命名");L.push(`${P}: ${(w==null?void 0:w.message)||"未知错误"}`)}}if(L.length===0)v(C,`任务已提交: ${f} 个`);else if(f>0)v(C,`部分提交失败（成功 ${f}，失败 ${L.length}）`),alert(`以下任务提交失败:
${L.join(`
`)}`);else throw new Error(L.join("; "))}catch(f){g.error("任务提交失败",f),v(C,`任务提交失败: ${(f==null?void 0:f.message)||"未知错误"}`)}});function Le(){const x=n.length;U.disabled=x===0,U.textContent=x===0?"提交任务":`提交任务 (${x})`}await we(D,C,c,q);try{await te(c,q)}catch(x){g.warn("初始化任务列表失败",x),v(C,`后端暂不可用: ${(x==null?void 0:x.message)||"未知错误"}`),A(D,"polling","后端: 请求失败，轮询模式")}Le(),g.info("videoDownloader 初始化完成",{downloadedCount:o.length})}function ye(){Je().catch(t=>{g.error("videoDownloader 初始化失败",t)})}if(Xe(),!r){g.debug("videoDownloader 已在子 frame 启用捕获桥接");return}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ye):ye()})();
