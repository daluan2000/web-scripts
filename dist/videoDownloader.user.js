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

function B(r,e={},n="",o=""){const a=document.createElement(r);for(const[d,p]of Object.entries(e))if(d==="className")a.className=p;else if(d==="dataset")for(const[l,h]of Object.entries(p))a.dataset[l]=h;else d.startsWith("on")?a.addEventListener(d.slice(2).toLowerCase(),p):a.setAttribute(d,p);return n?a.innerHTML=n:o&&(a.textContent=o),a}function Qe(r){const e=B("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const W={logLevel:"info",storagePrefix:"userscript_",videoDownloader:{storageKeys:{downloadHistory:"videoDownloader_download_history"},backend:{baseUrl:"http://127.0.0.1:8787",wsUrl:"",requestTimeout:2e4,pollingInterval:2500}}};function Ze(r){return W.storagePrefix+r}const $e={debug:0,info:1,warn:2,error:3};function ae(r,e,...n){const o=$e[W.logLevel];if($e[r]<o)return;const a=`[${r.toUpperCase()}]`,d=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${a} [${d}]`,e,...n);break;case"warn":console.warn(`${a} [${d}]`,e,...n);break;case"error":console.error(`${a} [${d}]`,e,...n);break}}const g={debug:(r,...e)=>ae("debug",r,...e),info:(r,...e)=>ae("info",r,...e),warn:(r,...e)=>ae("warn",r,...e),error:(r,...e)=>ae("error",r,...e)};async function Ue(r,e){return new Promise(n=>{const o=JSON.stringify(e);GM_setValue(Ze(r),o),n()})}async function G(r,e={}){const{method:n="GET",headers:o={},body:a=null,dataType:d="json",responseType:p="",timeout:l=3e4}=e;return new Promise((h,S)=>{const E={method:n,url:r,headers:o,timeout:l,responseType:p,onload:m=>{if(m.status>=200&&m.status<300)try{let b;p==="blob"||p==="arraybuffer"?b=m.response:d==="text"?b=m.responseText:d==="json"?b=JSON.parse(m.responseText):b=m.responseText,h({data:b,status:m.status,headers:m.responseHeaders})}catch{h({data:m.responseText,status:m.status})}else{let b="";const N=String(m.responseText||"").trim();if(N)try{const M=JSON.parse(N);b=String((M==null?void 0:M.detail)||N)}catch{b=N}const v=b?`请求失败: ${m.status} - ${b}`:`请求失败: ${m.status}`;S(new Error(v))}},onerror:()=>S(new Error("网络请求失败")),ontimeout:()=>S(new Error("请求超时"))};a&&(E.data=typeof a=="string"?a:JSON.stringify(a),!E.headers["Content-Type"]&&!E.headers["content-type"]&&(E.headers["Content-Type"]="application/json")),GM_xmlhttpRequest(E)})}function ce(r){const e="http://127.0.0.1:8787",n=String(r||"").trim()||e;try{const o=new URL(n);return o.pathname="",o.search="",o.hash="",o.toString().replace(/\/$/,"")}catch{return e}}function Ae(r,e=""){if(e&&String(e).trim())return String(e).trim().replace(/\/$/,"");const n=ce(r);return n.startsWith("https://")?n.replace("https://","wss://"):n.replace("http://","ws://")}class et{constructor(e={}){this.baseUrl=ce(e.baseUrl),this.wsUrl=Ae(this.baseUrl,e.wsUrl),this.timeout=e.timeout||2e4}setBaseUrl(e,n=""){this.baseUrl=ce(e),this.wsUrl=Ae(this.baseUrl,n)}getBaseUrl(){return this.baseUrl}getWsUrl(){return this.wsUrl}async createTask(e){return(await G(this.buildUrl("/api/video/tasks"),{method:"POST",body:e,timeout:this.timeout,dataType:"json"})).data}async getTask(e){return(await G(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}`),{method:"GET",timeout:this.timeout,dataType:"json"})).data}async listTasks(){var n;return((n=(await G(this.buildUrl("/api/video/tasks"),{method:"GET",timeout:this.timeout,dataType:"json"})).data)==null?void 0:n.tasks)||[]}async cancelTask(e){return(await G(this.buildUrl(`/api/video/tasks/${encodeURIComponent(e)}/cancel`),{method:"POST",timeout:this.timeout,dataType:"json"})).data}async openDirectory({taskId:e="",path:n=""}={}){return(await G(this.buildUrl("/api/video/tasks/open-dir"),{method:"POST",body:{taskId:e,path:n},timeout:this.timeout,dataType:"json"})).data}async cleanupPartDirs(){return(await G(this.buildUrl("/api/video/tasks/cleanup-part-dirs"),{method:"POST",timeout:this.timeout,dataType:"json"})).data}connectTaskStream({taskId:e="",onOpen:n,onMessage:o,onClose:a,onError:d}){const l=`${this.getWsUrl()}/api/video/tasks/ws`,h=e?`?taskId=${encodeURIComponent(e)}`:"",S=`${l}${h}`;g.info("连接后端任务 WebSocket",{wsUrl:S});const E=new WebSocket(S);return E.onopen=()=>{n==null||n()},E.onmessage=m=>{try{const b=JSON.parse(m.data);o==null||o(b)}catch(b){g.warn("WebSocket 消息解析失败",b)}},E.onerror=m=>{d==null||d(m)},E.onclose=m=>{a==null||a(m)},{close(){try{E.close()}catch(m){g.warn("关闭 WebSocket 失败",m)}}}}buildUrl(e){return`${this.baseUrl}${e}`}}const tt=`/* 视频批量下载器样式 */

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
`;function Be(r){const{target:e,handle:n=e,onClick:o,shouldStart:a,dragThreshold:d=4,clampToViewport:p=!0,dragClassName:l,bodyCursor:h="",removeTransformOnStart:S=!1,onDragStart:E,onDrag:m,onDragEnd:b}=r||{};if(!e||!n)return()=>{};let N=null,v=0,M=0,$=0,O=0,_=!1,F=!1;const Y=k=>{if(o){if(F){k.preventDefault(),k.stopPropagation(),F=!1;return}o(k)}},J=k=>{if(k.pointerType==="mouse"&&k.button!==0||typeof a=="function"&&!a(k))return;const z=e.getBoundingClientRect();v=k.clientX,M=k.clientY,$=z.left,O=z.top,_=!1,N=k.pointerId,e.style.left=`${$}px`,e.style.top=`${O}px`,e.style.right="auto",e.style.bottom="auto",S&&(e.style.transform="none"),l&&e.classList.add(l),n.setPointerCapture(N),document.body.style.userSelect="none",h&&(document.body.style.cursor=h),typeof E=="function"&&E(k),k.preventDefault()},Z=k=>{if(k.pointerId!==N)return;const z=k.clientX-v,ee=k.clientY-M;if(!_&&Math.hypot(z,ee)>=d&&(_=!0,F=!0),!_)return;let j=$+z,Q=O+ee;if(p){const te=Math.max(0,window.innerWidth-e.offsetWidth),se=Math.max(0,window.innerHeight-e.offsetHeight);j=Math.max(0,Math.min(j,te)),Q=Math.max(0,Math.min(Q,se))}e.style.left=`${j}px`,e.style.top=`${Q}px`,typeof m=="function"&&m(k)},H=k=>{k.pointerId===N&&(n.hasPointerCapture(N)&&n.releasePointerCapture(N),N=null,l&&e.classList.remove(l),document.body.style.userSelect="",h&&(document.body.style.cursor=""),typeof b=="function"&&b(k))};return n.addEventListener("click",Y),n.addEventListener("pointerdown",J),n.addEventListener("pointermove",Z),n.addEventListener("pointerup",H),n.addEventListener("pointercancel",H),()=>{n.removeEventListener("click",Y),n.removeEventListener("pointerdown",J),n.removeEventListener("pointermove",Z),n.removeEventListener("pointerup",H),n.removeEventListener("pointercancel",H)}}const nt=30,rt=92;function Me(r){if(!r)return;const e=r.getBoundingClientRect(),n=Math.max(1,window.innerWidth-e.width),o=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/n))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/o)))}function at(r){if(!r)return;const e=Number(r.dataset.ratioX),n=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(n))return;const o=Math.max(0,window.innerWidth-r.offsetWidth),a=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(o*e)}px`,r.style.top=`${Math.round(a*n)}px`,r.style.right="auto",r.style.bottom="auto"}function st(r){const e=B("div",{id:"vd-floating-btn",title:"视频批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${nt}px`,e.style.bottom=`${rt}px`,Be({target:e,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{Me(e)}}),requestAnimationFrame(()=>{Me(e)}),window.addEventListener("resize",()=>{at(e)})}function Fe(){const r=document.getElementById("vd-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("vd-floating-btn");e&&e.classList.add("active")}function le(){const r=document.getElementById("vd-panel");r&&(r.style.display="none");const e=document.getElementById("vd-floating-btn");e&&e.classList.remove("active")}function ot(){const r=document.getElementById("vd-panel");r&&(r.style.display==="none"||r.style.display===""?Fe():le())}const ue=[{name:"default",displayName:"通用视频源",priority:0,urlPattern:/.*/i,pagePattern:/.*/i,enhance(r){return r}}];function it(r){const e=window.location.href;for(const n of ue)if(n.pagePattern.test(e))return n;return null}function dt(r){const e=it();return e?e.name:null}function ct(r){const e=ue.find(n=>n.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function lt(r){if(!r)return r;for(const e of ue)if(e.urlPattern.test(r))return e.enhance(r);return r}class ut{constructor(){this.videoExtensions=["mp4","webm","m4v","mov","mkv","avi","flv","m3u8","mpd"],this.dynamicScriptExtensions=["php","asp","aspx","jsp","cgi","do","action"],this.pageExtensions=["html","htm","shtml","xhtml"]}getAllVideos(){const e=[],n=new Set;return this.captureFromVideoElements(e,n),this.captureFromLinks(e,n),this.captureFromDataAttrs(e,n),e.filter(o=>this.isLikelyVideoUrl(o.src,o.captureSource))}captureFromVideoElements(e,n){document.querySelectorAll("video").forEach(a=>{const d=[];a.currentSrc&&d.push(a.currentSrc),a.src&&d.push(a.src),a.querySelectorAll("source").forEach(l=>{l.src&&d.push(l.src),l.getAttribute("src")&&d.push(l.getAttribute("src"))}),this.captureFromCandidates(d,{poster:a.poster||"",duration:Number.isFinite(a.duration)?Math.round(a.duration):0,width:a.videoWidth||a.clientWidth||0,height:a.videoHeight||a.clientHeight||0,title:a.getAttribute("title")||document.title||""},e,n,"video-element")})}captureFromLinks(e,n){document.querySelectorAll("a[href]").forEach(a=>{var p;const d=a.getAttribute("href");this.captureFromCandidates([d],{poster:"",duration:0,width:0,height:0,title:((p=a.textContent)==null?void 0:p.trim())||a.getAttribute("title")||document.title||""},e,n,"link")})}captureFromDataAttrs(e,n){const o=["[data-video-url]","[data-video]","[data-src]","[data-play-url]","[data-playurl]","[data-m3u8]","[data-stream-url]"];document.querySelectorAll(o.join(",")).forEach(d=>{const p=[d.getAttribute("data-video-url"),d.getAttribute("data-video"),d.getAttribute("data-src"),d.getAttribute("data-play-url"),d.getAttribute("data-playurl"),d.getAttribute("data-m3u8"),d.getAttribute("data-stream-url")];this.captureFromCandidates(p,{poster:d.getAttribute("poster")||"",duration:0,width:0,height:0,title:d.getAttribute("title")||document.title||""},e,n,"data-attr")})}captureFromCandidates(e,n,o,a,d="unknown"){e.map(p=>this.normalizeUrl(p)).filter(Boolean).forEach(p=>{if(a.has(p))return;a.add(p);const l=lt(p),h=this.detectMediaType(l);if(h==="ts"&&this.isLikelyHlsSegmentUrl(l))return;const S=h!=="blob"&&h!=="dash"&&h!=="dynamic";o.push({src:l,type:h,captureSource:d,mimeType:this.guessMimeType(l),duration:n.duration||0,width:n.width||0,height:n.height||0,poster:n.poster||"",title:n.title||"",supported:S,unsupportedReason:S?"":this.getUnsupportedReason(h)})})}normalizeUrl(e){if(!e||typeof e!="string")return null;const n=e.trim();if(!n||n.startsWith("data:"))return null;if(n.startsWith("blob:"))return n;if(n.startsWith("//"))return`${window.location.protocol}${n}`;try{return new URL(n,window.location.href).href.split("#")[0]}catch{return null}}getUrlMatchTarget(e){try{const n=new URL(e);return`${n.pathname||""}${n.search||""}`.toLowerCase()}catch{return String(e||"").toLowerCase()}}isLikelyVideoUrl(e,n="unknown"){if(!e)return!1;if(String(e).toLowerCase().startsWith("blob:"))return!0;const a=this.getUrlMatchTarget(e),d=this.extractExtension(a);if(d&&this.pageExtensions.includes(d))return!1;if(d&&this.videoExtensions.includes(d)||d&&this.dynamicScriptExtensions.includes(d)||a.includes(".m3u8")||a.includes(".mpd")||n==="video-element")return!0;const p=/(?:^|[/?#&=_-])(stream|playurl|m3u8|mpd)(?:[/?#&=_-]|$)/i;return n==="link"||n==="data-attr"||n==="unknown"?p.test(a):!1}detectMediaType(e){const n=(e||"").toLowerCase();if(n.startsWith("blob:"))return"blob";if(n.includes(".m3u8"))return"m3u8";if(n.includes(".mpd"))return"dash";const o=this.extractExtension(n);return o?this.dynamicScriptExtensions.includes(o)?"dynamic":o==="m3u8"?"m3u8":o==="mpd"?"dash":o:"video"}isLikelyHlsSegmentUrl(e){const n=(e||"").toLowerCase();return n.includes(".ts")?/\/(seg|segment|chunk|frag|media|part)[^/]*\d+[^/]*\.ts(\?|$)/i.test(n)||/[?&](seg|segment|chunk|frag|part|start|end)=/i.test(n)||/\/\d{1,6}\.ts(\?|$)/i.test(n):!1}extractExtension(e){const o=(e||"").split("?")[0].split(".");if(o.length<2)return"";const a=o[o.length-1].trim();return a.length>6?"":a}guessMimeType(e){const n=this.extractExtension((e||"").toLowerCase());return{mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/x-m4v",m3u8:"application/vnd.apple.mpegurl",ts:"video/mp2t",mkv:"video/x-matroska",avi:"video/x-msvideo",flv:"video/x-flv",mpd:"application/dash+xml"}[n]||"video/mp4"}getUnsupportedReason(e){return e==="blob"?"blob 资源无法直接提取源地址":e==="dash"?"dash/mpd 暂不支持":e==="dynamic"?"动态脚本地址（如 .php）暂不支持自动下载":"当前资源暂不支持"}}class pt{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((n,o)=>{const a=this.createResourceItem(n,o);this.grid.appendChild(a)}),this.onSelectionChange([])}toggle(e){const n=this.grid.querySelector(`[data-index="${e}"]`);if(!n)return;const o=this.resources[e];if(!this.isSelectable(o,e)){const a=this.getDisabledReason(o,e);n.title=a||"";return}this.selected.has(e)?(this.selected.delete(e),n.classList.remove(this.classNames.selected)):(this.selected.add(e),n.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,n)=>{this.isSelectable(e,n)&&this.selected.add(n)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,n){const o=B("div",{className:this.classNames.item,dataset:{index:n}});this.isSelectable(e,n)||(o.classList.add("unselectable"),o.title=this.getDisabledReason(e,n)||"",o.setAttribute("aria-disabled","true"));const a={toggle:()=>this.toggle(n),createElement:B,updateResource:h=>{if(!(!h||typeof h!="object")){if(this.resources[n]&&typeof this.resources[n]=="object"){Object.assign(this.resources[n],h);return}this.resources[n]={...h}}}},d=this.createThumbnail(e,n,a);d&&o.appendChild(d);const p=B("div",{className:this.classNames.checkbox,onClick:h=>{h.stopPropagation(),this.toggle(n)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),l=this.createInfo(e,n,a);return o.appendChild(p),l&&o.appendChild(l),o}defaultCreateThumbnail(e,n,o){const a=B("div",{className:this.classNames.thumb}),d=B("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${n+1}`,loading:"lazy"});return a.appendChild(d),a.addEventListener("click",()=>o.toggle()),a}defaultCreateInfo(e){const n=B("div",{className:this.classNames.info}),o=this.getFileName((e==null?void 0:e.src)||"");return n.appendChild(B("span",{},this.truncate(o,28))),n}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(n=>{const o=parseInt(n.dataset.index||"-1",10);this.selected.has(o)?n.classList.add(this.classNames.selected):n.classList.remove(this.classNames.selected)})}getFileName(e){var a;if(!e)return"未命名";const n=String(e).split("/"),o=((a=n[n.length-1])==null?void 0:a.split("?")[0])||"未命名";try{return decodeURIComponent(o)||"未命名"}catch{return o||"未命名"}}truncate(e,n){return!e||e.length<=n?e:e.slice(0,Math.max(0,n-3))+"..."}}function He(r){var o;if(!r)return"未命名";const e=String(r).split("/"),n=((o=e[e.length-1])==null?void 0:o.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}function ft(r){const e=String((r==null?void 0:r.fileName)||"").trim();return e||He((r==null?void 0:r.src)||"").replace(/\.[0-9A-Za-z]{1,6}$/,"")}function ht(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}function mt(r){const e=Number(r||0);if(!e||!Number.isFinite(e))return"--:--";const n=Math.floor(e/3600),o=Math.floor(e%3600/60),a=Math.floor(e%60);return n>0?`${String(n).padStart(2,"0")}:${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`:`${String(o).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function gt(r){return r?r==="m3u8"?"HLS":r==="dash"?"DASH":r==="blob"?"BLOB":String(r).toUpperCase():"video"}function De(r){return(r==null?void 0:r.supported)!==!1}function Re(r){return`不可下载: ${String((r==null?void 0:r.unsupportedReason)||"").trim()||"当前资源暂不支持下载"}`}class bt extends pt{constructor(e){super({...e,emptyText:"未找到视频资源",classNames:{item:"vd-video-item",selected:"selected",empty:"vd-empty",thumb:"vd-video-thumb",checkbox:"vd-checkbox",info:"vd-video-info"},isSelectable:n=>De(n),getDisabledReason:n=>Re(n),createThumbnail:(n,o,a)=>{const d=a.createElement("div",{className:"vd-video-thumb"});if(n.poster){const l=a.createElement("img",{src:n.poster,alt:n.title||`视频 ${o+1}`,loading:"lazy",onerror:()=>{d.classList.add("vd-video-thumb-fallback")}});d.appendChild(l)}else if(n.type!=="m3u8"&&n.type!=="dash"&&n.type!=="blob"){const l=a.createElement("video",{src:n.src,preload:"metadata",muted:"muted",playsinline:"playsinline"});l.onloadedmetadata=()=>{const h=Number.isFinite(l.duration)?Math.round(l.duration):0;a.updateResource({duration:h,width:l.videoWidth||n.width||0,height:l.videoHeight||n.height||0})},l.onerror=()=>{d.classList.add("vd-video-thumb-fallback"),l.remove()},d.appendChild(l)}else d.classList.add("vd-video-thumb-fallback");const p=a.createElement("span",{className:"vd-play-badge"},"▶");return d.appendChild(p),d.addEventListener("click",()=>{a.toggle()}),d},createInfo:(n,o,a)=>{const d=a.createElement("div",{className:"vd-video-info"}),p=He(n.src),l=ft(n),h=`${gt(n.type)}  ·  ${mt(n.duration)}`,S=a.createElement("input",{className:"vd-filename-input",type:"text",value:l,placeholder:"自定义文件名",title:"下载文件名（无需扩展名）"});De(n)||(S.disabled=!0,S.title=Re(n));const E=()=>{const m=String(S.value||"").trim();a.updateResource({fileName:m||l})};return S.addEventListener("click",m=>{m.stopPropagation()}),S.addEventListener("input",E),S.addEventListener("change",E),d.appendChild(S),d.appendChild(a.createElement("span",{className:"vd-filename",title:n.src},ht(p,26))),d.appendChild(a.createElement("span",{className:"vd-meta"},h)),n.supported?n.type==="m3u8"&&d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-hls"},"m3u8")):d.appendChild(a.createElement("span",{className:"vd-badge vd-badge-unsupported"},"暂不支持")),d}})}getSelectedVideos(){return this.getSelectedResources()}}function vt(r={}){const{target:e,handle:n=e,minWidth:o=300,minHeight:a=200,onResizeStart:d,onResize:p,onResizeEnd:l}=r;if(!e||!n)return()=>{};let h=!1,S=0,E=0,m=0,b=0;const N=$=>{$.preventDefault(),$.stopPropagation(),h=!0,S=$.clientX,E=$.clientY,m=e.offsetWidth,b=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",d==null||d($)},v=$=>{if(!h)return;const O=$.clientX-S,_=$.clientY-E,F=Math.max(o,m+O),Y=Math.max(a,b+_);e.style.width=`${F}px`,e.style.height=`${Y}px`,p==null||p($,{width:F,height:Y})},M=$=>{h&&(h=!1,document.body.style.userSelect="",document.body.style.cursor="",l==null||l($))};return n.addEventListener("mousedown",N),document.addEventListener("mousemove",v),document.addEventListener("mouseup",M),()=>{n.removeEventListener("mousedown",N),document.removeEventListener("mousemove",v),document.removeEventListener("mouseup",M)}}function wt(){const r=document.getElementById("vd-panel");if(r)return r;const e=B("div",{id:"vd-panel",className:"vd-panel"});return e.innerHTML=`
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
  `,document.body.appendChild(e),yt(e),xt(e),e.querySelector("#vd-close-btn").addEventListener("click",()=>{le()}),e}function yt(r){const e=r.querySelector(".vd-panel-header");Be({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:n=>!n.target.closest(".vd-panel-close")})}function xt(r){const e=r.querySelector(".vd-resize-handle");e&&vt({target:r,handle:e,minWidth:300,minHeight:200})}Qe(tt);const kt="v";var Pe,qe;const ie=(qe=(Pe=W.videoDownloader)==null?void 0:Pe.storageKeys)==null?void 0:qe.downloadHistory,V=new Set(["success","failed","cancelled"]),de="videoDownloader.frameCapture.v1",Ie="capture-request",ze="capture-response",We=1200,St=We+1e3;(function(){var ye,xe,ke,Se,Ee,Te;if(window.__videoDownloaderInitialized)return;window.__videoDownloaderInitialized=!0;const r=window.top===window.self;let e=[],n=[];const o=[],a=new Map,d=new Set,p=new Set,l=new Map,h=new Set;let S=!0,E=null,m=!1;const b=new et({baseUrl:(xe=(ye=W.videoDownloader)==null?void 0:ye.backend)==null?void 0:xe.baseUrl,wsUrl:(Se=(ke=W.videoDownloader)==null?void 0:ke.backend)==null?void 0:Se.wsUrl,timeout:(Te=(Ee=W.videoDownloader)==null?void 0:Ee.backend)==null?void 0:Te.requestTimeout});function N(t){t&&(t.textContent=`历史下载数: ${o.length}`)}function v(t,s){t&&(t.textContent=s)}function M(t,s,i){t&&(t.classList.remove("connected","disconnected","polling"),t.classList.add(s),t.textContent=i)}function $(t){return t&&typeof t=="object"&&typeof t.url=="string"&&t.url?{url:t.url,downloadedAt:typeof t.downloadedAt=="string"?t.downloadedAt:null}:null}async function O(t){try{const s=await getItem(ie,[]);Array.isArray(s)&&s.forEach(i=>{const u=$(i);u&&o.push(u)}),N(t),g.info("已加载视频下载历史",{count:o.length})}catch(s){g.error("读取视频下载历史失败",s),N(t)}}async function _(){try{await Ue(ie,o),g.debug("视频下载历史已保存",{count:o.length})}catch(t){g.error("保存视频下载历史失败",t)}}function F(t){switch(t){case"queued":return"排队中";case"running":return"执行中";case"cancelling":return"取消中";case"success":return"已完成";case"failed":return"有失败";case"cancelled":return"已取消";default:return t||"未知"}}function Y(t){if(!t)return"等待后端更新状态";if(t.status==="cancelling"||t.cancelRequested)return t.message||"正在停止下载并清理临时文件...";const s=String(t.progressText||"").trim();return t.status==="running"&&s?s:V.has(t.status)?t.message||"任务已结束":s||"等待后端进度输出..."}function J(t){return!t||!t.id?!1:d.has(t.id)||t.status==="cancelling"||!!t.cancelRequested}function Z(t,s){if(!t||!V.has(t.status)||p.has(t.id))return;const i=(t.items||[]).filter(c=>c.status==="success");if(i.length===0){p.add(t.id);return}const u=new Date().toISOString();i.forEach(c=>{c.src&&o.push({url:c.src,downloadedAt:u})}),p.add(t.id),N(s),_()}function H(t){if(!t)return;t.innerHTML="";const s=Array.from(a.values()).map((i,u)=>({task:i,index:u})).sort((i,u)=>{const c=Date.parse(i.task.createdAt||0)||0,w=Date.parse(u.task.createdAt||0)||0;return w!==c?w-c:i.index-u.index}).map(({task:i})=>i);if(s.length===0){const i=document.createElement("div");i.className="vd-task-empty",i.textContent="暂无任务，选择视频后点击「提交任务」",t.appendChild(i);return}s.forEach(i=>{const u=document.createElement("div");u.className="vd-task-item";const c=document.createElement("div");c.className="vd-task-row";const w=document.createElement("span");w.className="vd-task-id",w.textContent=String(i.id||"-");const A=document.createElement("span");A.className=`vd-task-status ${i.status||"queued"}`,A.textContent=F(i.status),c.appendChild(w),c.appendChild(A),u.appendChild(c);const U=document.createElement("div");U.className="vd-task-message",U.textContent=Y(i),u.appendChild(U);const R=document.createElement("div");R.className="vd-task-row";const C=document.createElement("span");C.className="vd-task-id",C.textContent=`目录: ${i.outputDir||"-"}`;const X=document.createElement("div");X.className="vd-task-actions";const I=document.createElement("button");if(I.className="vd-task-open",I.dataset.action="open-task-dir",I.dataset.taskId=i.id,I.textContent="打开目录",X.appendChild(I),!V.has(i.status)){const D=document.createElement("button");D.className="vd-task-cancel",D.dataset.action="cancel-task",D.dataset.taskId=i.id,J(i)?(D.disabled=!0,D.classList.add("is-processing"),D.textContent="取消执行中..."):D.textContent="取消任务",X.appendChild(D)}R.appendChild(C),R.appendChild(X),u.appendChild(R),t.appendChild(u)})}function k(t,s,i){!t||!t.id||(a.set(t.id,t),d.delete(t.id),V.has(t.status)&&z(t.id),Z(t,i),H(s))}function z(t){const s=l.get(t);s&&(clearInterval(s),l.delete(t))}function ee(){l.forEach(t=>clearInterval(t)),l.clear()}function j(t,s,i,u,c){var U,R;if(!t||l.has(t))return;const w=(R=(U=W.videoDownloader)==null?void 0:U.backend)==null?void 0:R.pollingInterval,A=setInterval(async()=>{try{const C=await b.getTask(t);k(C,u,c),V.has(C.status)&&z(t)}catch(C){if(String((C==null?void 0:C.message)||"").includes("请求失败: 404")){z(t);const I=a.get(t);I&&!V.has(I.status)&&k({...I,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()},u,c),g.warn("任务不存在，停止轮询",{taskId:t});return}M(i,"polling","后端: 轮询中"),g.warn("轮询任务状态失败",{taskId:t,error:(C==null?void 0:C.message)||C}),v(s,`任务轮询失败: ${(C==null?void 0:C.message)||"未知错误"}`)}},w);l.set(t,A)}function Q(t,s,i,u){a.forEach(c=>{V.has(c.status)||j(c.id,t,s,i,u)})}async function te(t,s){const i=await b.listTasks(),u=new Set(i.map(c=>c.id).filter(Boolean));Array.from(a.keys()).forEach(c=>{if(u.has(c))return;z(c);const w=a.get(c);w&&!V.has(w.status)&&(d.delete(c),a.set(c,{...w,status:"failed",message:"任务不存在，可能后端已重启或任务已清理",updatedAt:new Date().toISOString()}))}),i.forEach(c=>k(c,t,s)),H(t)}function se(t){const s=pe((t==null?void 0:t.src)||""),i=String((t==null?void 0:t.fileName)||"").trim();return{src:t.src,type:t.type||"unknown",title:t.title||"",duration:Number(t.duration||0)||0,mimeType:t.mimeType||"",fileName:i||s,requestHeaders:_e()}}function _e(){var c;const t={},s=String((navigator==null?void 0:navigator.userAgent)||"").trim(),i=String(((c=window==null?void 0:window.location)==null?void 0:c.href)||"").trim(),u=String((document==null?void 0:document.cookie)||"").trim();return s&&(t["User-Agent"]=s),i&&(t.Referer=i),u&&(t.Cookie=u),t}function pe(t){var i;const s=((i=String(t||"").split("/").pop())==null?void 0:i.split("?")[0])||"";if(!s)return"";try{return decodeURIComponent(s).replace(/\.[0-9A-Za-z]{1,6}$/,"")}catch{return s.replace(/\.[0-9A-Za-z]{1,6}$/,"")}}function je(t){return{videos:t.map(s=>se(s)),pageUrl:window.location.href,pageTitle:document.title}}function fe(t,s){return t&&typeof t=="object"&&t.channel===de&&t.type===s&&typeof t.requestId=="string"}function Ve(){const t=document.querySelectorAll("iframe, frame"),s=[];return t.forEach(i=>{i!=null&&i.contentWindow&&s.push(i.contentWindow)}),s}function he(t){const s={channel:de,type:Ie,requestId:t};Ve().forEach(i=>{try{i.postMessage(s,"*")}catch(u){g.debug("向子 frame 分发捕获请求失败",u)}})}function me(){return new ut().getAllVideos().map(i=>({...i,frameUrl:window.location.href,frameTitle:document.title||""}))}function ge(t,s="",i=""){return!t||typeof t!="object"||!t.src?null:{...t,frameUrl:String(t.frameUrl||s||""),frameTitle:String(t.frameTitle||i||"")}}function Oe(t,s){if(!t||s!=null&&s.supported&&(t==null?void 0:t.supported)===!1)return s;if((s==null?void 0:s.supported)===!1&&(t!=null&&t.supported))return t;const i=Number((t==null?void 0:t.duration)||0)+Number((t==null?void 0:t.width)||0)*Number((t==null?void 0:t.height)||0);return Number((s==null?void 0:s.duration)||0)+Number((s==null?void 0:s.width)||0)*Number((s==null?void 0:s.height)||0)>i?s:t}function Ye(t){const s=new Map;return t.forEach(i=>{const u=ge(i);if(!u)return;const c=String(u.src||"").trim();if(!c)return;const w=s.get(c);s.set(c,Oe(w,u))}),Array.from(s.values())}async function be(t=We){const s=`vd_capture_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,i=me(),u=[...i],c=A=>{const U=A==null?void 0:A.data;fe(U,ze)&&U.requestId===s&&Array.isArray(U.videos)&&U.videos.forEach(R=>{const C=ge(R,U.frameUrl,U.frameTitle);C&&u.push(C)})};window.addEventListener("message",c);try{he(s),await new Promise(A=>{window.setTimeout(A,t)})}finally{window.removeEventListener("message",c)}const w=Ye(u);return g.info("跨 frame 捕获完成",{localCount:i.length,totalCount:w.length,remoteCount:Math.max(0,w.length-i.length)}),w}function Xe(){window.addEventListener("message",t=>{const s=t==null?void 0:t.data;if(!fe(s,Ie))return;const i=s.requestId;if(h.has(i))return;h.add(i);let u=[];try{u=me()}catch(c){g.warn("子 frame 捕获视频失败",c)}he(i);try{window.top.postMessage({channel:de,type:ze,requestId:i,frameUrl:window.location.href,frameTitle:document.title||"",videos:u},"*")}catch(c){g.warn("子 frame 回传捕获结果失败",c)}window.setTimeout(()=>{h.delete(i)},St)})}function Ke(t,s){document.addEventListener("keydown",async i=>{const u=String(i.key||"").toLowerCase();if(i.ctrlKey&&i.shiftKey&&u===kt){if(i.preventDefault(),!S)return;S=!1;const c=document.getElementById("vd-panel");(!c||c.style.display==="none"||c.style.display==="")&&Fe(),v(s,"正在跨 frame 捕获视频...");try{e=await be(),t.render(e),v(s,`已捕获 ${e.length} 个视频资源`)}catch(w){g.error("快捷键捕获视频失败",w),v(s,`捕获失败: ${(w==null?void 0:w.message)||"未知错误"}`)}setTimeout(()=>{S=!0},500)}})}function Ge(t,s,i,u){if(!(!t||typeof t!="object")){if(t.event==="task.list"&&Array.isArray(t.tasks)){t.tasks.forEach(c=>k(c,i,u));return}t.task&&(k(t.task,i,u),t.event&&t.event.startsWith("task.")&&v(s,`后端状态: ${F(t.task.status)}`))}}async function ve(t,s,i,u){E&&(E.close(),E=null),M(t,"disconnected","后端: 连接中");const c=(w,A=null)=>{m=!1,M(t,"polling",w),A&&g.warn("WebSocket 异常",A),Q(s,t,i,u)};E=b.connectTaskStream({onOpen:()=>{m=!0,M(t,"connected","后端: WebSocket 已连接"),ee()},onMessage:w=>{Ge(w,s,i,u)},onClose:()=>{c("后端: WebSocket 断开，切换轮询")},onError:w=>{c("后端: 连接异常，切换轮询",w)}})}async function Je(){var Le,Ne;g.info("videoDownloader 初始化开始",{logLevel:W.logLevel});const t=wt(),s=dt(),i=t.querySelector(".vd-panel-note");if(s&&i){const x=ct(s);i.textContent=`支持直链视频与 m3u8 基础下载，当前来源策略：${x}`}st({onToggle:ot}),le();const u=t.querySelector(".vd-video-grid"),c=t.querySelector("#vd-task-list"),w=t.querySelector("#vd-select-all"),A=t.querySelector("#vd-select-none"),U=t.querySelector("#vd-download"),R=t.querySelector("#vd-cleanup-parts"),C=t.querySelector("#vd-clear-storage"),X=t.querySelector("#vd-capture"),I=t.querySelector("#vd-reconnect"),D=t.querySelector("#vd-backend-status"),T=t.querySelector(".vd-status"),P=t.querySelector("#vd-downloaded-count");await O(P),b.setBaseUrl((Ne=(Le=W.videoDownloader)==null?void 0:Le.backend)==null?void 0:Ne.baseUrl,"");const ne=new bt({grid:u,onSelectionChange:x=>{n=x,Ce()}});Ke(ne,T),X.addEventListener("click",async()=>{g.info("开始手动捕获视频"),v(T,"正在跨 frame 捕获视频...");try{e=await be(),ne.render(e),v(T,`已捕获 ${e.length} 个视频资源`),g.info("手动捕获完成",{count:e.length})}catch(x){g.error("手动捕获失败",x),v(T,`捕获失败: ${(x==null?void 0:x.message)||"未知错误"}`)}}),w.addEventListener("click",()=>{ne.selectAll()}),A.addEventListener("click",()=>{ne.selectNone()}),C.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){o.length=0;try{await Ue(ie,[]),N(P),v(T,"存储已清除"),g.info("视频脚本存储已清除")}catch(f){v(T,"清除存储失败"),g.error("清除视频脚本存储失败",f)}}}),R.addEventListener("click",async()=>{if(window.confirm("确认删除所有非当前下载中的 part 目录吗？"))try{const f=await b.cleanupPartDirs(),L=Number((f==null?void 0:f.deletedCount)||0)||0;v(T,`已清理 part 目录: ${L} 个`),g.info("已清理非运行中的 part 目录",{deletedCount:L,deletedDirs:(f==null?void 0:f.deletedDirs)||[],runningTaskIds:(f==null?void 0:f.runningTaskIds)||[]})}catch(f){g.error("清理 part 目录失败",f),v(T,`清理 part 目录失败: ${(f==null?void 0:f.message)||"未知错误"}`)}}),I.addEventListener("click",async()=>{await ve(D,T,c,P);try{await te(c,P)}catch(x){g.warn("刷新任务列表失败",x)}}),c.addEventListener("click",async x=>{const f=x.target.closest("[data-action]");if(!f)return;const L=f.dataset.taskId;if(!L)return;const q=f.dataset.action;if(q==="open-task-dir"){try{const y=await b.openDirectory({taskId:L});v(T,(y==null?void 0:y.message)||"已请求后端打开目录")}catch(y){g.error("打开任务目录失败",y),v(T,`打开目录失败: ${(y==null?void 0:y.message)||"未知错误"}`)}return}if(q!=="cancel-task")return;const re=a.get(L);if(re&&J(re)){v(T,`任务 ${L} 的取消正在执行中，请稍候`);return}d.add(L),H(c),v(T,`任务 ${L} 正在取消...`);try{const y=await b.cancelTask(L),oe=!!(y!=null&&y.cancelled)||(y==null?void 0:y.status)==="cancelled"?"任务已取消":"取消请求已发送，等待后端完成";v(T,`任务 ${L}: ${(y==null?void 0:y.message)||oe}`),!m&&!l.has(L)&&j(L,T,D,c,P)}catch(y){g.error("取消任务失败",y),v(T,`取消任务失败: ${(y==null?void 0:y.message)||"未知错误"}`),!m&&!l.has(L)&&j(L,T,D,c,P)}finally{d.delete(L),H(c)}}),U.addEventListener("click",async()=>{if(n.length===0){alert("请先选择要下载的视频");return}const x=n.filter(f=>(f==null?void 0:f.src)&&(f==null?void 0:f.supported)!==!1&&!String(f.src).startsWith("blob:"));if(x.length===0){alert("当前选中资源都不支持提交到后端，请至少选择一个可下载资源");return}g.info("提交后端视频任务",{count:x.length}),v(T,`正在提交任务（${x.length} 个）...`);try{let f=0;const L=[];for(const q of x){const re=je([q]);try{const y=await b.createTask(re),K=y==null?void 0:y.taskId;if(!K)throw new Error("后端未返回 taskId");const oe=await b.getTask(K);k(oe,c,P),f+=1,m||j(K,T,D,c,P)}catch(y){const K=String((q==null?void 0:q.fileName)||pe((q==null?void 0:q.src)||"")||"未命名");L.push(`${K}: ${(y==null?void 0:y.message)||"未知错误"}`)}}if(L.length===0)v(T,`任务已提交: ${f} 个`);else if(f>0)v(T,`部分提交失败（成功 ${f}，失败 ${L.length}）`),alert(`以下任务提交失败:
${L.join(`
`)}`);else throw new Error(L.join("; "))}catch(f){g.error("任务提交失败",f),v(T,`任务提交失败: ${(f==null?void 0:f.message)||"未知错误"}`)}});function Ce(){const x=n.length;U.disabled=x===0,U.textContent=x===0?"提交任务":`提交任务 (${x})`}await ve(D,T,c,P);try{await te(c,P)}catch(x){g.warn("初始化任务列表失败",x),v(T,`后端暂不可用: ${(x==null?void 0:x.message)||"未知错误"}`),M(D,"polling","后端: 请求失败，轮询模式")}Ce(),g.info("videoDownloader 初始化完成",{downloadedCount:o.length})}function we(){Je().catch(t=>{g.error("videoDownloader 初始化失败",t)})}if(Xe(),!r){g.debug("videoDownloader 已在子 frame 启用捕获桥接");return}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",we):we()})();
