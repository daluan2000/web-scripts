// ==UserScript==
// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// ==/UserScript==

function N(r,e={},t="",n=""){const i=document.createElement(r);for(const[a,o]of Object.entries(e))if(a==="className")i.className=o;else if(a==="dataset")for(const[l,d]of Object.entries(o))i.dataset[l]=d;else a.startsWith("on")?i.addEventListener(a.slice(2).toLowerCase(),o):i.setAttribute(a,o);return t?i.innerHTML=t:n&&(i.textContent=n),i}function xe(r){const e=N("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const $={logLevel:"info",storagePrefix:"userscript_",imageDownloader:{storageKeys:{downloadHistory:"imageDownloader_download_history",gifQualityMode:"imageDownloader_gif_quality_mode"}}};function ue(r){return $.storagePrefix+r}const K={debug:0,info:1,warn:2,error:3};function R(r,e,...t){const n=K[$.logLevel];if(K[r]<n)return;const i=`[${r.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${i} [${a}]`,e,...t);break;case"warn":console.warn(`${i} [${a}]`,e,...t);break;case"error":console.error(`${i} [${a}]`,e,...t);break}}const k={debug:(r,...e)=>R("debug",r,...e),info:(r,...e)=>R("info",r,...e),warn:(r,...e)=>R("warn",r,...e),error:(r,...e)=>R("error",r,...e)};async function j(r,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(ue(r),n),t()})}async function J(r,e=null){const t=await GM_getValue(ue(r));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const ve=`/**
 * 图片批量下载器样式
 */

/* ===========================
   悬浮按钮
   =========================== */
#id-floating-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 2147483647;
  transition: all 0.3s ease;
  touch-action: none;
}

#id-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

#id-floating-btn.active {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

#id-floating-btn.dragging {
  cursor: grabbing;
  transition: none;
}

#id-floating-btn.dragging:hover {
  transform: none;
}

#id-floating-btn svg {
  width: 20px;
  height: 20px;
}

/* ===========================
   主面板
   =========================== */
.id-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 450px;
  min-width: 300px;
  min-height: 200px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 面板头部 */
.id-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.id-panel-title {
  font-size: 15px;
  font-weight: 600;
}

.id-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.id-panel-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 增强器状态提示 */
.id-enhancer-status {
  padding: 8px 16px;
  font-size: 12px;
  color: #333;
  background: linear-gradient(90deg, #fff9e6 0%, #fff3cd 100%);
  border-bottom: 1px solid #ffeaa7;
  display: none;
}

.id-enhancer-status.active {
  display: block;
}

/* ===========================
   工具栏
   =========================== */
.id-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap;
}

.id-toolbar-spacer {
  flex: 1;
}

.id-btn {
  padding: 8px 14px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.id-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #ccc;
}

.id-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.id-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.id-btn-primary {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.id-btn-primary:hover:not(:disabled) {
  background: #5a6fd6;
  border-color: #5a6fd6;
}

.id-btn-success {
  background: #48bb78;
  border-color: #48bb78;
  color: white;
}

.id-btn-success:hover:not(:disabled) {
  background: #38a169;
  border-color: #38a169;
}

.id-btn-warning {
  background: #f59e0b;
  border-color: #d97706;
  color: white;
}

.id-btn-warning:hover:not(:disabled) {
  background: #ea580c;
  border-color: #ea580c;
}

.id-prefix-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.id-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #555;
  user-select: none;
  cursor: pointer;
}

.id-switch-label input {
  margin: 0;
  cursor: pointer;
}

.id-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 100px;
  outline: none;
  transition: border-color 0.2s;
}

.id-input:focus {
  border-color: #667eea;
}

/* ===========================
   图片网格
   =========================== */
.id-image-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  align-content: start;
  background: #fafafa;
}

.id-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

