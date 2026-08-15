// ==UserScript==
// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_download
// ==/UserScript==

function z(r,e={},t="",n=""){const i=document.createElement(r);for(const[a,o]of Object.entries(e))if(a==="className")i.className=o;else if(a==="dataset")for(const[s,l]of Object.entries(o))i.dataset[s]=l;else a.startsWith("on")?i.addEventListener(a.slice(2).toLowerCase(),o):i.setAttribute(a,o);return t?i.innerHTML=t:n&&(i.textContent=n),i}function $e(r){const e=z("style",{type:"text/css"});return e.textContent=r,document.head.appendChild(e),e}const j={logLevel:"info",storagePrefix:"userscript_",imageDownloader:{storageKeys:{downloadHistory:"imageDownloader_download_history",gifQualityMode:"imageDownloader_gif_quality_mode"},autoCapture:{minScanInterval:200,fallbackInterval:1e3}}};function ke(r){return j.storagePrefix+r}const le={debug:0,info:1,warn:2,error:3};function V(r,e,...t){const n=le[j.logLevel];if(le[r]<n)return;const i=`[${r.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(r){case"debug":case"info":console.log(`${i} [${a}]`,e,...t);break;case"warn":console.warn(`${i} [${a}]`,e,...t);break;case"error":console.error(`${i} [${a}]`,e,...t);break}}const k={debug:(r,...e)=>V("debug",r,...e),info:(r,...e)=>V("info",r,...e),warn:(r,...e)=>V("warn",r,...e),error:(r,...e)=>V("error",r,...e)};async function ee(r,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(ke(r),n),t()})}async function de(r,e=null){const t=await GM_getValue(ke(r));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const We=`/**
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

.id-auto-capture-label.is-active {
  color: #276749;
  background: #f0fff4;
  border-color: #48bb78;
  box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.12);
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
`;function Ae(r){const{target:e,handle:t=e,onClick:n,shouldStart:i,dragThreshold:a=4,clampToViewport:o=!0,dragClassName:s,bodyCursor:l="",removeTransformOnStart:u=!1,onDragStart:d,onDrag:c,onDragEnd:p}=r||{};if(!e||!t)return()=>{};let m=null,g=0,f=0,h=0,b=0,S=!1,w=!1;const y=C=>{if(n){if(w){C.preventDefault(),C.stopPropagation(),w=!1;return}n(C)}},I=C=>{if(C.pointerType==="mouse"&&C.button!==0||typeof i=="function"&&!i(C))return;const v=e.getBoundingClientRect();g=C.clientX,f=C.clientY,h=v.left,b=v.top,S=!1,m=C.pointerId,e.style.left=`${h}px`,e.style.top=`${b}px`,e.style.right="auto",e.style.bottom="auto",u&&(e.style.transform="none"),s&&e.classList.add(s),t.setPointerCapture(m),document.body.style.userSelect="none",l&&(document.body.style.cursor=l),typeof d=="function"&&d(C),C.preventDefault()},L=C=>{if(C.pointerId!==m)return;const v=C.clientX-g,M=C.clientY-f;if(!S&&Math.hypot(v,M)>=a&&(S=!0,w=!0),!S)return;let D=h+v,A=b+M;if(o){const B=Math.max(0,window.innerWidth-e.offsetWidth),T=Math.max(0,window.innerHeight-e.offsetHeight);D=Math.max(0,Math.min(D,B)),A=Math.max(0,Math.min(A,T))}e.style.left=`${D}px`,e.style.top=`${A}px`,typeof c=="function"&&c(C)},x=C=>{C.pointerId===m&&(t.hasPointerCapture(m)&&t.releasePointerCapture(m),m=null,s&&e.classList.remove(s),document.body.style.userSelect="",l&&(document.body.style.cursor=""),typeof p=="function"&&p(C))};return t.addEventListener("click",y),t.addEventListener("pointerdown",I),t.addEventListener("pointermove",L),t.addEventListener("pointerup",x),t.addEventListener("pointercancel",x),()=>{t.removeEventListener("click",y),t.removeEventListener("pointerdown",I),t.removeEventListener("pointermove",L),t.removeEventListener("pointerup",x),t.removeEventListener("pointercancel",x)}}const Fe=30,He=30;function ue(r){if(!r)return;const e=r.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),n=Math.max(1,window.innerHeight-e.height);r.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),r.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/n)))}function qe(r){if(!r)return;const e=Number(r.dataset.ratioX),t=Number(r.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const n=Math.max(0,window.innerWidth-r.offsetWidth),i=Math.max(0,window.innerHeight-r.offsetHeight);r.style.left=`${Math.round(n*e)}px`,r.style.top=`${Math.round(i*t)}px`,r.style.right="auto",r.style.bottom="auto"}function Oe(r){const e=document.getElementById("id-floating-btn");if(e)return e;const t=z("div",{id:"id-floating-btn",title:"图片批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);return document.body.appendChild(t),t.style.right=`${Fe}px`,t.style.bottom=`${He}px`,Ae({target:t,onClick:()=>r.onToggle(),dragClassName:"dragging",onDragEnd:()=>{ue(t)}}),requestAnimationFrame(()=>{ue(t)}),window.addEventListener("resize",()=>{qe(t)}),t}function Le(){const r=document.getElementById("id-panel");r&&(r.style.display="flex",r.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function ie(){const r=document.getElementById("id-panel");r&&(r.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function Ge(){const r=document.getElementById("id-panel");r&&(r.style.display==="none"||r.style.display===""?Le():ie())}const _e={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(r){if(!this.urlPattern.test(r))return r;const e=r.indexOf("?"),t=e===-1?r:r.slice(0,e),n=e===-1?"":r.slice(e),i=t.indexOf("@");if(i===-1)return r;const a=t.slice(0,i),s=t.slice(i+1).match(/\.([a-z0-9]+)$/i),l=s?s[1].toLowerCase():"";return l==="avif"||l==="awebp"||l==="webp"?`${a}@3840w.${l}${n}`:`${a}@3840w${n}`}},je={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(r){return r}},Ve={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(r){return r}},Qe={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(r){return r.replace(/_\w+(\.\w+)$/i,"$1")}},ae=[_e,je,Ve,Qe];function Ye(r){for(const e of ae)if(e.urlPattern.test(r))return e;return null}function Xe(r){const e=window.location.href;for(const t of ae)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function Ke(r){const e=Xe();return e?e.name:null}function Je(r){const e=ae.find(t=>t.name===r);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||r}function Ze(r){const e=Ye(r);return e?e.enhance(r):r}const et="#id-panel, #id-floating-btn";class tt{getAllImages(){const e=[],t=new Set;this.rectCache=new WeakMap,this.pathSegmentCache=new WeakMap,document.querySelectorAll("img").forEach(u=>{this.processImageElement(u,"img",t,e)}),document.querySelectorAll("image").forEach(u=>{var c;const d=this.getImageSrc(((c=u.href)==null?void 0:c.baseVal)||u.getAttribute("href"));d&&!t.has(d)&&(t.add(d),e.push(this.createImageInfo(d,"svg-image",u)))});const a=document.querySelectorAll("*");return a.forEach(u=>{if(this.isDownloaderUiElement(u))return;const c=window.getComputedStyle(u).backgroundImage;c&&c!=="none"&&this.extractUrls(c).forEach(m=>{const g=this.getImageSrc(m);g&&!t.has(g)&&(t.add(g),e.push(this.createImageInfo(g,"background",u)))})}),document.querySelectorAll("source").forEach(u=>{var c,p,m;const d=this.getImageSrc((m=(p=(c=u.srcset)==null?void 0:c.split(",")[0])==null?void 0:p.trim())==null?void 0:m.split(" ")[0]);d&&!t.has(d)&&(t.add(d),e.push(this.createImageInfo(d,"source",u)))}),a.forEach(u=>{this.processLazySrc(u,t,e)}),document.querySelectorAll("video, audio").forEach(u=>{const d=u.getAttribute("poster");if(d){const c=this.getImageSrc(d);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"media-poster",u)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(u=>{const d=this.getImageSrc(u.href);d&&!t.has(d)&&(t.add(d),e.push(this.createImageInfo(d,"icon",u)))}),e.filter(u=>this.isValidImage(u.src))}processImageElement(e,t,n,i){var o,s,l;if(this.isDownloaderUiElement(e))return;const a=this.getImageSrc(e.src)||this.getImageSrc((o=e.dataset)==null?void 0:o.src)||this.getImageSrc((s=e.dataset)==null?void 0:s.original)||this.getImageSrc((l=e.dataset)==null?void 0:l.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),i.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){if(this.isDownloaderUiElement(e))return;["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var s,l,u;let o=((s=e.dataset)==null?void 0:s[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&o)try{const d=JSON.parse(o);o=d.src||d.url||d.original}catch{}if(o){(a.includes("srcset")||a==="data-srcset")&&(o=(u=(l=o.split(",")[0])==null?void 0:l.trim())==null?void 0:u.split(" ")[0]);const d=this.getImageSrc(o);d&&!t.has(d)&&(t.add(d),n.push(this.createImageInfo(d,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(i=>e.toLowerCase().includes(i))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=Ze(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let i;for(;(i=n.exec(e))!==null;)t.push(i[1]);return t}isValidImage(e){if(!e||typeof e!="string")return!1;const t=e.trim();if(!t)return!1;const n=t.toLowerCase();if(n.startsWith("javascript:")||n.startsWith("vbscript:")||n.startsWith("mailto:")||n.startsWith("tel:"))return!1;if(n.startsWith("data:"))return n.startsWith("data:image/");if(n.startsWith("blob:"))return!0;try{const i=new URL(t,window.location.href);return i.protocol==="http:"||i.protocol==="https:"}catch{return!1}}createImageInfo(e,t,n){const i=this.getDomMetadata(n);return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n,...i}}isDownloaderUiElement(e){var t;return!!((t=e==null?void 0:e.closest)!=null&&t.call(e,et))}getDomMetadata(e){if(!(e instanceof Element))return{domPath:[],pageRect:this.createEmptyRect(),ancestorRects:[]};const t=[];let n=e;for(;n instanceof Element;)t.push(n),n=n.parentElement;t.reverse();const i=t.map(a=>this.getContentRect(a));return{domPath:t.map(a=>this.getPathSegment(a)),pageRect:i[i.length-1]||this.createEmptyRect(),ancestorRects:i}}getPathSegment(e){var s,l;const t=(s=this.pathSegmentCache)==null?void 0:s.get(e);if(t)return t;const n=String(e.tagName||"element").toLowerCase();let i=1,a=e.previousElementSibling;for(;a;)a.tagName===e.tagName&&(i+=1),a=a.previousElementSibling;const o=`${n}:nth-of-type(${i})`;return(l=this.pathSegmentCache)==null||l.set(e,o),o}getContentRect(e){var p,m;const t=(p=this.rectCache)==null?void 0:p.get(e);if(t)return t;const n=e.getBoundingClientRect();let i=0,a=0,o=e.parentElement;for(;o;)o!==document.scrollingElement&&(i+=Number(o.scrollTop||0),a+=Number(o.scrollLeft||0)),o=o.parentElement;const s=Number(n.top||0)+Number(window.scrollY||0)+i,l=Number(n.left||0)+Number(window.scrollX||0)+a,u=Math.max(0,Number(n.width||0)),d=Math.max(0,Number(n.height||0)),c={top:s,left:l,width:u,height:d,right:l+u,bottom:s+d};return(m=this.rectCache)==null||m.set(e,c),c}createEmptyRect(){return{top:0,left:0,width:0,height:0,right:0,bottom:0}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class nt{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,n)=>{const i=this.createResourceItem(t,n);this.grid.appendChild(i)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const n=this.resources[e];if(!this.isSelectable(n,e)){const i=this.getDisabledReason(n,e);t.title=i||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const n=z("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(n.classList.add("unselectable"),n.title=this.getDisabledReason(e,t)||"",n.setAttribute("aria-disabled","true"));const i={toggle:()=>this.toggle(t),createElement:z,updateResource:l=>{if(!(!l||typeof l!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],l);return}this.resources[t]={...l}}}},a=this.createThumbnail(e,t,i);a&&n.appendChild(a);const o=z("div",{className:this.classNames.checkbox,onClick:l=>{l.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),s=this.createInfo(e,t,i);return n.appendChild(o),s&&n.appendChild(s),n}defaultCreateThumbnail(e,t,n){const i=z("div",{className:this.classNames.thumb}),a=z("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return i.appendChild(a),i.addEventListener("click",()=>n.toggle()),i}defaultCreateInfo(e){const t=z("div",{className:this.classNames.info}),n=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(z("span",{},this.truncate(n,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const n=parseInt(t.dataset.index||"-1",10);this.selected.has(n)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var i;if(!e)return"未命名";const t=String(e).split("/"),n=((i=t[t.length-1])==null?void 0:i.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function rt(r){var n;if(!r)return"未命名";const e=String(r).split("/"),t=((n=e[e.length-1])==null?void 0:n.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function it(r,e){return!r||r.length<=e?r:r.substring(0,e-3)+"..."}class at extends nt{constructor(e){super({...e,emptyText:"未找到图片",classNames:{item:"id-image-item",selected:"selected",empty:"id-empty",thumb:"id-image-thumb",checkbox:"id-checkbox",info:"id-image-info"},createThumbnail:(t,n,i)=>{const a=i.createElement("div",{className:"id-image-thumb"}),o=i.createElement("img",{src:t.src,alt:t.alt||`图片 ${n+1}`,loading:"lazy",onerror:()=>{o.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});return o.onload=()=>{o.naturalWidth>0&&i.updateResource({width:o.naturalWidth,height:o.naturalHeight})},a.appendChild(o),a.addEventListener("click",()=>{i.toggle()}),a},createInfo:(t,n,i)=>{const a=i.createElement("div",{className:"id-image-info"}),o=rt(t.src),s=i.createElement("span",{className:"id-size"});return s.textContent=t.width&&t.height?`${t.width}×${t.height}`:"",a.appendChild(i.createElement("span",{className:"id-filename",title:t.src},it(o,20))),a.appendChild(s),a}})}render(e,t={}){const n=!!t.preserveSelection,i=n?new Set(this.getSelectedResources().map(o=>o==null?void 0:o.src).filter(Boolean)):new Set,a=this.grid.scrollTop;super.render(e),n&&i.size>0&&(this.resources.forEach((o,s)=>{i.has(o==null?void 0:o.src)&&this.selected.add(s)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())),n&&(this.grid.scrollTop=a)}getSelectedImages(){return this.getSelectedResources()}}var ot={trailer:59};function Me(r=256){let e=0,t=new Uint8Array(r);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(i){n(e+1),t[e]=i,e++},writeBytes(i,a=0,o=i.length){n(e+o);for(let s=0;s<o;s++)t[e++]=i[s+a]},writeBytesView(i,a=0,o=i.byteLength){n(e+o),t.set(i.subarray(a,a+o),e),e+=o}};function n(i){var a=t.length;if(a>=i)return;var o=1024*1024;i=Math.max(i,a*(a<o?2:1.125)>>>0),a!=0&&(i=Math.max(i,256));let s=t;t=new Uint8Array(i),e>0&&t.set(s.subarray(0,e),0)}}var te=12,he=5003,st=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function ct(r,e,t,n,i=Me(512),a=new Uint8Array(256),o=new Int32Array(he),s=new Int32Array(he)){let l=o.length,u=Math.max(2,n);a.fill(0),s.fill(0),o.fill(-1);let d=0,c=0,p=u+1,m=p,g=!1,f=m,h=(1<<f)-1,b=1<<p-1,S=b+1,w=b+2,y=0,I=t[0],L=0;for(let v=l;v<65536;v*=2)++L;L=8-L,i.writeByte(u),C(b);let x=t.length;for(let v=1;v<x;v++)e:{let M=t[v],D=(M<<te)+I,A=M<<L^I;if(o[A]===D){I=s[A];break e}let B=A===0?1:l-A;for(;o[A]>=0;)if(A-=B,A<0&&(A+=l),o[A]===D){I=s[A];break e}C(I),I=M,w<1<<te?(s[A]=w++,o[A]=D):(o.fill(-1),w=b+2,g=!0,C(b))}return C(I),C(S),i.writeByte(0),i.bytesView();function C(v){for(d&=st[c],c>0?d|=v<<c:d=v,c+=f;c>=8;)a[y++]=d&255,y>=254&&(i.writeByte(y),i.writeBytesView(a,0,y),y=0),d>>=8,c-=8;if((w>h||g)&&(g?(f=m,h=(1<<f)-1,g=!1):(++f,h=f===te?1<<f:(1<<f)-1)),v==S){for(;c>0;)a[y++]=d&255,y>=254&&(i.writeByte(y),i.writeBytesView(a,0,y),y=0),d>>=8,c-=8;y>0&&(i.writeByte(y),i.writeBytesView(a,0,y),y=0)}}}var lt=ct;function Be(r,e,t){return r<<8&63488|e<<2&992|t>>3}function Te(r,e,t,n){return r>>4|e&240|(t&240)<<4|(n&240)<<8}function De(r,e,t){return r>>4<<8|e&240|t>>4}function Q(r,e,t){return r<e?e:r>t?t:r}function X(r){return r*r}function fe(r,e,t){var n=0,i=1e100;let a=r[e],o=a.cnt;a.ac;let s=a.rc,l=a.gc,u=a.bc;for(var d=a.fw;d!=0;d=r[d].fw){let p=r[d],m=p.cnt,g=o*m/(o+m);if(!(g>=i)){var c=0;c+=g*X(p.rc-s),!(c>=i)&&(c+=g*X(p.gc-l),!(c>=i)&&(c+=g*X(p.bc-u),!(c>=i)&&(i=c,n=d)))}}a.err=i,a.nn=n}function ne(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function dt(r,e){let t=e==="rgb444"?4096:65536,n=new Array(t),i=r.length;if(e==="rgba4444")for(let a=0;a<i;++a){let o=r[a],s=o>>24&255,l=o>>16&255,u=o>>8&255,d=o&255,c=Te(d,u,l,s),p=c in n?n[c]:n[c]=ne();p.rc+=d,p.gc+=u,p.bc+=l,p.ac+=s,p.cnt++}else if(e==="rgb444")for(let a=0;a<i;++a){let o=r[a],s=o>>16&255,l=o>>8&255,u=o&255,d=De(u,l,s),c=d in n?n[d]:n[d]=ne();c.rc+=u,c.gc+=l,c.bc+=s,c.cnt++}else for(let a=0;a<i;++a){let o=r[a],s=o>>16&255,l=o>>8&255,u=o&255,d=Be(u,l,s),c=d in n?n[d]:n[d]=ne();c.rc+=u,c.gc+=l,c.bc+=s,c.cnt++}return n}function ge(r,e,t={}){let{format:n="rgb565",clearAlpha:i=!0,clearAlphaColor:a=0,clearAlphaThreshold:o=0,oneBitAlpha:s=!1}=t;if(!r||!r.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(r instanceof Uint8Array)&&!(r instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let l=new Uint32Array(r.buffer),u=t.useSqrt!==!1,d=n==="rgba4444",c=dt(l,n),p=c.length,m=p-1,g=new Uint32Array(p+1);for(var f=0,h=0;h<p;++h){let T=c[h];if(T!=null){var b=1/T.cnt;d&&(T.ac*=b),T.rc*=b,T.gc*=b,T.bc*=b,c[f++]=T}}X(e)/f<.022&&(u=!1);for(var h=0;h<f-1;++h)c[h].fw=h+1,c[h+1].bk=h,u&&(c[h].cnt=Math.sqrt(c[h].cnt));u&&(c[h].cnt=Math.sqrt(c[h].cnt));var S,w,y;for(h=0;h<f;++h){fe(c,h);var I=c[h].err;for(w=++g[0];w>1&&(y=w>>1,!(c[S=g[y]].err<=I));w=y)g[w]=S;g[w]=h}var L=f-e;for(h=0;h<L;){for(var x;;){var C=g[1];if(x=c[C],x.tm>=x.mtm&&c[x.nn].mtm<=x.tm)break;x.mtm==m?C=g[1]=g[g[0]--]:(fe(c,C),x.tm=h);var I=c[C].err;for(w=1;(y=w+w)<=g[0]&&(y<g[0]&&c[g[y]].err>c[g[y+1]].err&&y++,!(I<=c[S=g[y]].err));w=y)g[w]=S;g[w]=C}var v=c[x.nn],M=x.cnt,D=v.cnt,b=1/(M+D);d&&(x.ac=b*(M*x.ac+D*v.ac)),x.rc=b*(M*x.rc+D*v.rc),x.gc=b*(M*x.gc+D*v.gc),x.bc=b*(M*x.bc+D*v.bc),x.cnt+=v.cnt,x.mtm=++h,c[v.bk].fw=v.fw,c[v.fw].bk=v.bk,v.mtm=m}let A=[];var B=0;for(h=0;;++B){let T=Q(Math.round(c[h].rc),0,255),$=Q(Math.round(c[h].gc),0,255),G=Q(Math.round(c[h].bc),0,255),U=255;d&&(U=Q(Math.round(c[h].ac),0,255),s&&(U=U<=(typeof s=="number"?s:127)?0:255),i&&U<=o&&(T=$=G=a,U=0));let q=d?[T,$,G,U]:[T,$,G];if(ut(A,q)||A.push(q),(h=c[h].fw)==0)break}return A}function ut(r,e){for(let t=0;t<r.length;t++){let n=r[t],i=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(i&&a)return!0}return!1}function ht(r,e,t="rgb565"){if(!r||!r.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(r instanceof Uint8Array)&&!(r instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(r.buffer),i=n.length,a=t==="rgb444"?4096:65536,o=new Uint8Array(i),s=new Array(a);if(t==="rgba4444")for(let l=0;l<i;l++){let u=n[l],d=u>>24&255,c=u>>16&255,p=u>>8&255,m=u&255,g=Te(m,p,c,d),f=g in s?s[g]:s[g]=ft(m,p,c,d,e);o[l]=f}else{let l=t==="rgb444"?De:Be;for(let u=0;u<i;u++){let d=n[u],c=d>>16&255,p=d>>8&255,m=d&255,g=l(m,p,c),f=g in s?s[g]:s[g]=gt(m,p,c,e);o[u]=f}}return o}function ft(r,e,t,n,i){let a=0,o=1e100;for(let s=0;s<i.length;s++){let l=i[s],u=l[3],d=O(u-n);if(d>o)continue;let c=l[0];if(d+=O(c-r),d>o)continue;let p=l[1];if(d+=O(p-e),d>o)continue;let m=l[2];d+=O(m-t),!(d>o)&&(o=d,a=s)}return a}function gt(r,e,t,n){let i=0,a=1e100;for(let o=0;o<n.length;o++){let s=n[o],l=s[0],u=O(l-r);if(u>a)continue;let d=s[1];if(u+=O(d-e),u>a)continue;let c=s[2];u+=O(c-t),!(u>a)&&(a=u,i=o)}return i}function O(r){return r*r}function pe(r={}){let{initialCapacity:e=4096,auto:t=!0}=r,n=Me(e),i=5003,a=new Uint8Array(256),o=new Int32Array(i),s=new Int32Array(i),l=!1;return{reset(){n.reset(),l=!1},finish(){n.writeByte(ot.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:u,writeFrame(d,c,p,m={}){let{transparent:g=!1,transparentIndex:f=0,delay:h=0,palette:b=null,repeat:S=0,colorDepth:w=8,dispose:y=-1}=m,I=!1;if(t?l||(I=!0,u(),l=!0):I=!!m.first,c=Math.max(0,Math.floor(c)),p=Math.max(0,Math.floor(p)),I){if(!b)throw new Error("First frame must include a { palette } option");mt(n,c,p,b,w),me(n,b),S>=0&&bt(n,S)}let L=Math.round(h/10);pt(n,y,L,g,f);let x=!!b&&!I;wt(n,c,p,x?b:null),x&&me(n,b),yt(n,d,c,p,w,a,o,s)}};function u(){Pe(n,"GIF89a")}}function pt(r,e,t,n,i){r.writeByte(33),r.writeByte(249),r.writeByte(4),i<0&&(i=0,n=!1);var a,o;n?(a=1,o=2):(a=0,o=0),e>=0&&(o=e&7),o<<=2,r.writeByte(0|o|0|a),F(r,t),r.writeByte(i||0),r.writeByte(0)}function mt(r,e,t,n,i=8){let a=1,o=0,s=oe(n.length)-1,l=a<<7|i-1<<4|o<<3|s;F(r,e),F(r,t),r.writeBytes([l,0,0])}function bt(r,e){r.writeByte(33),r.writeByte(255),r.writeByte(11),Pe(r,"NETSCAPE2.0"),r.writeByte(3),r.writeByte(1),F(r,e),r.writeByte(0)}function me(r,e){let t=1<<oe(e.length);for(let n=0;n<t;n++){let i=[0,0,0];n<e.length&&(i=e[n]),r.writeByte(i[0]),r.writeByte(i[1]),r.writeByte(i[2])}}function wt(r,e,t,n){if(r.writeByte(44),F(r,0),F(r,0),F(r,e),F(r,t),n){let i=0,a=0,o=oe(n.length)-1;r.writeByte(128|i|a|0|o)}else r.writeByte(0)}function yt(r,e,t,n,i=8,a,o,s){lt(t,n,e,i,r,a,o,s)}function F(r,e){r.writeByte(e&255),r.writeByte(e>>8&255)}function Pe(r,e){for(var t=0;t<e.length;t++)r.writeByte(e.charCodeAt(t))}function oe(r){return Math.max(Math.ceil(Math.log2(r)),1)}class xt{constructor(e){this.prefix=e.prefix||"",this.animatedGifHighQuality=e.animatedGifHighQuality!==!1,this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){k.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.successUrls=[],k.info("开始批量下载",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,k.info("批量下载完成",{success:this.successCount,failed:this.failedCount,successUrls:this.successUrls.length}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++,this.successUrls.push(e.src)}catch(i){k.error(`下载失败: ${e.src}`,i),this.failedCount++}this.processQueue()}async downloadFile(e,t){try{const n=await fetch(e);if(!n.ok)throw new Error(`HTTP ${n.status}`);const i=await n.blob(),a=n.headers.get("content-type")||i.type||"",o=await this.prepareDownloadTarget(e,i,t,a);await this.downloadViaGM(o.blob,o.filename)}catch{k.warn(`fetch 下载失败，直接使用 GM_download: ${e}`),await this.downloadViaGM(e,t)}}async prepareDownloadTarget(e,t,n,i=""){const a=await this.normalizeFilenameByContentType(n,i,t);if(!this.isWebpResource(e,i))return{blob:t,filename:a};if(await this.isAnimatedWebp(t)){const l=this.animatedGifHighQuality?await this.convertAnimatedWebpToGif(t):await this.convertAnimatedWebpToGifLegacy(t);return l?{blob:l,filename:this.replaceExtension(a,"gif")}:(k.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(a,"webp")})}const s=await this.convertStaticWebpToPng(t);return s?{blob:s,filename:this.replaceExtension(a,"png")}:(k.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(a,"webp")})}async normalizeFilenameByContentType(e,t="",n){const i=this.mimeToExt(t);if(i)return this.replaceExtension(e,i);const a=await this.detectImageExtFromBlob(n);return a?this.replaceExtension(e,a):e}async detectImageExtFromBlob(e){if(!e||typeof e.arrayBuffer!="function")return null;try{const t=new Uint8Array(await e.slice(0,16).arrayBuffer());return t.length<4?null:t[0]===71&&t[1]===73&&t[2]===70&&t[3]===56?"gif":t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"png":t[0]===255&&t[1]===216&&t[2]===255?"jpg":t[0]===66&&t[1]===77?"bmp":t.length>=12&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80?"webp":null}catch(t){return k.debug("文件签名识别失败:",t),null}}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),i=(t||"").toLowerCase();return i.includes("image/webp")||i.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let i=12;for(;i+8<=n.length;){const a=this.readFourCC(n,i),o=new DataView(t).getUint32(i+4,!0),s=i+8,l=s+o;if(l>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&o>=1&&n[s]&2)return!0;i=l+o%2}return!1}catch(t){return k.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,i=t.height||t.naturalHeight||0;if(!n||!i)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=i;const o=a.getContext("2d");return o?(o.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(l=>{a.toBlob(u=>l(u),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return k.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const i=t.tracks.selectedTrack,a=(i==null?void 0:i.frameCount)||0;if(a<=0)return null;const o=pe(),s=document.createElement("canvas"),l=s.getContext("2d",{willReadFrequently:!0});if(!l)return null;const d=(await t.decode({frameIndex:0})).image,c=d.displayWidth||d.codedWidth,p=d.displayHeight||d.codedHeight;if(d.close(),!c||!p)return null;s.width=c,s.height=p;const m=await this.buildGlobalGifPalette({decoder:t,frameCount:a,width:c,height:p});if(!m||!m.palette||m.palette.length===0)return null;const{palette:g,paletteFormat:f,hasTransparency:h}=m;for(let b=0;b<a;b++){const w=(await t.decode({frameIndex:b})).image,y=w.displayWidth||w.codedWidth,I=w.displayHeight||w.codedHeight;l.clearRect(0,0,c,p),l.drawImage(w,0,0,y,I);const L=l.getImageData(0,0,c,p).data,x=this.applyPaletteWithFloydSteinberg(L,c,p,g,{hasTransparency:h,transparentIndex:0,alphaThreshold:16}),v={delay:this.toGifDelayMs(w.duration),dispose:1};h&&(v.transparent=!0,v.transparentIndex=0),b===0&&(v.palette=g,v.repeat=0),o.writeFrame(x,c,p,v),w.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async convertAnimatedWebpToGifLegacy(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const i=t.tracks.selectedTrack,a=(i==null?void 0:i.frameCount)||0;if(a<=0)return null;const o=pe();let s=null,l=null;for(let u=0;u<a;u++){const c=(await t.decode({frameIndex:u})).image,p=c.displayWidth||c.codedWidth,m=c.displayHeight||c.codedHeight;if(!s&&(s=document.createElement("canvas"),s.width=p,s.height=m,l=s.getContext("2d",{willReadFrequently:!0}),!l))return c.close(),null;l.clearRect(0,0,s.width,s.height),l.drawImage(c,0,0,p,m);const g=l.getImageData(0,0,s.width,s.height).data,f=ge(g,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});f.unshift([0,0,0,0]);const h=ht(g,f,"rgba4444"),b=this.toGifDelayMs(c.duration);o.writeFrame(h,s.width,s.height,{palette:f,delay:b,repeat:u===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),c.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF（低清模式）失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async downloadViaGM(e,t){if(typeof GM_download!="function")throw new Error("当前环境不支持 GM_download");let n=null;const i=typeof e=="string"?e:URL.createObjectURL(e);typeof e!="string"&&(n=i);try{await new Promise((a,o)=>{GM_download({url:i,name:t,saveAs:!1,onload:()=>a(),onerror:s=>o(s||new Error("GM_download 失败")),ontimeout:()=>o(new Error("GM_download 超时"))})})}finally{n&&setTimeout(()=>URL.revokeObjectURL(n),1e3)}}async buildGlobalGifPalette({decoder:e,frameCount:t,width:n,height:i}){const a=document.createElement("canvas");a.width=n,a.height=i;const o=a.getContext("2d",{willReadFrequently:!0});if(!o)return null;const s=1,l=256*1024*1024,u=[];let d=0,c=!1;for(let h=0;h<t;h+=s){const S=(await e.decode({frameIndex:h})).image,w=S.displayWidth||S.codedWidth,y=S.displayHeight||S.codedHeight;o.clearRect(0,0,n,i),o.drawImage(S,0,0,w,y);const I=o.getImageData(0,0,n,i).data;!c&&this.hasTransparentPixels(I)&&(c=!0);const L=l-d;if(L<I.length){S.close();break}const x=this.sampleRgbaPixels(I,L);if(x&&x.length>0&&(u.push(x),d+=x.length),S.close(),d>=l)break}if(u.length===0)return null;const p=this.concatUint8Arrays(u,d),m=c?"rgba4444":"rgb565",f=ge(p,c?255:256,{format:m,oneBitAlpha:c,clearAlpha:!1,clearAlphaThreshold:96,useSqrt:!0});return c&&f.unshift([0,0,0,0]),{palette:f,paletteFormat:m,hasTransparency:c}}hasTransparentPixels(e){if(!e||e.length<4)return!1;for(let t=3;t<e.length;t+=4)if(e[t]<16)return!0;return!1}applyPaletteWithFloydSteinberg(e,t,n,i,a={}){const o=!!a.hasTransparency,s=Number.isInteger(a.transparentIndex)?a.transparentIndex:0,l=Number.isFinite(a.alphaThreshold)?a.alphaThreshold:16,u=t*n,d=new Uint8Array(u),c=new Float32Array(e.length),p=new Map;for(let g=0;g<e.length;g++)c[g]=e[g];const m=o?1:0;for(let g=0;g<n;g++)for(let f=0;f<t;f++){const h=g*t+f,b=h*4,S=c[b+3];if(o&&S<l){d[h]=s;continue}const w=this.clampColor(c[b]),y=this.clampColor(c[b+1]),I=this.clampColor(c[b+2]),L=this.findNearestPaletteIndex(w,y,I,i,m,p),x=i[L]||[w,y,I];d[h]=L;const C=w-x[0],v=y-x[1],M=I-x[2];this.distributeDitherError(c,t,n,f,g,C,v,M)}return d}distributeDitherError(e,t,n,i,a,o,s,l){this.addDitherError(e,t,n,i+1,a,o,s,l,7/16),this.addDitherError(e,t,n,i-1,a+1,o,s,l,3/16),this.addDitherError(e,t,n,i,a+1,o,s,l,5/16),this.addDitherError(e,t,n,i+1,a+1,o,s,l,1/16)}addDitherError(e,t,n,i,a,o,s,l,u){if(i<0||a<0||i>=t||a>=n)return;const d=(a*t+i)*4;e[d]=this.clampColor(e[d]+o*u),e[d+1]=this.clampColor(e[d+1]+s*u),e[d+2]=this.clampColor(e[d+2]+l*u)}findNearestPaletteIndex(e,t,n,i,a,o){const s=e<<16|t<<8|n;if(o.has(s))return o.get(s);let l=a,u=Number.POSITIVE_INFINITY;for(let d=a;d<i.length;d++){const c=i[d],p=e-c[0],m=t-c[1],g=n-c[2],f=p*p+m*m+g*g;f<u&&(u=f,l=d)}return o.set(s,l),l}clampColor(e){return e<0?0:e>255?255:e}toGifDelayMs(e){const t=Number.isFinite(e)&&e>0?e:1e5,n=Math.round(t/1e3);return Math.max(20,n)}sampleRgbaPixels(e,t){if(!e||t<=0)return null;const n=Math.floor(e.length/4),i=Math.floor(t/4);return n<=0||i<=0||n>i?null:new Uint8Array(e)}concatUint8Arrays(e,t){const n=new Uint8Array(t);let i=0;return e.forEach(a=>{n.set(a,i),i+=a.length}),n}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const i=new Image,a=URL.createObjectURL(e);i.onload=()=>{URL.revokeObjectURL(a),t(i)},i.onerror=o=>{URL.revokeObjectURL(a),n(o)},i.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",i=(e||"download").split("?")[0],a=i.lastIndexOf(".");return a<=0?`${i}.${n}`:`${i.slice(0,a)}.${n}`}generateFilename(e,t){let n=this.getExtension(e);if(!n){const o=this.guessMimeType(e);n=this.mimeToExt(o)}const i=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${i}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){const t=String(e||"").toLowerCase().split(";")[0].trim();return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[t]||null}}function vt(r={}){const{target:e,handle:t=e,minWidth:n=300,minHeight:i=200,onResizeStart:a,onResize:o,onResizeEnd:s}=r;if(!e||!t)return()=>{};let l=!1,u=0,d=0,c=0,p=0;const m=h=>{h.preventDefault(),h.stopPropagation(),l=!0,u=h.clientX,d=h.clientY,c=e.offsetWidth,p=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",a==null||a(h)},g=h=>{if(!l)return;const b=h.clientX-u,S=h.clientY-d,w=Math.max(n,c+b),y=Math.max(i,p+S);e.style.width=`${w}px`,e.style.height=`${y}px`,o==null||o(h,{width:w,height:y})},f=h=>{l&&(l=!1,document.body.style.userSelect="",document.body.style.cursor="",s==null||s(h))};return t.addEventListener("mousedown",m),document.addEventListener("mousemove",g),document.addEventListener("mouseup",f),()=>{t.removeEventListener("mousedown",m),document.removeEventListener("mousemove",g),document.removeEventListener("mouseup",f)}}function St(){const r=document.getElementById("id-panel");if(r)return r;const e=z("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
    <div class="id-panel-header">
      <span class="id-panel-title">📷 图片批量下载器</span>
      <button class="id-panel-close" id="id-close-btn" title="关闭">×</button>
    </div>
    <div class="id-enhancer-status" id="id-enhancer-status"></div>
    <div class="id-toolbar">
      <button class="id-btn id-btn-primary" id="id-capture" title="快捷键: Ctrl+Shift+I">
        <span>🔍</span> 捕获图片
      </button>
      <label
        class="id-switch-label id-auto-capture-label"
        id="id-auto-capture-label"
        title="开启后会在滚动和页面变化时持续累计图片"
      >
        <input type="checkbox" id="id-auto-capture-toggle" />
        自动捕获
      </label>
      <button class="id-btn" id="id-select-all">全选</button>
      <button class="id-btn" id="id-select-none">全不选</button>
      <button class="id-btn" id="id-clear-captured">清空捕获</button>
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
  `,document.body.appendChild(e),Ct(e),It(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{ie()}),e}function Ct(r){const e=r.querySelector(".id-panel-header");Ae({target:r,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".id-panel-close")})}function It(r){const e=r.querySelector(".id-resize-handle");e&&vt({target:r,handle:e,minWidth:300,minHeight:200})}const Et=.7,Y=48;function N(r,e=0){return Number.isFinite(Number(r))?Number(r):e}function H(r={}){const e=N(r.top),t=N(r.left),n=Math.max(0,N(r.width)),i=Math.max(0,N(r.height));return{top:e,left:t,width:n,height:i,right:N(r.right,t+n),bottom:N(r.bottom,e+i)}}function Re(r,e){const t=H(r),n=H(e);return t.top-n.top||t.left-n.left}function kt(r,e){const t=H(r),n=H(e),i=t.left<=n.right+Y&&n.left<=t.right+Y,a=t.top<=n.bottom+Y&&n.top<=t.bottom+Y;return i&&a}function be(r,e){var t;return((t=r.ancestorRects)==null?void 0:t[e-1])||r.pageRect||{}}function we(r,e){return`${r.length}|${e}|${r.slice(0,e).join(">")}`}function At(r){const e=Array.from({length:r},(i,a)=>a);function t(i){let a=i;for(;e[a]!==a;)e[a]=e[e[a]],a=e[a];return a}function n(i,a){const o=t(i),s=t(a);o!==s&&(e[s]=o)}return{find:t,union:n}}function ye(r,e){var t,n;return Re(r.pageRect,e.pageRect)||String(((t=r.domPath)==null?void 0:t.join(">"))||"").localeCompare(String(((n=e.domPath)==null?void 0:n.join(">"))||""))||N(r.captureOrder)-N(e.captureOrder)}function Lt(r){if(!Array.isArray(r)||r.length<=1)return Array.isArray(r)?[...r]:[];const e=[...r].sort((a,o)=>N(a.captureOrder)-N(o.captureOrder)),t=At(e.length),n=new Map;e.forEach((a,o)=>{const s=Array.isArray(a.domPath)?a.domPath:[];if(s.length===0)return;const l=Math.max(1,Math.ceil(s.length*Et));for(let u=s.length;u>=l;u-=1){const d=we(s,u),c=n.get(d)||[];if(c.length===0)continue;const p=c.filter(m=>kt(be(a,u),be(e[m],u)));if(p.length===0)break;p.forEach(m=>t.union(o,m));break}for(let u=s.length;u>=l;u-=1){const d=we(s,u),c=n.get(d)||[];c.push(o),n.set(d,c)}});const i=new Map;return e.forEach((a,o)=>{const s=t.find(o),l=i.get(s)||[];l.push(a),i.set(s,l)}),Array.from(i.values()).map(a=>a.sort(ye)).sort((a,o)=>ye(a[0],o[0])).flat()}function Mt(r,e){return{...r,element:void 0,domPath:Array.isArray(r.domPath)?[...r.domPath]:[],pageRect:H(r.pageRect),ancestorRects:Array.isArray(r.ancestorRects)?r.ancestorRects.map(H):[],captureOrder:e}}class Bt{constructor(){this.records=new Map,this.nextCaptureOrder=0}clear(){const e=this.records.size>0;return this.records.clear(),this.nextCaptureOrder=0,{added:0,updated:0,changed:e}}replace(e){return this.clear(),{...this.merge(e),changed:!0}}merge(e){let t=0,n=0,i=!1;for(const a of Array.isArray(e)?e:[]){const o=typeof(a==null?void 0:a.src)=="string"?a.src:"";if(!o)continue;const s=this.records.get(o);if(!s){this.records.set(o,Mt(a,this.nextCaptureOrder)),this.nextCaptureOrder+=1,t+=1,i=!0;continue}const l={};!s.width&&a.width&&(l.width=a.width),!s.height&&a.height&&(l.height=a.height),!s.alt&&a.alt&&(l.alt=a.alt),Re(a.pageRect,s.pageRect)<0&&(l.domPath=Array.isArray(a.domPath)?[...a.domPath]:[],l.pageRect=H(a.pageRect),l.ancestorRects=Array.isArray(a.ancestorRects)?a.ancestorRects.map(H):[]),Object.keys(l).length>0&&(Object.assign(s,l),n+=1,i=!0)}return{added:t,updated:n,changed:i}}getSortedImages(){return Lt(Array.from(this.records.values()))}get size(){return this.records.size}}const Tt="#id-panel, #id-floating-btn";function xe(r){return r instanceof Element?!!r.closest(Tt):!1}class Dt{constructor(e){this.onScan=e.onScan,this.onError=e.onError||(()=>{}),this.minScanInterval=e.minScanInterval||200,this.fallbackInterval=e.fallbackInterval||1e3,this.active=!1,this.scanning=!1,this.scanRequested=!1,this.lastScanAt=0,this.scanTimer=null,this.fallbackTimer=null,this.observer=null,this.handleScroll=()=>this.requestScan(),this.handleVisibilityChange=()=>{document.hidden||this.requestScan({immediate:!0})},this.handlePageHide=()=>this.stop()}start(){return this.active?!1:(this.active=!0,window.addEventListener("scroll",this.handleScroll,!0),document.addEventListener("visibilitychange",this.handleVisibilityChange),window.addEventListener("pagehide",this.handlePageHide,{once:!0}),this.observer=new MutationObserver(e=>{e.some(n=>xe(n.target)?!1:Array.from(n.addedNodes||[]).some(i=>!xe(i))||n.type==="attributes")&&this.requestScan()}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","srcset","href","poster","style","class","data-src","data-original","data-lazy","data-srcset","data-image","data-ks-lazyload","data-url","data-ks-observersrc"]}),this.fallbackTimer=window.setInterval(()=>this.requestScan(),this.fallbackInterval),this.requestScan({immediate:!0}),!0)}stop(){var e;return this.active?(this.active=!1,window.removeEventListener("scroll",this.handleScroll,!0),document.removeEventListener("visibilitychange",this.handleVisibilityChange),window.removeEventListener("pagehide",this.handlePageHide),(e=this.observer)==null||e.disconnect(),this.observer=null,this.scanTimer!==null&&(window.clearTimeout(this.scanTimer),this.scanTimer=null),this.fallbackTimer!==null&&(window.clearInterval(this.fallbackTimer),this.fallbackTimer=null),this.scanRequested=!1,!0):!1}requestScan({immediate:e=!1}={}){if(!this.active||document.hidden)return;if(this.scanning){this.scanRequested=!0;return}if(this.scanTimer!==null)return;const t=Date.now()-this.lastScanAt,n=e?0:Math.max(0,this.minScanInterval-t);this.scanTimer=window.setTimeout(()=>{this.scanTimer=null,this.runScan()},n)}async runScan(){if(!(!this.active||document.hidden||this.scanning)){this.scanning=!0,this.scanRequested=!1;try{await this.onScan()}catch(e){this.onError(e)}finally{this.lastScanAt=Date.now(),this.scanning=!1,this.scanRequested&&this.requestScan()}}}}function ze(){try{return window.top===window.self}catch{return!1}}ze()&&$e(We);const Pt="i";var Se,Ce;const re=(Ce=(Se=j.imageDownloader)==null?void 0:Se.storageKeys)==null?void 0:Ce.downloadHistory;var Ie,Ee;const ve=(Ee=(Ie=j.imageDownloader)==null?void 0:Ie.storageKeys)==null?void 0:Ee.gifQualityMode;function Rt(r){return r==="low"?"low":"high"}(function(){if(!ze()||window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let r=[],e=[];const t=[];let n=!0,i=!0,a=!1;const o=new tt,s=new Bt;function l(f){f&&(f.textContent=`历史下载数: ${t.length}`)}function u(f){return f&&typeof f=="object"&&typeof f.url=="string"&&f.url?{url:f.url,downloadedAt:typeof f.downloadedAt=="string"?f.downloadedAt:null}:null}async function d(f){try{const h=await de(re,[]);Array.isArray(h)&&h.forEach(b=>{const S=u(b);S&&t.push(S)}),l(f),k.info("已加载下载历史",{count:t.length})}catch(h){k.error("读取下载历史失败",h),l(f)}}async function c(){try{await ee(re,t),k.debug("下载历史已保存",{count:t.length})}catch(f){k.error("保存下载历史失败",f)}}function p(f){document.addEventListener("keydown",h=>{const b=String(h.key||"").toLowerCase();if(h.ctrlKey&&h.shiftKey&&b===Pt){if(h.preventDefault(),!i)return;i=!1;const S=document.getElementById("id-panel");(!S||S.style.display==="none"||S.style.display==="")&&Le(),f(),setTimeout(()=>{i=!0},500)}})}async function m(){var ce;k.info("imageDownloader 初始化开始",{logLevel:j.logLevel});const f=St(),h=Ke(),b=f.querySelector("#id-enhancer-status");if(h){const E=Je(h);b.textContent=`✨ 当前网站已启用增强：${E}`,b.classList.add("active")}else b.textContent="",b.classList.remove("active");Oe({onToggle:Ge}),ie();const S=f.querySelector(".id-image-grid"),w=f.querySelector("#id-select-all"),y=f.querySelector("#id-select-none"),I=f.querySelector("#id-download"),L=f.querySelector("#id-clear-storage"),x=f.querySelector("#id-clear-captured"),C=f.querySelector("#id-capture"),v=f.querySelector("#id-auto-capture-toggle"),M=f.querySelector("#id-auto-capture-label"),D=f.querySelector("#id-prefix"),A=f.querySelector("#id-gif-quality-toggle"),B=f.querySelector(".id-status"),T=f.querySelector("#id-downloaded-count");await d(T);try{n=Rt(await de(ve,"high"))!=="low"}catch(E){k.warn("读取 GIF 画质模式失败，使用默认清晰模式",E),n=!0}A&&(A.checked=n,A.addEventListener("change",async()=>{n=!!A.checked;try{await ee(ve,n?"high":"low")}catch(E){k.warn("保存 GIF 画质模式失败",E)}B.textContent=n?"动态图画质：清晰（更慢、更大）":"动态图画质：标准（更快、更小）"}));const $=new at({grid:S,onSelectionChange:E=>{e=E,se()}});function G({replace:E=!1,source:P="manual"}={}){const W=o.getAllImages(),R=E?s.replace(W):s.merge(W);return(R.changed||E)&&(r=s.getSortedImages(),$.render(r,{preserveSelection:!E})),k.info("图片捕获完成",{source:P,scanned:W.length,added:R.added,updated:R.updated,total:s.size}),R}const U=((ce=j.imageDownloader)==null?void 0:ce.autoCapture)||{},q=new Dt({minScanInterval:U.minScanInterval,fallbackInterval:U.fallbackInterval,onScan:()=>{const E=G({source:"auto"});a||(B.textContent=E.added>0?`自动捕获中：累计 ${s.size} 张，本轮新增 ${E.added} 张`:`自动捕获中：累计 ${s.size} 张`)},onError:E=>{k.error("自动捕获失败",E),a||(B.textContent="自动捕获扫描失败，将继续重试")}});function K(E="manual"){const P=q.active;k.info("开始手动捕获图片",{source:E,isAutoCapturing:P});const W=G({replace:!P,source:E});B.textContent=P?`自动捕获中：累计 ${s.size} 张，本轮新增 ${W.added} 张`:`已捕获 ${s.size} 张图片`}p(()=>K("shortcut")),C.addEventListener("click",()=>{K("button")}),v.addEventListener("change",()=>{if(v.checked){M.classList.add("is-active"),B.textContent=`自动捕获中：累计 ${s.size} 张`,q.start(),k.info("自动捕获已开启");return}q.stop(),M.classList.remove("is-active"),B.textContent=`自动捕获已停止，共捕获 ${s.size} 张图片`,k.info("自动捕获已停止",{count:s.size})}),w.addEventListener("click",()=>{$.selectAll()}),y.addEventListener("click",()=>{$.selectNone()}),x.addEventListener("click",()=>{s.clear(),r=[],$.render(r),B.textContent=q.active?"已清空捕获，自动捕获将继续累计":"已清空捕获图片",k.info("已清空当前捕获图片")}),L.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){t.length=0;try{await ee(re,[]),l(T),B.textContent="存储已清除",k.info("图片脚本存储已清除")}catch(P){B.textContent="清除存储失败",k.error("清除图片脚本存储失败",P)}}}),I.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const E=[...e],P=D.value||Ne();k.info("开始下载选中图片",{count:E.length,prefix:P}),a=!0,new xt({prefix:P,animatedGifHighQuality:n,onProgress:(R,_)=>{B.textContent=`下载中: ${R}/${_}`},onComplete:async(R,_,J=[])=>{if(a=!1,B.textContent=`完成: 成功 ${R}, 失败 ${_}`,J.length>0){const Ue=new Date().toISOString();J.forEach(Z=>{typeof Z=="string"&&Z&&t.push({url:Z,downloadedAt:Ue})}),l(T),await c()}k.info("下载流程完成",{success:R,failed:_,historyAdded:J.length,historyTotal:t.length})}}).download(E)});function se(){const E=e.length;I.disabled=E===0,I.textContent=E===0?"下载选中":`下载选中 (${E})`}function Ne(){const E=new Date,P=String(E.getMonth()+1).padStart(2,"0"),W=String(E.getDate()).padStart(2,"0"),R=String(E.getHours()).padStart(2,"0"),_=String(E.getMinutes()).padStart(2,"0");return`${P}${W}${R}${_}`}se(),k.info("imageDownloader 初始化完成",{downloadedCount:t.length})}function g(){m().catch(f=>{k.error("imageDownloader 初始化失败",f)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",g):g()})();
