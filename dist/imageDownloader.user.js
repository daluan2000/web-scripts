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

function N(i,e={},t="",n=""){const r=document.createElement(i);for(const[a,o]of Object.entries(e))if(a==="className")r.className=o;else if(a==="dataset")for(const[l,d]of Object.entries(o))r.dataset[l]=d;else a.startsWith("on")?r.addEventListener(a.slice(2).toLowerCase(),o):r.setAttribute(a,o);return t?r.innerHTML=t:n&&(r.textContent=n),r}function xe(i){const e=N("style",{type:"text/css"});return e.textContent=i,document.head.appendChild(e),e}const W={logLevel:"info",storagePrefix:"userscript_",imageDownloader:{storageKeys:{downloadHistory:"imageDownloader_download_history",gifQualityMode:"imageDownloader_gif_quality_mode"}}};function ue(i){return W.storagePrefix+i}const K={debug:0,info:1,warn:2,error:3};function R(i,e,...t){const n=K[W.logLevel];if(K[i]<n)return;const r=`[${i.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(i){case"debug":case"info":console.log(`${r} [${a}]`,e,...t);break;case"warn":console.warn(`${r} [${a}]`,e,...t);break;case"error":console.error(`${r} [${a}]`,e,...t);break}}const k={debug:(i,...e)=>R("debug",i,...e),info:(i,...e)=>R("info",i,...e),warn:(i,...e)=>R("warn",i,...e),error:(i,...e)=>R("error",i,...e)};async function j(i,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(ue(i),n),t()})}async function J(i,e=null){const t=await GM_getValue(ue(i));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const ve=`/**
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
`;function he(i){const{target:e,handle:t=e,onClick:n,shouldStart:r,dragThreshold:a=4,clampToViewport:o=!0,dragClassName:l,bodyCursor:d="",removeTransformOnStart:u=!1,onDragStart:c,onDrag:s,onDragEnd:h}=i||{};if(!e||!t)return()=>{};let p=null,f=0,m=0,g=0,w=0,S=!1,y=!1;const x=C=>{if(n){if(y){C.preventDefault(),C.stopPropagation(),y=!1;return}n(C)}},E=C=>{if(C.pointerType==="mouse"&&C.button!==0||typeof r=="function"&&!r(C))return;const I=e.getBoundingClientRect();f=C.clientX,m=C.clientY,g=I.left,w=I.top,S=!1,p=C.pointerId,e.style.left=`${g}px`,e.style.top=`${w}px`,e.style.right="auto",e.style.bottom="auto",u&&(e.style.transform="none"),l&&e.classList.add(l),t.setPointerCapture(p),document.body.style.userSelect="none",d&&(document.body.style.cursor=d),typeof c=="function"&&c(C),C.preventDefault()},A=C=>{if(C.pointerId!==p)return;const I=C.clientX-f,B=C.clientY-m;if(!S&&Math.hypot(I,B)>=a&&(S=!0,y=!0),!S)return;let D=g+I,v=w+B;if(o){const M=Math.max(0,window.innerWidth-e.offsetWidth),L=Math.max(0,window.innerHeight-e.offsetHeight);D=Math.max(0,Math.min(D,M)),v=Math.max(0,Math.min(v,L))}e.style.left=`${D}px`,e.style.top=`${v}px`,typeof s=="function"&&s(C)},b=C=>{C.pointerId===p&&(t.hasPointerCapture(p)&&t.releasePointerCapture(p),p=null,l&&e.classList.remove(l),document.body.style.userSelect="",d&&(document.body.style.cursor=""),typeof h=="function"&&h(C))};return t.addEventListener("click",x),t.addEventListener("pointerdown",E),t.addEventListener("pointermove",A),t.addEventListener("pointerup",b),t.addEventListener("pointercancel",b),()=>{t.removeEventListener("click",x),t.removeEventListener("pointerdown",E),t.removeEventListener("pointermove",A),t.removeEventListener("pointerup",b),t.removeEventListener("pointercancel",b)}}const Ie=30,Ce=30;function Z(i){if(!i)return;const e=i.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),n=Math.max(1,window.innerHeight-e.height);i.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),i.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/n)))}function Se(i){if(!i)return;const e=Number(i.dataset.ratioX),t=Number(i.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const n=Math.max(0,window.innerWidth-i.offsetWidth),r=Math.max(0,window.innerHeight-i.offsetHeight);i.style.left=`${Math.round(n*e)}px`,i.style.top=`${Math.round(r*t)}px`,i.style.right="auto",i.style.bottom="auto"}function Ee(i){const e=document.getElementById("id-floating-btn");if(e)return e;const t=N("div",{id:"id-floating-btn",title:"图片批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);return document.body.appendChild(t),t.style.right=`${Ie}px`,t.style.bottom=`${Ce}px`,he({target:t,onClick:()=>i.onToggle(),dragClassName:"dragging",onDragEnd:()=>{Z(t)}}),requestAnimationFrame(()=>{Z(t)}),window.addEventListener("resize",()=>{Se(t)}),t}function fe(){const i=document.getElementById("id-panel");i&&(i.style.display="flex",i.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function Q(){const i=document.getElementById("id-panel");i&&(i.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function ke(){const i=document.getElementById("id-panel");i&&(i.style.display==="none"||i.style.display===""?fe():Q())}const Ae={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(i){if(!this.urlPattern.test(i))return i;const e=i.indexOf("?"),t=e===-1?i:i.slice(0,e),n=e===-1?"":i.slice(e),r=t.indexOf("@");if(r===-1)return i;const a=t.slice(0,r),l=t.slice(r+1).match(/\.([a-z0-9]+)$/i),d=l?l[1].toLowerCase():"";return d==="avif"||d==="awebp"||d==="webp"?`${a}@3840w.${d}${n}`:`${a}@3840w${n}`}},Be={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(i){return i}},Le={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(i){return i}},De={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(i){return i.replace(/_\w+(\.\w+)$/i,"$1")}},Y=[Ae,Be,Le,De];function Me(i){for(const e of Y)if(e.urlPattern.test(i))return e;return null}function Te(i){const e=window.location.href;for(const t of Y)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function Pe(i){const e=Te();return e?e.name:null}function ze(i){const e=Y.find(t=>t.name===i);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||i}function Ne(i){const e=Me(i);return e?e.enhance(i):i}class ee{constructor(){this.imageExtensions=["jpg","jpeg","png","gif","webp","bmp","svg","ico","avif","awebp"]}getAllImages(){const e=[],t=new Set;document.querySelectorAll("img").forEach(u=>{this.processImageElement(u,"img",t,e)}),document.querySelectorAll("image").forEach(u=>{var s;const c=this.getImageSrc(((s=u.href)==null?void 0:s.baseVal)||u.getAttribute("href"));c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"svg-image",u)))});const a=document.querySelectorAll("*");return a.forEach(u=>{const s=window.getComputedStyle(u).backgroundImage;s&&s!=="none"&&this.extractUrls(s).forEach(p=>{const f=this.getImageSrc(p);f&&!t.has(f)&&(t.add(f),e.push(this.createImageInfo(f,"background",u)))})}),document.querySelectorAll("source").forEach(u=>{var s,h,p;const c=this.getImageSrc((p=(h=(s=u.srcset)==null?void 0:s.split(",")[0])==null?void 0:h.trim())==null?void 0:p.split(" ")[0]);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"source",u)))}),a.forEach(u=>{this.processLazySrc(u,t,e)}),document.querySelectorAll("video, audio").forEach(u=>{const c=u.getAttribute("poster");if(c){const s=this.getImageSrc(c);s&&!t.has(s)&&(t.add(s),e.push(this.createImageInfo(s,"media-poster",u)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(u=>{const c=this.getImageSrc(u.href);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"icon",u)))}),e.filter(u=>this.isValidImage(u.src))}processImageElement(e,t,n,r){var o,l,d;const a=this.getImageSrc(e.src)||this.getImageSrc((o=e.dataset)==null?void 0:o.src)||this.getImageSrc((l=e.dataset)==null?void 0:l.original)||this.getImageSrc((d=e.dataset)==null?void 0:d.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),r.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var l,d,u;let o=((l=e.dataset)==null?void 0:l[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&o)try{const c=JSON.parse(o);o=c.src||c.url||c.original}catch{}if(o){(a.includes("srcset")||a==="data-srcset")&&(o=(u=(d=o.split(",")[0])==null?void 0:d.trim())==null?void 0:u.split(" ")[0]);const c=this.getImageSrc(o);c&&!t.has(c)&&(t.add(c),n.push(this.createImageInfo(c,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(r=>e.toLowerCase().includes(r))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=Ne(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let r;for(;(r=n.exec(e))!==null;)t.push(r[1]);return t}isValidImage(e){var r;if(!e)return!1;const t=(r=e.split(".").pop())==null?void 0:r.toLowerCase().split("?")[0];return t&&this.imageExtensions.includes(t)||e.includes("picsum.photos")||e.includes("unsplash.com")||e.includes("placeholder.com")||e.includes("via.placeholder")?!0:["cdn.","img.","image.","assets.","byteimg.com","bytedance.com","toutiao.com","douyin.com","toutiaoimg.com","feishu.cn",".jpg",".png",".webp",".gif",".svg",".bmp",".awebp",".avif"].some(a=>e.toLowerCase().includes(a))}createImageInfo(e,t,n){return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class Ue{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,n)=>{const r=this.createResourceItem(t,n);this.grid.appendChild(r)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const n=this.resources[e];if(!this.isSelectable(n,e)){const r=this.getDisabledReason(n,e);t.title=r||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const n=N("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(n.classList.add("unselectable"),n.title=this.getDisabledReason(e,t)||"",n.setAttribute("aria-disabled","true"));const r={toggle:()=>this.toggle(t),createElement:N,updateResource:d=>{if(!(!d||typeof d!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],d);return}this.resources[t]={...d}}}},a=this.createThumbnail(e,t,r);a&&n.appendChild(a);const o=N("div",{className:this.classNames.checkbox,onClick:d=>{d.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),l=this.createInfo(e,t,r);return n.appendChild(o),l&&n.appendChild(l),n}defaultCreateThumbnail(e,t,n){const r=N("div",{className:this.classNames.thumb}),a=N("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return r.appendChild(a),r.addEventListener("click",()=>n.toggle()),r}defaultCreateInfo(e){const t=N("div",{className:this.classNames.info}),n=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(N("span",{},this.truncate(n,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const n=parseInt(t.dataset.index||"-1",10);this.selected.has(n)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var r;if(!e)return"未命名";const t=String(e).split("/"),n=((r=t[t.length-1])==null?void 0:r.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function $e(i){var n;if(!i)return"未命名";const e=String(i).split("/"),t=((n=e[e.length-1])==null?void 0:n.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function We(i,e){return!i||i.length<=e?i:i.substring(0,e-3)+"..."}class He extends Ue{constructor(e){super({...e,emptyText:"未找到图片",classNames:{item:"id-image-item",selected:"selected",empty:"id-empty",thumb:"id-image-thumb",checkbox:"id-checkbox",info:"id-image-info"},createThumbnail:(t,n,r)=>{const a=r.createElement("div",{className:"id-image-thumb"}),o=r.createElement("img",{src:t.src,alt:t.alt||`图片 ${n+1}`,loading:"lazy",onerror:()=>{o.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});return o.onload=()=>{o.naturalWidth>0&&r.updateResource({width:o.naturalWidth,height:o.naturalHeight})},a.appendChild(o),a.addEventListener("click",()=>{r.toggle()}),a},createInfo:(t,n,r)=>{const a=r.createElement("div",{className:"id-image-info"}),o=$e(t.src),l=r.createElement("span",{className:"id-size"});return l.textContent=t.width&&t.height?`${t.width}×${t.height}`:"",a.appendChild(r.createElement("span",{className:"id-filename",title:t.src},We(o,20))),a.appendChild(l),a}})}getSelectedImages(){return this.getSelectedResources()}}var Fe={trailer:59};function ge(i=256){let e=0,t=new Uint8Array(i);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(r){n(e+1),t[e]=r,e++},writeBytes(r,a=0,o=r.length){n(e+o);for(let l=0;l<o;l++)t[e++]=r[l+a]},writeBytesView(r,a=0,o=r.byteLength){n(e+o),t.set(r.subarray(a,a+o),e),e+=o}};function n(r){var a=t.length;if(a>=r)return;var o=1024*1024;r=Math.max(r,a*(a<o?2:1.125)>>>0),a!=0&&(r=Math.max(r,256));let l=t;t=new Uint8Array(r),e>0&&t.set(l.subarray(0,e),0)}}var O=12,te=5003,Re=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function qe(i,e,t,n,r=ge(512),a=new Uint8Array(256),o=new Int32Array(te),l=new Int32Array(te)){let d=o.length,u=Math.max(2,n);a.fill(0),l.fill(0),o.fill(-1);let c=0,s=0,h=u+1,p=h,f=!1,m=p,g=(1<<m)-1,w=1<<h-1,S=w+1,y=w+2,x=0,E=t[0],A=0;for(let I=d;I<65536;I*=2)++A;A=8-A,r.writeByte(u),C(w);let b=t.length;for(let I=1;I<b;I++)e:{let B=t[I],D=(B<<O)+E,v=B<<A^E;if(o[v]===D){E=l[v];break e}let M=v===0?1:d-v;for(;o[v]>=0;)if(v-=M,v<0&&(v+=d),o[v]===D){E=l[v];break e}C(E),E=B,y<1<<O?(l[v]=y++,o[v]=D):(o.fill(-1),y=w+2,f=!0,C(w))}return C(E),C(S),r.writeByte(0),r.bytesView();function C(I){for(c&=Re[s],s>0?c|=I<<s:c=I,s+=m;s>=8;)a[x++]=c&255,x>=254&&(r.writeByte(x),r.writeBytesView(a,0,x),x=0),c>>=8,s-=8;if((y>g||f)&&(f?(m=p,g=(1<<m)-1,f=!1):(++m,g=m===O?1<<m:(1<<m)-1)),I==S){for(;s>0;)a[x++]=c&255,x>=254&&(r.writeByte(x),r.writeBytesView(a,0,x),x=0),c>>=8,s-=8;x>0&&(r.writeByte(x),r.writeBytesView(a,0,x),x=0)}}}var Ge=qe;function pe(i,e,t){return i<<8&63488|e<<2&992|t>>3}function me(i,e,t,n){return i>>4|e&240|(t&240)<<4|(n&240)<<8}function be(i,e,t){return i>>4<<8|e&240|t>>4}function q(i,e,t){return i<e?e:i>t?t:i}function G(i){return i*i}function ne(i,e,t){var n=0,r=1e100;let a=i[e],o=a.cnt;a.ac;let l=a.rc,d=a.gc,u=a.bc;for(var c=a.fw;c!=0;c=i[c].fw){let h=i[c],p=h.cnt,f=o*p/(o+p);if(!(f>=r)){var s=0;s+=f*G(h.rc-l),!(s>=r)&&(s+=f*G(h.gc-d),!(s>=r)&&(s+=f*G(h.bc-u),!(s>=r)&&(r=s,n=c)))}}a.err=r,a.nn=n}function _(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function je(i,e){let t=e==="rgb444"?4096:65536,n=new Array(t),r=i.length;if(e==="rgba4444")for(let a=0;a<r;++a){let o=i[a],l=o>>24&255,d=o>>16&255,u=o>>8&255,c=o&255,s=me(c,u,d,l),h=s in n?n[s]:n[s]=_();h.rc+=c,h.gc+=u,h.bc+=d,h.ac+=l,h.cnt++}else if(e==="rgb444")for(let a=0;a<r;++a){let o=i[a],l=o>>16&255,d=o>>8&255,u=o&255,c=be(u,d,l),s=c in n?n[c]:n[c]=_();s.rc+=u,s.gc+=d,s.bc+=l,s.cnt++}else for(let a=0;a<r;++a){let o=i[a],l=o>>16&255,d=o>>8&255,u=o&255,c=pe(u,d,l),s=c in n?n[c]:n[c]=_();s.rc+=u,s.gc+=d,s.bc+=l,s.cnt++}return n}function ie(i,e,t={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:a=0,clearAlphaThreshold:o=0,oneBitAlpha:l=!1}=t;if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let d=new Uint32Array(i.buffer),u=t.useSqrt!==!1,c=n==="rgba4444",s=je(d,n),h=s.length,p=h-1,f=new Uint32Array(h+1);for(var m=0,g=0;g<h;++g){let L=s[g];if(L!=null){var w=1/L.cnt;c&&(L.ac*=w),L.rc*=w,L.gc*=w,L.bc*=w,s[m++]=L}}G(e)/m<.022&&(u=!1);for(var g=0;g<m-1;++g)s[g].fw=g+1,s[g+1].bk=g,u&&(s[g].cnt=Math.sqrt(s[g].cnt));u&&(s[g].cnt=Math.sqrt(s[g].cnt));var S,y,x;for(g=0;g<m;++g){ne(s,g);var E=s[g].err;for(y=++f[0];y>1&&(x=y>>1,!(s[S=f[x]].err<=E));y=x)f[y]=S;f[y]=g}var A=m-e;for(g=0;g<A;){for(var b;;){var C=f[1];if(b=s[C],b.tm>=b.mtm&&s[b.nn].mtm<=b.tm)break;b.mtm==p?C=f[1]=f[f[0]--]:(ne(s,C),b.tm=g);var E=s[C].err;for(y=1;(x=y+y)<=f[0]&&(x<f[0]&&s[f[x]].err>s[f[x+1]].err&&x++,!(E<=s[S=f[x]].err));y=x)f[y]=S;f[y]=C}var I=s[b.nn],B=b.cnt,D=I.cnt,w=1/(B+D);c&&(b.ac=w*(B*b.ac+D*I.ac)),b.rc=w*(B*b.rc+D*I.rc),b.gc=w*(B*b.gc+D*I.gc),b.bc=w*(B*b.bc+D*I.bc),b.cnt+=I.cnt,b.mtm=++g,s[I.bk].fw=I.fw,s[I.fw].bk=I.bk,I.mtm=p}let v=[];var M=0;for(g=0;;++M){let L=q(Math.round(s[g].rc),0,255),T=q(Math.round(s[g].gc),0,255),P=q(Math.round(s[g].bc),0,255),z=255;c&&(z=q(Math.round(s[g].ac),0,255),l&&(z=z<=(typeof l=="number"?l:127)?0:255),r&&z<=o&&(L=T=P=a,z=0));let H=c?[L,T,P,z]:[L,T,P];if(Oe(v,H)||v.push(H),(g=s[g].fw)==0)break}return v}function Oe(i,e){for(let t=0;t<i.length;t++){let n=i[t],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&a)return!0}return!1}function _e(i,e,t="rgb565"){if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(i.buffer),r=n.length,a=t==="rgb444"?4096:65536,o=new Uint8Array(r),l=new Array(a);if(t==="rgba4444")for(let d=0;d<r;d++){let u=n[d],c=u>>24&255,s=u>>16&255,h=u>>8&255,p=u&255,f=me(p,h,s,c),m=f in l?l[f]:l[f]=Ve(p,h,s,c,e);o[d]=m}else{let d=t==="rgb444"?be:pe;for(let u=0;u<r;u++){let c=n[u],s=c>>16&255,h=c>>8&255,p=c&255,f=d(p,h,s),m=f in l?l[f]:l[f]=Qe(p,h,s,e);o[u]=m}}return o}function Ve(i,e,t,n,r){let a=0,o=1e100;for(let l=0;l<r.length;l++){let d=r[l],u=d[3],c=$(u-n);if(c>o)continue;let s=d[0];if(c+=$(s-i),c>o)continue;let h=d[1];if(c+=$(h-e),c>o)continue;let p=d[2];c+=$(p-t),!(c>o)&&(o=c,a=l)}return a}function Qe(i,e,t,n){let r=0,a=1e100;for(let o=0;o<n.length;o++){let l=n[o],d=l[0],u=$(d-i);if(u>a)continue;let c=l[1];if(u+=$(c-e),u>a)continue;let s=l[2];u+=$(s-t),!(u>a)&&(a=u,r=o)}return r}function $(i){return i*i}function re(i={}){let{initialCapacity:e=4096,auto:t=!0}=i,n=ge(e),r=5003,a=new Uint8Array(256),o=new Int32Array(r),l=new Int32Array(r),d=!1;return{reset(){n.reset(),d=!1},finish(){n.writeByte(Fe.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:u,writeFrame(c,s,h,p={}){let{transparent:f=!1,transparentIndex:m=0,delay:g=0,palette:w=null,repeat:S=0,colorDepth:y=8,dispose:x=-1}=p,E=!1;if(t?d||(E=!0,u(),d=!0):E=!!p.first,s=Math.max(0,Math.floor(s)),h=Math.max(0,Math.floor(h)),E){if(!w)throw new Error("First frame must include a { palette } option");Xe(n,s,h,w,y),ae(n,w),S>=0&&Ke(n,S)}let A=Math.round(g/10);Ye(n,x,A,f,m);let b=!!w&&!E;Je(n,s,h,b?w:null),b&&ae(n,w),Ze(n,c,s,h,y,a,o,l)}};function u(){we(n,"GIF89a")}}function Ye(i,e,t,n,r){i.writeByte(33),i.writeByte(249),i.writeByte(4),r<0&&(r=0,n=!1);var a,o;n?(a=1,o=2):(a=0,o=0),e>=0&&(o=e&7),o<<=2,i.writeByte(0|o|0|a),U(i,t),i.writeByte(r||0),i.writeByte(0)}function Xe(i,e,t,n,r=8){let a=1,o=0,l=X(n.length)-1,d=a<<7|r-1<<4|o<<3|l;U(i,e),U(i,t),i.writeBytes([d,0,0])}function Ke(i,e){i.writeByte(33),i.writeByte(255),i.writeByte(11),we(i,"NETSCAPE2.0"),i.writeByte(3),i.writeByte(1),U(i,e),i.writeByte(0)}function ae(i,e){let t=1<<X(e.length);for(let n=0;n<t;n++){let r=[0,0,0];n<e.length&&(r=e[n]),i.writeByte(r[0]),i.writeByte(r[1]),i.writeByte(r[2])}}function Je(i,e,t,n){if(i.writeByte(44),U(i,0),U(i,0),U(i,e),U(i,t),n){let r=0,a=0,o=X(n.length)-1;i.writeByte(128|r|a|0|o)}else i.writeByte(0)}function Ze(i,e,t,n,r=8,a,o,l){Ge(t,n,e,r,i,a,o,l)}function U(i,e){i.writeByte(e&255),i.writeByte(e>>8&255)}function we(i,e){for(var t=0;t<e.length;t++)i.writeByte(e.charCodeAt(t))}function X(i){return Math.max(Math.ceil(Math.log2(i)),1)}class et{constructor(e){this.prefix=e.prefix||"",this.animatedGifHighQuality=e.animatedGifHighQuality!==!1,this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){k.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.successUrls=[],k.info("开始批量下载",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,k.info("批量下载完成",{success:this.successCount,failed:this.failedCount,successUrls:this.successUrls.length}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++,this.successUrls.push(e.src)}catch(r){k.error(`下载失败: ${e.src}`,r),this.failedCount++}this.processQueue()}async downloadFile(e,t){const n=e.startsWith("data:");try{const r=await fetch(e);if(!r.ok)throw new Error(`HTTP ${r.status}`);const a=await r.blob(),o=r.headers.get("content-type")||a.type||"",l=await this.prepareDownloadTarget(e,a,t,o),d=URL.createObjectURL(l.blob);this.triggerDownload(d,l.filename),setTimeout(()=>URL.revokeObjectURL(d),1e3)}catch{if(!n){k.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,t);return}this.downloadDataURL(e,t)}}async prepareDownloadTarget(e,t,n,r=""){if(!this.isWebpResource(e,r))return{blob:t,filename:n};if(await this.isAnimatedWebp(t)){const l=this.animatedGifHighQuality?await this.convertAnimatedWebpToGif(t):await this.convertAnimatedWebpToGifLegacy(t);return l?{blob:l,filename:this.replaceExtension(n,"gif")}:(k.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}const o=await this.convertStaticWebpToPng(t);return o?{blob:o,filename:this.replaceExtension(n,"png")}:(k.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),r=(t||"").toLowerCase();return r.includes("image/webp")||r.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let r=12;for(;r+8<=n.length;){const a=this.readFourCC(n,r),o=new DataView(t).getUint32(r+4,!0),l=r+8,d=l+o;if(d>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&o>=1&&n[l]&2)return!0;r=d+o%2}return!1}catch(t){return k.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,r=t.height||t.naturalHeight||0;if(!n||!r)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=r;const o=a.getContext("2d");return o?(o.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(d=>{a.toBlob(u=>d(u),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return k.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const r=t.tracks.selectedTrack,a=(r==null?void 0:r.frameCount)||0;if(a<=0)return null;const o=re(),l=document.createElement("canvas"),d=l.getContext("2d",{willReadFrequently:!0});if(!d)return null;const c=(await t.decode({frameIndex:0})).image,s=c.displayWidth||c.codedWidth,h=c.displayHeight||c.codedHeight;if(c.close(),!s||!h)return null;l.width=s,l.height=h;const p=await this.buildGlobalGifPalette({decoder:t,frameCount:a,width:s,height:h});if(!p||!p.palette||p.palette.length===0)return null;const{palette:f,paletteFormat:m,hasTransparency:g}=p;for(let w=0;w<a;w++){const y=(await t.decode({frameIndex:w})).image,x=y.displayWidth||y.codedWidth,E=y.displayHeight||y.codedHeight;d.clearRect(0,0,s,h),d.drawImage(y,0,0,x,E);const A=d.getImageData(0,0,s,h).data,b=this.applyPaletteWithFloydSteinberg(A,s,h,f,{hasTransparency:g,transparentIndex:0,alphaThreshold:16}),I={delay:this.toGifDelayMs(y.duration),dispose:1};g&&(I.transparent=!0,I.transparentIndex=0),w===0&&(I.palette=f,I.repeat=0),o.writeFrame(b,s,h,I),y.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async convertAnimatedWebpToGifLegacy(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const r=t.tracks.selectedTrack,a=(r==null?void 0:r.frameCount)||0;if(a<=0)return null;const o=re();let l=null,d=null;for(let u=0;u<a;u++){const s=(await t.decode({frameIndex:u})).image,h=s.displayWidth||s.codedWidth,p=s.displayHeight||s.codedHeight;if(!l&&(l=document.createElement("canvas"),l.width=h,l.height=p,d=l.getContext("2d",{willReadFrequently:!0}),!d))return s.close(),null;d.clearRect(0,0,l.width,l.height),d.drawImage(s,0,0,h,p);const f=d.getImageData(0,0,l.width,l.height).data,m=ie(f,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});m.unshift([0,0,0,0]);const g=_e(f,m,"rgba4444"),w=this.toGifDelayMs(s.duration);o.writeFrame(g,l.width,l.height,{palette:m,delay:w,repeat:u===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),s.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF（低清模式）失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async buildGlobalGifPalette({decoder:e,frameCount:t,width:n,height:r}){const a=document.createElement("canvas");a.width=n,a.height=r;const o=a.getContext("2d",{willReadFrequently:!0});if(!o)return null;const l=1,d=256*1024*1024,u=[];let c=0,s=!1;for(let g=0;g<t;g+=l){const S=(await e.decode({frameIndex:g})).image,y=S.displayWidth||S.codedWidth,x=S.displayHeight||S.codedHeight;o.clearRect(0,0,n,r),o.drawImage(S,0,0,y,x);const E=o.getImageData(0,0,n,r).data;!s&&this.hasTransparentPixels(E)&&(s=!0);const A=d-c;if(A<E.length){S.close();break}const b=this.sampleRgbaPixels(E,A);if(b&&b.length>0&&(u.push(b),c+=b.length),S.close(),c>=d)break}if(u.length===0)return null;const h=this.concatUint8Arrays(u,c),p=s?"rgba4444":"rgb565",m=ie(h,s?255:256,{format:p,oneBitAlpha:s,clearAlpha:!1,clearAlphaThreshold:96,useSqrt:!0});return s&&m.unshift([0,0,0,0]),{palette:m,paletteFormat:p,hasTransparency:s}}hasTransparentPixels(e){if(!e||e.length<4)return!1;for(let t=3;t<e.length;t+=4)if(e[t]<16)return!0;return!1}applyPaletteWithFloydSteinberg(e,t,n,r,a={}){const o=!!a.hasTransparency,l=Number.isInteger(a.transparentIndex)?a.transparentIndex:0,d=Number.isFinite(a.alphaThreshold)?a.alphaThreshold:16,u=t*n,c=new Uint8Array(u),s=new Float32Array(e.length),h=new Map;for(let f=0;f<e.length;f++)s[f]=e[f];const p=o?1:0;for(let f=0;f<n;f++)for(let m=0;m<t;m++){const g=f*t+m,w=g*4,S=s[w+3];if(o&&S<d){c[g]=l;continue}const y=this.clampColor(s[w]),x=this.clampColor(s[w+1]),E=this.clampColor(s[w+2]),A=this.findNearestPaletteIndex(y,x,E,r,p,h),b=r[A]||[y,x,E];c[g]=A;const C=y-b[0],I=x-b[1],B=E-b[2];this.distributeDitherError(s,t,n,m,f,C,I,B)}return c}distributeDitherError(e,t,n,r,a,o,l,d){this.addDitherError(e,t,n,r+1,a,o,l,d,7/16),this.addDitherError(e,t,n,r-1,a+1,o,l,d,3/16),this.addDitherError(e,t,n,r,a+1,o,l,d,5/16),this.addDitherError(e,t,n,r+1,a+1,o,l,d,1/16)}addDitherError(e,t,n,r,a,o,l,d,u){if(r<0||a<0||r>=t||a>=n)return;const c=(a*t+r)*4;e[c]=this.clampColor(e[c]+o*u),e[c+1]=this.clampColor(e[c+1]+l*u),e[c+2]=this.clampColor(e[c+2]+d*u)}findNearestPaletteIndex(e,t,n,r,a,o){const l=e<<16|t<<8|n;if(o.has(l))return o.get(l);let d=a,u=Number.POSITIVE_INFINITY;for(let c=a;c<r.length;c++){const s=r[c],h=e-s[0],p=t-s[1],f=n-s[2],m=h*h+p*p+f*f;m<u&&(u=m,d=c)}return o.set(l,d),d}clampColor(e){return e<0?0:e>255?255:e}toGifDelayMs(e){const t=Number.isFinite(e)&&e>0?e:1e5,n=Math.round(t/1e3);return Math.max(20,n)}sampleRgbaPixels(e,t){if(!e||t<=0)return null;const n=Math.floor(e.length/4),r=Math.floor(t/4);return n<=0||r<=0||n>r?null:new Uint8Array(e)}concatUint8Arrays(e,t){const n=new Uint8Array(t);let r=0;return e.forEach(a=>{n.set(a,r),r+=a.length}),n}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const r=new Image,a=URL.createObjectURL(e);r.onload=()=>{URL.revokeObjectURL(a),t(r)},r.onerror=o=>{URL.revokeObjectURL(a),n(o)},r.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",r=(e||"download").split("?")[0],a=r.lastIndexOf(".");return a<=0?`${r}.${n}`:`${r.slice(0,a)}.${n}`}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}downloadDataURL(e,t){this.triggerDownload(e,t)}generateFilename(e,t){let n=this.getExtension(e);if(!n){const o=this.guessMimeType(e);n=this.mimeToExt(o)}const r=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${r}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[e]||"jpg"}}function tt(i={}){const{target:e,handle:t=e,minWidth:n=300,minHeight:r=200,onResizeStart:a,onResize:o,onResizeEnd:l}=i;if(!e||!t)return()=>{};let d=!1,u=0,c=0,s=0,h=0;const p=g=>{g.preventDefault(),g.stopPropagation(),d=!0,u=g.clientX,c=g.clientY,s=e.offsetWidth,h=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",a==null||a(g)},f=g=>{if(!d)return;const w=g.clientX-u,S=g.clientY-c,y=Math.max(n,s+w),x=Math.max(r,h+S);e.style.width=`${y}px`,e.style.height=`${x}px`,o==null||o(g,{width:y,height:x})},m=g=>{d&&(d=!1,document.body.style.userSelect="",document.body.style.cursor="",l==null||l(g))};return t.addEventListener("mousedown",p),document.addEventListener("mousemove",f),document.addEventListener("mouseup",m),()=>{t.removeEventListener("mousedown",p),document.removeEventListener("mousemove",f),document.removeEventListener("mouseup",m)}}function nt(){const i=document.getElementById("id-panel");if(i)return i;const e=N("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
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
  `,document.body.appendChild(e),it(e),rt(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{Q()}),e}function it(i){const e=i.querySelector(".id-panel-header");he({target:i,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".id-panel-close")})}function rt(i){const e=i.querySelector(".id-resize-handle");e&&tt({target:i,handle:e,minWidth:300,minHeight:200})}function ye(){try{return window.top===window.self}catch{return!1}}ye()&&xe(ve);const at="i";var se,le;const V=(le=(se=W.imageDownloader)==null?void 0:se.storageKeys)==null?void 0:le.downloadHistory;var ce,de;const oe=(de=(ce=W.imageDownloader)==null?void 0:ce.storageKeys)==null?void 0:de.gifQualityMode;function ot(i){return i==="low"?"low":"high"}(function(){if(!ye()||window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let i=[],e=[];const t=[];let n=!0,r=!0;function a(h){h&&(h.textContent=`历史下载数: ${t.length}`)}function o(h){return h&&typeof h=="object"&&typeof h.url=="string"&&h.url?{url:h.url,downloadedAt:typeof h.downloadedAt=="string"?h.downloadedAt:null}:null}async function l(h){try{const p=await J(V,[]);Array.isArray(p)&&p.forEach(f=>{const m=o(f);m&&t.push(m)}),a(h),k.info("已加载下载历史",{count:t.length})}catch(p){k.error("读取下载历史失败",p),a(h)}}async function d(){try{await j(V,t),k.debug("下载历史已保存",{count:t.length})}catch(h){k.error("保存下载历史失败",h)}}function u(h,p){document.addEventListener("keydown",f=>{const m=String(f.key||"").toLowerCase();if(f.ctrlKey&&f.shiftKey&&m===at){if(f.preventDefault(),!r)return;r=!1;const g=document.getElementById("id-panel");(!g||g.style.display==="none"||g.style.display==="")&&fe(),k.info("快捷键触发图片捕获"),i=new ee().getAllImages(),h.render(i),p&&(p.textContent=`已捕获 ${i.length} 张图片`),k.info("快捷键捕获完成",{count:i.length}),setTimeout(()=>{r=!0},500)}})}async function c(){k.info("imageDownloader 初始化开始",{logLevel:W.logLevel});const h=nt(),p=Pe(),f=h.querySelector("#id-enhancer-status");if(p){const v=ze(p);f.textContent=`✨ 当前网站已启用增强：${v}`,f.classList.add("active")}else f.textContent="",f.classList.remove("active");Ee({onToggle:ke}),Q();const m=h.querySelector(".id-image-grid"),g=h.querySelector("#id-select-all"),w=h.querySelector("#id-select-none"),S=h.querySelector("#id-download"),y=h.querySelector("#id-clear-storage"),x=h.querySelector("#id-capture"),E=h.querySelector("#id-prefix"),A=h.querySelector("#id-gif-quality-toggle"),b=h.querySelector(".id-status"),C=h.querySelector("#id-downloaded-count");await l(C);try{n=ot(await J(oe,"high"))!=="low"}catch(v){k.warn("读取 GIF 画质模式失败，使用默认清晰模式",v),n=!0}A&&(A.checked=n,A.addEventListener("change",async()=>{n=!!A.checked;try{await j(oe,n?"high":"low")}catch(v){k.warn("保存 GIF 画质模式失败",v)}b.textContent=n?"动态图画质：清晰（更慢、更大）":"动态图画质：标准（更快、更小）"}));const I=new He({grid:m,onSelectionChange:v=>{e=v,B()}});u(I,b),x.addEventListener("click",()=>{k.info("开始手动捕获图片"),i=new ee().getAllImages(),I.render(i),b.textContent=`已捕获 ${i.length} 张图片`,k.info("手动捕获完成",{count:i.length})}),g.addEventListener("click",()=>{I.selectAll()}),w.addEventListener("click",()=>{I.selectNone()}),y.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){t.length=0;try{await j(V,[]),a(C),b.textContent="存储已清除",k.info("图片脚本存储已清除")}catch(M){b.textContent="清除存储失败",k.error("清除图片脚本存储失败",M)}}}),S.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const v=[...e],M=E.value||D();k.info("开始下载选中图片",{count:v.length,prefix:M}),new et({prefix:M,animatedGifHighQuality:n,onProgress:(T,P)=>{b.textContent=`下载中: ${T}/${P}`},onComplete:async(T,P,z=[])=>{if(b.textContent=`完成: 成功 ${T}, 失败 ${P}`,z.length>0){const H=new Date().toISOString();z.forEach(F=>{typeof F=="string"&&F&&t.push({url:F,downloadedAt:H})}),a(C),await d()}k.info("下载流程完成",{success:T,failed:P,historyAdded:z.length,historyTotal:t.length})}}).download(v)});function B(){const v=e.length;S.disabled=v===0,S.textContent=v===0?"下载选中":`下载选中 (${v})`}function D(){const v=new Date,M=String(v.getMonth()+1).padStart(2,"0"),L=String(v.getDate()).padStart(2,"0"),T=String(v.getHours()).padStart(2,"0"),P=String(v.getMinutes()).padStart(2,"0");return`${M}${L}${T}${P}`}B(),k.info("imageDownloader 初始化完成",{downloadedCount:t.length})}function s(){c().catch(h=>{k.error("imageDownloader 初始化失败",h)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",s):s()})();