/* 图片项 */
.id-image-item {
  position: relative;
  min-height: 160px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.id-image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.id-image-item.selected {
  box-shadow: 0 0 0 3px #667eea;
}

/* 缩略图 */
.id-image-thumb {
  position: relative;
  width: 100%;
  min-height: 100px;
  background: #f0f0f0;
  overflow: hidden;
}

.id-image-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* 选择框 */
.id-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.id-image-item:hover .id-checkbox,
.id-image-item.selected .id-checkbox {
  opacity: 1;
}

.id-image-item.selected .id-checkbox {
  background: #667eea;
}

.id-image-item.selected .id-checkbox svg rect {
  fill: #667eea;
}

/* 图片信息 */
.id-image-info {
  padding: 8px;
  min-height: 50px;
  font-size: 11px;
  color: #666;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.id-filename {
  display: block;
  word-break: break-all;
  line-height: 1.4;
}

.id-size {
  display: block;
  color: #999;
  margin-top: 4px;
  font-size: 10px;
}

/* ===========================
   面板底部
   =========================== */
.id-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px 10px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.id-status {
  font-size: 12px;
  color: #666;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-downloaded-count {
  font-size: 12px;
  color: #4a5568;
  margin-right: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 改变大小手柄 */
.id-resize-handle {
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
    #ddd 50%,
    #ddd 60%,
    transparent 60%,
    transparent 70%,
    #ddd 70%,
    #ddd 80%,
    transparent 80%
  );
}

/* ===========================
   滚动条美化
   =========================== */
.id-image-grid::-webkit-scrollbar {
  width: 8px;
}

.id-image-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.id-image-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.id-image-grid::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* ===========================
   响应式调整
   =========================== */
@media (max-width: 640px) {
  .id-panel {
    width: 95%;
    height: 80%;
    min-width: 280px;
    min-height: 300px;
  }

  .id-toolbar {
    gap: 6px;
    padding: 8px 12px;
  }

  .id-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .id-image-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}

/* 小窗口下确保图片信息可见 */
@media (max-width: 500px) {
  .id-panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    min-width: 100%;
  }

  .id-image-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }

  .id-image-info {
    padding: 6px 4px;
    font-size: 10px;
  }

  .id-prefix-label {
    width: 100%;
    margin-top: 4px;
  }

  .id-input {
    flex: 1;
    width: auto;
  }
}
`;function he(r){const{target:e,handle:t=e,onClick:n,shouldStart:i,dragThreshold:a=4,clampToViewport:o=!0,dragClassName:l,bodyCursor:d="",removeTransformOnStart:u=!1,onDragStart:c,onDrag:s,onDragEnd:h}=r||{};if(!e||!t)return()=>{};let p=null,f=0,m=0,g=0,b=0,E=!1,y=!1;const x=C=>{if(n){if(y){C.preventDefault(),C.stopPropagation(),y=!1;return}n(C)}},S=C=>{if(C.pointerType==="mouse"&&C.button!==0||typeof i=="function"&&!i(C))return;const I=e.getBoundingClientRect();f=C.clientX,m=C.clientY,g=I.left,b=I.top,E=!1,p=C.pointerId,e.style.left=`${g}px`,e.style.top=`${b}px`,e.style.right="auto",e.style.bottom="auto",u&&(e.style.transform="none"),l&&e.classList.add(l),t.setPointerCapture(p),document.body.style.userSelect="none",d&&(document.body.style.cursor=d),typeof c=="function"&&c(C),C.preventDefault()},A=C=>{if(C.pointerId!==p)return;const I=C.clientX-f,B=C.clientY-m;if(!E&&Math.hypot(I,B)>=a&&(E=!0,y=!0),!E)return;let D=g+I,v=b+B;if(o){const T=Math.max(0,window.innerWidth-e.offsetWidth),L=Math.max(0,window.innerHeight-e.offsetHeight);D=Math.max(0,Math.min(D,T)),v=Math.max(0,Math.min(v,L))}e.style.left=`${D}px`,e.style.top=`${v}px`,typeof s=="function"&&s(C)},w=C=>{C.pointerId===p&&(t.hasPointerCapture(p)&&t.releasePointerCapture(p),p=null,l&&e.classList.remove(l),document.body.style.userSelect="",d&&(document.body.style.cursor=""),typeof h=="function"&&h(C))};return t.addEventListener("click",x),t.addEventListener("pointerdown",S),t.addEventListener("pointermove",A),t.addEventListener("pointerup",w),t.addEventListener("pointercancel",w),()=>{t.removeEventListener("click",x),t.removeEventListener("pointerdown",S),t.removeEventListener("pointermove",A),t.removeEventListener("pointerup",w),t.removeEventListener("pointercancel",w)}}const Ie=30,Ce=30;function Z(r){if(!r)return;const e=r.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),n=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/n)))}function Ee(r){if(!r)return;const e=Number(r.dataset.ratioX),t=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const n=Math.max(0,window.innerWidth-r.offsetWidth),i=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(n*e)}px`,r.style.top=`${Math.round(i*t)}px`,r.style.right="auto",r.style.bottom="auto"}function Se(r){const e=document.getElementById("id-floating-btn");if(e)return e;const t=N("div",{id:"id-floating-btn",title:"图片批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);return document.body.appendChild(t),t.style.right=`${Ie}px`,t.style.bottom=`${Ce}px`,he({target:t,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{Z(t)}}),requestAnimationFrame(()=>{Z(t)}),window.addEventListener("resize",()=>{Ee(t)}),t}function fe(){const r=document.getElementById("id-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function Q(){const r=document.getElementById("id-panel");r&&(r.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function ke(){const r=document.getElementById("id-panel");r&&(r.style.display==="none"||r.style.display===""?fe():Q())}const Ae={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(r){if(!this.urlPattern.test(r))return r;const e=r.indexOf("?"),t=e===-1?r:r.slice(0,e),n=e===-1?"":r.slice(e),i=t.indexOf("@");if(i===-1)return r;const a=t.slice(0,i),l=t.slice(i+1).match(/\.([a-z0-9]+)$/i),d=l?l[1].toLowerCase():"";return d==="avif"||d==="awebp"||d==="webp"?`${a}@3840w.${d}${n}`:`${a}@3840w${n}`}},Be={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(r){return r}},Le={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(r){return r}},De={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(r){return r.replace(/_\w+(\.\w+)$/i,"$1")}},Y=[Ae,Be,Le,De];function Te(r){for(const e of Y)if(e.urlPattern.test(r))return e;return null}function Me(r){const e=window.location.href;for(const t of Y)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function Pe(r){const e=Me();return e?e.name:null}function ze(r){const e=Y.find(t=>t.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function Ne(r){const e=Te(r);return e?e.enhance(r):r}class ee{getAllImages(){const e=[],t=new Set;document.querySelectorAll("img").forEach(u=>{this.processImageElement(u,"img",t,e)}),document.querySelectorAll("image").forEach(u=>{var s;const c=this.getImageSrc(((s=u.href)==null?void 0:s.baseVal)||u.getAttribute("href"));c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"svg-image",u)))});const a=document.querySelectorAll("*");return a.forEach(u=>{const s=window.getComputedStyle(u).backgroundImage;s&&s!=="none"&&this.extractUrls(s).forEach(p=>{const f=this.getImageSrc(p);f&&!t.has(f)&&(t.add(f),e.push(this.createImageInfo(f,"background",u)))})}),document.querySelectorAll("source").forEach(u=>{var s,h,p;const c=this.getImageSrc((p=(h=(s=u.srcset)==null?void 0:s.split(",")[0])==null?void 0:h.trim())==null?void 0:p.split(" ")[0]);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"source",u)))}),a.forEach(u=>{this.processLazySrc(u,t,e)}),document.querySelectorAll("video, audio").forEach(u=>{const c=u.getAttribute("poster");if(c){const s=this.getImageSrc(c);s&&!t.has(s)&&(t.add(s),e.push(this.createImageInfo(s,"media-poster",u)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(u=>{const c=this.getImageSrc(u.href);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"icon",u)))}),e.filter(u=>this.isValidImage(u.src))}processImageElement(e,t,n,i){var o,l,d;const a=this.getImageSrc(e.src)||this.getImageSrc((o=e.dataset)==null?void 0:o.src)||this.getImageSrc((l=e.dataset)==null?void 0:l.original)||this.getImageSrc((d=e.dataset)==null?void 0:d.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),i.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var l,d,u;let o=((l=e.dataset)==null?void 0:l[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&o)try{const c=JSON.parse(o);o=c.src||c.url||c.original}catch{}if(o){(a.includes("srcset")||a==="data-srcset")&&(o=(u=(d=o.split(",")[0])==null?void 0:d.trim())==null?void 0:u.split(" ")[0]);const c=this.getImageSrc(o);c&&!t.has(c)&&(t.add(c),n.push(this.createImageInfo(c,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(i=>e.toLowerCase().includes(i))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=Ne(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let i;for(;(i=n.exec(e))!==null;)t.push(i[1]);return t}isValidImage(e){if(!e||typeof e!="string")return!1;const t=e.trim();if(!t)return!1;const n=t.toLowerCase();if(n.startsWith("javascript:")||n.startsWith("vbscript:")||n.startsWith("mailto:")||n.startsWith("tel:"))return!1;if(n.startsWith("data:"))return n.startsWith("data:image/");if(n.startsWith("blob:"))return!0;try{const i=new URL(t,window.location.href);return i.protocol==="http:"||i.protocol==="https:"}catch{return!1}}createImageInfo(e,t,n){return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class Ue{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,n)=>{const i=this.createResourceItem(t,n);this.grid.appendChild(i)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const n=this.resources[e];if(!this.isSelectable(n,e)){const i=this.getDisabledReason(n,e);t.title=i||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const n=N("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(n.classList.add("unselectable"),n.title=this.getDisabledReason(e,t)||"",n.setAttribute("aria-disabled","true"));const i={toggle:()=>this.toggle(t),createElement:N,updateResource:d=>{if(!(!d||typeof d!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],d);return}this.resources[t]={...d}}}},a=this.createThumbnail(e,t,i);a&&n.appendChild(a);const o=N("div",{className:this.classNames.checkbox,onClick:d=>{d.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),l=this.createInfo(e,t,i);return n.appendChild(o),l&&n.appendChild(l),n}defaultCreateThumbnail(e,t,n){const i=N("div",{className:this.classNames.thumb}),a=N("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return i.appendChild(a),i.addEventListener("click",()=>n.toggle()),i}defaultCreateInfo(e){const t=N("div",{className:this.classNames.info}),n=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(N("span",{},this.truncate(n,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const n=parseInt(t.dataset.index||"-1",10);this.selected.has(n)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var i;if(!e)return"未命名";const t=String(e).split("/"),n=((i=t[t.length-1])==null?void 0:i.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function We(r){var n;if(!r)return"未命名";const e=String(r).split("/"),t=((n=e[e.length-1])==null?void 0:n.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function $e(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}class Fe extends Ue{constructor(e){super({...e,emptyText:"未找到图片",classNames:{item:"id-image-item",selected:"selected",empty:"id-empty",thumb:"id-image-thumb",checkbox:"id-checkbox",info:"id-image-info"},createThumbnail:(t,n,i)=>{const a=i.createElement("div",{className:"id-image-thumb"}),o=i.createElement("img",{src:t.src,alt:t.alt||`图片 ${n+1}`,loading:"lazy",onerror:()=>{o.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});return o.onload=()=>{o.naturalWidth>0&&i.updateResource({width:o.naturalWidth,height:o.naturalHeight})},a.appendChild(o),a.addEventListener("click",()=>{i.toggle()}),a},createInfo:(t,n,i)=>{const a=i.createElement("div",{className:"id-image-info"}),o=We(t.src),l=i.createElement("span",{className:"id-size"});return l.textContent=t.width&&t.height?`${t.width}×${t.height}`:"",a.appendChild(i.createElement("span",{className:"id-filename",title:t.src},$e(o,20))),a.appendChild(l),a}})}getSelectedImages(){return this.getSelectedResources()}}var He={trailer:59};function ge(r=256){let e=0,t=new Uint8Array(r);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(i){n(e+1),t[e]=i,e++},writeBytes(i,a=0,o=i.length){n(e+o);for(let l=0;l<o;l++)t[e++]=i[l+a]},writeBytesView(i,a=0,o=i.byteLength){n(e+o),t.set(i.subarray(a,a+o),e),e+=o}};function n(i){var a=t.length;if(a>=i)return;var o=1024*1024;i=Math.max(i,a*(a<o?2:1.125)>>>0),a!=0&&(i=Math.max(i,256));let l=t;t=new Uint8Array(i),e>0&&t.set(l.subarray(0,e),0)}}var O=12,te=5003,Re=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function qe(r,e,t,n,i=ge(512),a=new Uint8Array(256),o=new Int32Array(te),l=new Int32Array(te)){let d=o.length,u=Math.max(2,n);a.fill(0),l.fill(0),o.fill(-1);let c=0,s=0,h=u+1,p=h,f=!1,m=p,g=(1<<m)-1,b=1<<h-1,E=b+1,y=b+2,x=0,S=t[0],A=0;for(let I=d;I<65536;I*=2)++A;A=8-A,i.writeByte(u),C(b);let w=t.length;for(let I=1;I<w;I++)e:{let B=t[I],D=(B<<O)+S,v=B<<A^S;if(o[v]===D){S=l[v];break e}let T=v===0?1:d-v;for(;o[v]>=0;)if(v-=T,v<0&&(v+=d),o[v]===D){S=l[v];break e}C(S),S=B,y<1<<O?(l[v]=y++,o[v]=D):(o.fill(-1),y=b+2,f=!0,C(b))}return C(S),C(E),i.writeByte(0),i.bytesView();function C(I){for(c&=Re[s],s>0?c|=I<<s:c=I,s+=m;s>=8;)a[x++]=c&255,x>=254&&(i.writeByte(x),i.writeBytesView(a,0,x),x=0),c>>=8,s-=8;if((y>g||f)&&(f?(m=p,g=(1<<m)-1,f=!1):(++m,g=m===O?1<<m:(1<<m)-1)),I==E){for(;s>0;)a[x++]=c&255,x>=254&&(i.writeByte(x),i.writeBytesView(a,0,x),x=0),c>>=8,s-=8;x>0&&(i.writeByte(x),i.writeBytesView(a,0,x),x=0)}}}var Ge=qe;function pe(r,e,t){return r<<8&63488|e<<2&992|t>>3}function me(r,e,t,n){return r>>4|e&240|(t&240)<<4|(n&240)<<8}function we(r,e,t){return r>>4<<8|e&240|t>>4}function q(r,e,t){return r<e?e:r>t?t:r}function G(r){return r*r}function ne(r,e,t){var n=0,i=1e100;let a=r[e],o=a.cnt;a.ac;let l=a.rc,d=a.gc,u=a.bc;for(var c=a.fw;c!=0;c=r[c].fw){let h=r[c],p=h.cnt,f=o*p/(o+p);if(!(f>=i)){var s=0;s+=f*G(h.rc-l),!(s>=i)&&(s+=f*G(h.gc-d),!(s>=i)&&(s+=f*G(h.bc-u),!(s>=i)&&(i=s,n=c)))}}a.err=i,a.nn=n}function _(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function je(r,e){let t=e==="rgb444"?4096:65536,n=new Array(t),i=r.length;if(e==="rgba4444")for(let a=0;a<i;++a){let o=r[a],l=o>>24&255,d=o>>16&255,u=o>>8&255,c=o&255,s=me(c,u,d,l),h=s in n?n[s]:n[s]=_();h.rc+=c,h.gc+=u,h.bc+=d,h.ac+=l,h.cnt++}else if(e==="rgb444")for(let a=0;a<i;++a){let o=r[a],l=o>>16&255,d=o>>8&255,u=o&255,c=we(u,d,l),s=c in n?n[c]:n[c]=_();s.rc+=u,s.gc+=d,s.bc+=l,s.cnt++}else for(let a=0;a<i;++a){let o=r[a],l=o>>16&255,d=o>>8&255,u=o&255,c=pe(u,d,l),s=c in n?n[c]:n[c]=_();s.rc+=u,s.gc+=d,s.bc+=l,s.cnt++}return n}function re(r,e,t={}){let{format:n="rgb565",clearAlpha:i=!0,clearAlphaColor:a=0,clearAlphaThreshold:o=0,oneBitAlpha:l=!1}=t;if(!r||!r.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(r instanceof Uint8Array)&&!(r instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let d=new Uint32Array(r.buffer),u=t.useSqrt!==!1,c=n==="rgba4444",s=je(d,n),h=s.length,p=h-1,f=new Uint32Array(h+1);for(var m=0,g=0;g<h;++g){let L=s[g];if(L!=null){var b=1/L.cnt;c&&(L.ac*=b),L.rc*=b,L.gc*=b,L.bc*=b,s[m++]=L}}G(e)/m<.022&&(u=!1);for(var g=0;g<m-1;++g)s[g].fw=g+1,s[g+1].bk=g,u&&(s[g].cnt=Math.sqrt(s[g].cnt));u&&(s[g].cnt=Math.sqrt(s[g].cnt));var E,y,x;for(g=0;g<m;++g){ne(s,g);var S=s[g].err;for(y=++f[0];y>1&&(x=y>>1,!(s[E=f[x]].err<=S));y=x)f[y]=E;f[y]=g}var A=m-e;for(g=0;g<A;){for(var w;;){var C=f[1];if(w=s[C],w.tm>=w.mtm&&s[w.nn].mtm<=w.tm)break;w.mtm==p?C=f[1]=f[f[0]--]:(ne(s,C),w.tm=g);var S=s[C].err;for(y=1;(x=y+y)<=f[0]&&(x<f[0]&&s[f[x]].err>s[f[x+1]].err&&x++,!(S<=s[E=f[x]].err));y=x)f[y]=E;f[y]=C}var I=s[w.nn],B=w.cnt,D=I.cnt,b=1/(B+D);c&&(w.ac=b*(B*w.ac+D*I.ac)),w.rc=b*(B*w.rc+D*I.rc),w.gc=b*(B*w.gc+D*I.gc),w.bc=b*(B*w.bc+D*I.bc),w.cnt+=I.cnt,w.mtm=++g,s[I.bk].fw=I.fw,s[I.fw].bk=I.bk,I.mtm=p}let v=[];var T=0;for(g=0;;++T){let L=q(Math.round(s[g].rc),0,255),M=q(Math.round(s[g].gc),0,255),P=q(Math.round(s[g].bc),0,255),z=255;c&&(z=q(Math.round(s[g].ac),0,255),l&&(z=z<=(typeof l=="number"?l:127)?0:255),i&&z<=o&&(L=M=P=a,z=0));let F=c?[L,M,P,z]:[L,M,P];if(Oe(v,F)||v.push(F),(g=s[g].fw)==0)break}return v}function Oe(r,e){for(let t=0;t<r.length;t++){let n=r[t],i=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(i&&a)return!0}return!1}function _e(r,e,t="rgb565"){if(!r||!r.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(r instanceof Uint8Array)&&!(r instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(r.buffer),i=n.length,a=t==="rgb444"?4096:65536,o=new Uint8Array(i),l=new Array(a);if(t==="rgba4444")for(let d=0;d<i;d++){let u=n[d],c=u>>24&255,s=u>>16&255,h=u>>8&255,p=u&255,f=me(p,h,s,c),m=f in l?l[f]:l[f]=Ve(p,h,s,c,e);o[d]=m}else{let d=t==="rgb444"?we:pe;for(let u=0;u<i;u++){let c=n[u],s=c>>16&255,h=c>>8&255,p=c&255,f=d(p,h,s),m=f in l?l[f]:l[f]=Qe(p,h,s,e);o[u]=m}}return o}function Ve(r,e,t,n,i){let a=0,o=1e100;for(let l=0;l<i.length;l++){let d=i[l],u=d[3],c=W(u-n);if(c>o)continue;let s=d[0];if(c+=W(s-r),c>o)continue;let h=d[1];if(c+=W(h-e),c>o)continue;let p=d[2];c+=W(p-t),!(c>o)&&(o=c,a=l)}return a}function Qe(r,e,t,n){let i=0,a=1e100;for(let o=0;o<n.length;o++){let l=n[o],d=l[0],u=W(d-r);if(u>a)continue;let c=l[1];if(u+=W(c-e),u>a)continue;let s=l[2];u+=W(s-t),!(u>a)&&(a=u,i=o)}return i}function W(r){return r*r}function ie(r={}){let{initialCapacity:e=4096,auto:t=!0}=r,n=ge(e),i=5003,a=new Uint8Array(256),o=new Int32Array(i),l=new Int32Array(i),d=!1;return{reset(){n.reset(),d=!1},finish(){n.writeByte(He.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:u,writeFrame(c,s,h,p={}){let{transparent:f=!1,transparentIndex:m=0,delay:g=0,palette:b=null,repeat:E=0,colorDepth:y=8,dispose:x=-1}=p,S=!1;if(t?d||(S=!0,u(),d=!0):S=!!p.first,s=Math.max(0,Math.floor(s)),h=Math.max(0,Math.floor(h)),S){if(!b)throw new Error("First frame must include a { palette } option");Xe(n,s,h,b,y),ae(n,b),E>=0&&Ke(n,E)}let A=Math.round(g/10);Ye(n,x,A,f,m);let w=!!b&&!S;Je(n,s,h,w?b:null),w&&ae(n,b),Ze(n,c,s,h,y,a,o,l)}};function u(){be(n,"GIF89a")}}function Ye(r,e,t,n,i){r.writeByte(33),r.writeByte(249),r.writeByte(4),i<0&&(i=0,n=!1);var a,o;n?(a=1,o=2):(a=0,o=0),e>=0&&(o=e&7),o<<=2,r.writeByte(0|o|0|a),U(r,t),r.writeByte(i||0),r.writeByte(0)}function Xe(r,e,t,n,i=8){let a=1,o=0,l=X(n.length)-1,d=a<<7|i-1<<4|o<<3|l;U(r,e),U(r,t),r.writeBytes([d,0,0])}function Ke(r,e){r.writeByte(33),r.writeByte(255),r.writeByte(11),be(r,"NETSCAPE2.0"),r.writeByte(3),r.writeByte(1),U(r,e),r.writeByte(0)}function ae(r,e){let t=1<<X(e.length);for(let n=0;n<t;n++){let i=[0,0,0];n<e.length&&(i=e[n]),r.writeByte(i[0]),r.writeByte(i[1]),r.writeByte(i[2])}}function Je(r,e,t,n){if(r.writeByte(44),U(r,0),U(r,0),U(r,e),U(r,t),n){let i=0,a=0,o=X(n.length)-1;r.writeByte(128|i|a|0|o)}else r.writeByte(0)}function Ze(r,e,t,n,i=8,a,o,l){Ge(t,n,e,i,r,a,o,l)}function U(r,e){r.writeByte(e&255),r.writeByte(e>>8&255)}function be(r,e){for(var t=0;t<e.length;t++)r.writeByte(e.charCodeAt(t))}function X(r){return Math.max(Math.ceil(Math.log2(r)),1)}class et{constructor(e){this.prefix=e.prefix||"",this.animatedGifHighQuality=e.animatedGifHighQuality!==!1,this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){k.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.successUrls=[],k.info("开始批量下载",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,k.info("批量下载完成",{success:this.successCount,failed:this.failedCount,successUrls:this.successUrls.length}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++,this.successUrls.push(e.src)}catch(i){k.error(`下载失败: ${e.src}`,i),this.failedCount++}this.processQueue()}async downloadFile(e,t){const n=e.startsWith("data:");try{const i=await fetch(e);if(!i.ok)throw new Error(`HTTP ${i.status}`);const a=await i.blob(),o=i.headers.get("content-type")||a.type||"",l=await this.prepareDownloadTarget(e,a,t,o),d=URL.createObjectURL(l.blob);this.triggerDownload(d,l.filename),setTimeout(()=>URL.revokeObjectURL(d),1e3)}catch{if(!n){k.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,t);return}this.downloadDataURL(e,t)}}async prepareDownloadTarget(e,t,n,i=""){const a=await this.normalizeFilenameByContentType(n,i,t);if(!this.isWebpResource(e,i))return{blob:t,filename:a};if(await this.isAnimatedWebp(t)){const d=this.animatedGifHighQuality?await this.convertAnimatedWebpToGif(t):await this.convertAnimatedWebpToGifLegacy(t);return d?{blob:d,filename:this.replaceExtension(a,"gif")}:(k.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(a,"webp")})}const l=await this.convertStaticWebpToPng(t);return l?{blob:l,filename:this.replaceExtension(a,"png")}:(k.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(a,"webp")})}async normalizeFilenameByContentType(e,t="",n){const i=this.mimeToExt(t);if(i)return this.replaceExtension(e,i);const a=await this.detectImageExtFromBlob(n);return a?this.replaceExtension(e,a):e}async detectImageExtFromBlob(e){if(!e||typeof e.arrayBuffer!="function")return null;try{const t=new Uint8Array(await e.slice(0,16).arrayBuffer());return t.length<4?null:t[0]===71&&t[1]===73&&t[2]===70&&t[3]===56?"gif":t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"png":t[0]===255&&t[1]===216&&t[2]===255?"jpg":t[0]===66&&t[1]===77?"bmp":t.length>=12&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80?"webp":null}catch(t){return k.debug("文件签名识别失败:",t),null}}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),i=(t||"").toLowerCase();return i.includes("image/webp")||i.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let i=12;for(;i+8<=n.length;){const a=this.readFourCC(n,i),o=new DataView(t).getUint32(i+4,!0),l=i+8,d=l+o;if(d>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&o>=1&&n[l]&2)return!0;i=d+o%2}return!1}catch(t){return k.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,i=t.height||t.naturalHeight||0;if(!n||!i)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=i;const o=a.getContext("2d");return o?(o.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(d=>{a.toBlob(u=>d(u),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return k.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const i=t.tracks.selectedTrack,a=(i==null?void 0:i.frameCount)||0;if(a<=0)return null;const o=ie(),l=document.createElement("canvas"),d=l.getContext("2d",{willReadFrequently:!0});if(!d)return null;const c=(await t.decode({frameIndex:0})).image,s=c.displayWidth||c.codedWidth,h=c.displayHeight||c.codedHeight;if(c.close(),!s||!h)return null;l.width=s,l.height=h;const p=await this.buildGlobalGifPalette({decoder:t,frameCount:a,width:s,height:h});if(!p||!p.palette||p.palette.length===0)return null;const{palette:f,paletteFormat:m,hasTransparency:g}=p;for(let b=0;b<a;b++){const y=(await t.decode({frameIndex:b})).image,x=y.displayWidth||y.codedWidth,S=y.displayHeight||y.codedHeight;d.clearRect(0,0,s,h),d.drawImage(y,0,0,x,S);const A=d.getImageData(0,0,s,h).data,w=this.applyPaletteWithFloydSteinberg(A,s,h,f,{hasTransparency:g,transparentIndex:0,alphaThreshold:16}),I={delay:this.toGifDelayMs(y.duration),dispose:1};g&&(I.transparent=!0,I.transparentIndex=0),b===0&&(I.palette=f,I.repeat=0),o.writeFrame(w,s,h,I),y.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async convertAnimatedWebpToGifLegacy(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const i=t.tracks.selectedTrack,a=(i==null?void 0:i.frameCount)||0;if(a<=0)return null;const o=ie();let l=null,d=null;for(let u=0;u<a;u++){const s=(await t.decode({frameIndex:u})).image,h=s.displayWidth||s.codedWidth,p=s.displayHeight||s.codedHeight;if(!l&&(l=document.createElement("canvas"),l.width=h,l.height=p,d=l.getContext("2d",{willReadFrequently:!0}),!d))return s.close(),null;d.clearRect(0,0,l.width,l.height),d.drawImage(s,0,0,h,p);const f=d.getImageData(0,0,l.width,l.height).data,m=re(f,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});m.unshift([0,0,0,0]);const g=_e(f,m,"rgba4444"),b=this.toGifDelayMs(s.duration);o.writeFrame(g,l.width,l.height,{palette:m,delay:b,repeat:u===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),s.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF（低清模式）失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async buildGlobalGifPalette({decoder:e,frameCount:t,width:n,height:i}){const a=document.createElement("canvas");a.width=n,a.height=i;const o=a.getContext("2d",{willReadFrequently:!0});if(!o)return null;const l=1,d=256*1024*1024,u=[];let c=0,s=!1;for(let g=0;g<t;g+=l){const E=(await e.decode({frameIndex:g})).image,y=E.displayWidth||E.codedWidth,x=E.displayHeight||E.codedHeight;o.clearRect(0,0,n,i),o.drawImage(E,0,0,y,x);const S=o.getImageData(0,0,n,i).data;!s&&this.hasTransparentPixels(S)&&(s=!0);const A=d-c;if(A<S.length){E.close();break}const w=this.sampleRgbaPixels(S,A);if(w&&w.length>0&&(u.push(w),c+=w.length),E.close(),c>=d)break}if(u.length===0)return null;const h=this.concatUint8Arrays(u,c),p=s?"rgba4444":"rgb565",m=re(h,s?255:256,{format:p,oneBitAlpha:s,clearAlpha:!1,clearAlphaThreshold:96,useSqrt:!0});return s&&m.unshift([0,0,0,0]),{palette:m,paletteFormat:p,hasTransparency:s}}hasTransparentPixels(e){if(!e||e.length<4)return!1;for(let t=3;t<e.length;t+=4)if(e[t]<16)return!0;return!1}applyPaletteWithFloydSteinberg(e,t,n,i,a={}){const o=!!a.hasTransparency,l=Number.isInteger(a.transparentIndex)?a.transparentIndex:0,d=Number.isFinite(a.alphaThreshold)?a.alphaThreshold:16,u=t*n,c=new Uint8Array(u),s=new Float32Array(e.length),h=new Map;for(let f=0;f<e.length;f++)s[f]=e[f];const p=o?1:0;for(let f=0;f<n;f++)for(let m=0;m<t;m++){const g=f*t+m,b=g*4,E=s[b+3];if(o&&E<d){c[g]=l;continue}const y=this.clampColor(s[b]),x=this.clampColor(s[b+1]),S=this.clampColor(s[b+2]),A=this.findNearestPaletteIndex(y,x,S,i,p,h),w=i[A]||[y,x,S];c[g]=A;const C=y-w[0],I=x-w[1],B=S-w[2];this.distributeDitherError(s,t,n,m,f,C,I,B)}return c}distributeDitherError(e,t,n,i,a,o,l,d){this.addDitherError(e,t,n,i+1,a,o,l,d,7/16),this.addDitherError(e,t,n,i-1,a+1,o,l,d,3/16),this.addDitherError(e,t,n,i,a+1,o,l,d,5/16),this.addDitherError(e,t,n,i+1,a+1,o,l,d,1/16)}addDitherError(e,t,n,i,a,o,l,d,u){if(i<0||a<0||i>=t||a>=n)return;const c=(a*t+i)*4;e[c]=this.clampColor(e[c]+o*u),e[c+1]=this.clampColor(e[c+1]+l*u),e[c+2]=this.clampColor(e[c+2]+d*u)}findNearestPaletteIndex(e,t,n,i,a,o){const l=e<<16|t<<8|n;if(o.has(l))return o.get(l);let d=a,u=Number.POSITIVE_INFINITY;for(let c=a;c<i.length;c++){const s=i[c],h=e-s[0],p=t-s[1],f=n-s[2],m=h*h+p*p+f*f;m<u&&(u=m,d=c)}return o.set(l,d),d}clampColor(e){return e<0?0:e>255?255:e}toGifDelayMs(e){const t=Number.isFinite(e)&&e>0?e:1e5,n=Math.round(t/1e3);return Math.max(20,n)}sampleRgbaPixels(e,t){if(!e||t<=0)return null;const n=Math.floor(e.length/4),i=Math.floor(t/4);return n<=0||i<=0||n>i?null:new Uint8Array(e)}concatUint8Arrays(e,t){const n=new Uint8Array(t);let i=0;return e.forEach(a=>{n.set(a,i),i+=a.length}),n}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const i=new Image,a=URL.createObjectURL(e);i.onload=()=>{URL.revokeObjectURL(a),t(i)},i.onerror=o=>{URL.revokeObjectURL(a),n(o)},i.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",i=(e||"download").split("?")[0],a=i.lastIndexOf(".");return a<=0?`${i}.${n}`:`${i.slice(0,a)}.${n}`}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}downloadDataURL(e,t){this.triggerDownload(e,t)}generateFilename(e,t){let n=this.getExtension(e);if(!n){const o=this.guessMimeType(e);n=this.mimeToExt(o)}const i=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${i}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){const t=String(e||"").toLowerCase().split(";")[0].trim();return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[t]||null}}function tt(r={}){const{target:e,handle:t=e,minWidth:n=300,minHeight:i=200,onResizeStart:a,onResize:o,onResizeEnd:l}=r;if(!e||!t)return()=>{};let d=!1,u=0,c=0,s=0,h=0;const p=g=>{g.preventDefault(),g.stopPropagation(),d=!0,u=g.clientX,c=g.clientY,s=e.offsetWidth,h=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",a==null||a(g)},f=g=>{if(!d)return;const b=g.clientX-u,E=g.clientY-c,y=Math.max(n,s+b),x=Math.max(i,h+E);e.style.width=`${y}px`,e.style.height=`${x}px`,o==null||o(g,{width:y,height:x})},m=g=>{d&&(d=!1,document.body.style.userSelect="",document.body.style.cursor="",l==null||l(g))};return t.addEventListener("mousedown",p),document.addEventListener("mousemove",f),document.addEventListener("mouseup",m),()=>{t.removeEventListener("mousedown",p),document.removeEventListener("mousemove",f),document.removeEventListener("mouseup",m)}}function nt(){const r=document.getElementById("id-panel");if(r)return r;const e=N("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
    <div class="id-panel-header">
      <span class="id-panel-title">📷 图片批量下载器</span>
      <button class="id-panel-close" id="id-close-btn" title="关闭">×</button>
    </div>
    <div class="id-enhancer-status" id="id-enhancer-status"></div>
    <div class="id-toolbar">
      <button class="id-btn id-btn-primary" id="id-capture" title="快捷键: Ctrl+Shift+I">
        <span>🔍</span> 捕获图片
      </button>
      <button class="id-btn" id="id-select-all">全选</button>
      <button class="id-btn" id="id-select-none">全不选</button>
      <button class="id-btn id-btn-success" id="id-download" disabled>
        下载选中
      </button>
      <button class="id-btn id-btn-warning" id="id-clear-storage">清除存储</button>
      <label
        class="id-switch-label"
        title="清晰下载速度更慢，体积更大"
      >
        <input type="checkbox" id="id-gif-quality-toggle" checked />
        动图清晰模式
      </label>
      <div class="id-toolbar-spacer"></div>
      <label class="id-prefix-label">
        文件前缀:
        <input type="text" id="id-prefix" class="id-input" placeholder="如: photo" />
      </label>
    </div>
    <div class="id-image-grid"></div>
    <div class="id-panel-footer">
      <span class="id-status">点击「捕获图片」开始</span>
      <span class="id-downloaded-count" id="id-downloaded-count">历史下载数: 0</span>
    </div>
    <div class="id-resize-handle"></div>
  `,document.body.appendChild(e),rt(e),it(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{Q()}),e}function rt(r){const e=r.querySelector(".id-panel-header");he({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".id-panel-close")})}function it(r){const e=r.querySelector(".id-resize-handle");e&&tt({target:r,handle:e,minWidth:300,minHeight:200})}function ye(){try{return window.top===window.self}catch{return!1}}ye()&&xe(ve);const at="i";var se,le;const V=(le=(se=$.imageDownloader)==null?void 0:se.storageKeys)==null?void 0:le.downloadHistory;var ce,de;const oe=(de=(ce=$.imageDownloader)==null?void 0:ce.storageKeys)==null?void 0:de.gifQualityMode;function ot(r){return r==="low"?"low":"high"}(function(){if(!ye()||window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let r=[],e=[];const t=[];let n=!0,i=!0;function a(h){h&&(h.textContent=`历史下载数: ${t.length}`)}function o(h){return h&&typeof h=="object"&&typeof h.url=="string"&&h.url?{url:h.url,downloadedAt:typeof h.downloadedAt=="string"?h.downloadedAt:null}:null}async function l(h){try{const p=await J(V,[]);Array.isArray(p)&&p.forEach(f=>{const m=o(f);m&&t.push(m)}),a(h),k.info("已加载下载历史",{count:t.length})}catch(p){k.error("读取下载历史失败",p),a(h)}}async function d(){try{await j(V,t),k.debug("下载历史已保存",{count:t.length})}catch(h){k.error("保存下载历史失败",h)}}function u(h,p){document.addEventListener("keydown",f=>{const m=String(f.key||"").toLowerCase();if(f.ctrlKey&&f.shiftKey&&m===at){if(f.preventDefault(),!i)return;i=!1;const g=document.getElementById("id-panel");(!g||g.style.display==="none"||g.style.display==="")&&fe(),k.info("快捷键触发图片捕获"),r=new ee().getAllImages(),h.render(r),p&&(p.textContent=`已捕获 ${r.length} 张图片`),k.info("快捷键捕获完成",{count:r.length}),setTimeout(()=>{i=!0},500)}})}async function c(){k.info("imageDownloader 初始化开始",{logLevel:$.logLevel});const h=nt(),p=Pe(),f=h.querySelector("#id-enhancer-status");if(p){const v=ze(p);f.textContent=`✨ 当前网站已启用增强：${v}`,f.classList.add("active")}else f.textContent="",f.classList.remove("active");Se({onToggle:ke}),Q();const m=h.querySelector(".id-image-grid"),g=h.querySelector("#id-select-all"),b=h.querySelector("#id-select-none"),E=h.querySelector("#id-download"),y=h.querySelector("#id-clear-storage"),x=h.querySelector("#id-capture"),S=h.querySelector("#id-prefix"),A=h.querySelector("#id-gif-quality-toggle"),w=h.querySelector(".id-status"),C=h.querySelector("#id-downloaded-count");await l(C);try{n=ot(await J(oe,"high"))!=="low"}catch(v){k.warn("读取 GIF 画质模式失败，使用默认清晰模式",v),n=!0}A&&(A.checked=n,A.addEventListener("change",async()=>{n=!!A.checked;try{await j(oe,n?"high":"low")}catch(v){k.warn("保存 GIF 画质模式失败",v)}w.textContent=n?"动态图画质：清晰（更慢、更大）":"动态图画质：标准（更快、更小）"}));const I=new Fe({grid:m,onSelectionChange:v=>{e=v,B()}});u(I,w),x.addEventListener("click",()=>{k.info("开始手动捕获图片"),r=new ee().getAllImages(),I.render(r),w.textContent=`已捕获 ${r.length} 张图片`,k.info("手动捕获完成",{count:r.length})}),g.addEventListener("click",()=>{I.selectAll()}),b.addEventListener("click",()=>{I.selectNone()}),y.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){t.length=0;try{await j(V,[]),a(C),w.textContent="存储已清除",k.info("图片脚本存储已清除")}catch(T){w.textContent="清除存储失败",k.error("清除图片脚本存储失败",T)}}}),E.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const v=[...e],T=S.value||D();k.info("开始下载选中图片",{count:v.length,prefix:T}),new et({prefix:T,animatedGifHighQuality:n,onProgress:(M,P)=>{w.textContent=`下载中: ${M}/${P}`},onComplete:async(M,P,z=[])=>{if(w.textContent=`完成: 成功 ${M}, 失败 ${P}`,z.length>0){const F=new Date().toISOString();z.forEach(H=>{typeof H=="string"&&H&&t.push({url:H,downloadedAt:F})}),a(C),await d()}k.info("下载流程完成",{success:M,failed:P,historyAdded:z.length,historyTotal:t.length})}}).download(v)});function B(){const v=e.length;E.disabled=v===0,E.textContent=v===0?"下载选中":`下载选中 (${v})`}function D(){const v=new Date,T=String(v.getMonth()+1).padStart(2,"0"),L=String(v.getDate()).padStart(2,"0"),M=String(v.getHours()).padStart(2,"0"),P=String(v.getMinutes()).padStart(2,"0");return`${T}${L}${M}${P}`}B(),k.info("imageDownloader 初始化完成",{downloadedCount:t.length})}function s(){c().catch(h=>{k.error("imageDownloader 初始化失败",h)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",s):s()})();
