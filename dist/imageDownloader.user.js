// ==UserScript==
// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// ==/UserScript==

function P(i,e={},t="",n=""){const r=document.createElement(i);for(const[a,s]of Object.entries(e))if(a==="className")r.className=s;else if(a==="dataset")for(const[c,d]of Object.entries(s))r.dataset[c]=d;else a.startsWith("on")?r.addEventListener(a.slice(2).toLowerCase(),s):r.setAttribute(a,s);return t?r.innerHTML=t:n&&(r.textContent=n),r}function he(i){const e=P("style",{type:"text/css"});return e.textContent=i,document.head.appendChild(e),e}const F={logLevel:"info",storagePrefix:"userscript_",imageDownloader:{storageKeys:{downloadHistory:"imageDownloader_download_history"}}};function re(i){return F.storagePrefix+i}const X={debug:0,info:1,warn:2,error:3};function R(i,e,...t){const n=X[F.logLevel];if(X[i]<n)return;const r=`[${i.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(i){case"debug":case"info":console.log(`${r} [${a}]`,e,...t);break;case"warn":console.warn(`${r} [${a}]`,e,...t);break;case"error":console.error(`${r} [${a}]`,e,...t);break}}const E={debug:(i,...e)=>R("debug",i,...e),info:(i,...e)=>R("info",i,...e),warn:(i,...e)=>R("warn",i,...e),error:(i,...e)=>R("error",i,...e)};async function K(i,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(re(i),n),t()})}async function fe(i,e=null){const t=await GM_getValue(re(i));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const ge=`/**
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
`;function ae(i){const{target:e,handle:t=e,onClick:n,shouldStart:r,dragThreshold:a=4,clampToViewport:s=!0,dragClassName:c,bodyCursor:d="",removeTransformOnStart:u=!1,onDragStart:l,onDrag:o,onDragEnd:h}=i||{};if(!e||!t)return()=>{};let p=null,g=0,m=0,f=0,y=0,B=!1,S=!1;const b=w=>{if(n){if(S){w.preventDefault(),w.stopPropagation(),S=!1;return}n(w)}},I=w=>{if(w.pointerType==="mouse"&&w.button!==0||typeof r=="function"&&!r(w))return;const v=e.getBoundingClientRect();g=w.clientX,m=w.clientY,f=v.left,y=v.top,B=!1,p=w.pointerId,e.style.left=`${f}px`,e.style.top=`${y}px`,e.style.right="auto",e.style.bottom="auto",u&&(e.style.transform="none"),c&&e.classList.add(c),t.setPointerCapture(p),document.body.style.userSelect="none",d&&(document.body.style.cursor=d),typeof l=="function"&&l(w),w.preventDefault()},D=w=>{if(w.pointerId!==p)return;const v=w.clientX-g,C=w.clientY-m;if(!B&&Math.hypot(v,C)>=a&&(B=!0,S=!0),!B)return;let A=f+v,k=y+C;if(s){const M=Math.max(0,window.innerWidth-e.offsetWidth),L=Math.max(0,window.innerHeight-e.offsetHeight);A=Math.max(0,Math.min(A,M)),k=Math.max(0,Math.min(k,L))}e.style.left=`${A}px`,e.style.top=`${k}px`,typeof o=="function"&&o(w)},x=w=>{w.pointerId===p&&(t.hasPointerCapture(p)&&t.releasePointerCapture(p),p=null,c&&e.classList.remove(c),document.body.style.userSelect="",d&&(document.body.style.cursor=""),typeof h=="function"&&h(w))};return t.addEventListener("click",b),t.addEventListener("pointerdown",I),t.addEventListener("pointermove",D),t.addEventListener("pointerup",x),t.addEventListener("pointercancel",x),()=>{t.removeEventListener("click",b),t.removeEventListener("pointerdown",I),t.removeEventListener("pointermove",D),t.removeEventListener("pointerup",x),t.removeEventListener("pointercancel",x)}}const pe=30,me=30;function Q(i){if(!i)return;const e=i.getBoundingClientRect(),t=Math.max(1,window.innerWidth-e.width),n=Math.max(1,window.innerHeight-e.height);i.dataset.ratioX=String(Math.min(1,Math.max(0,e.left/t))),i.dataset.ratioY=String(Math.min(1,Math.max(0,e.top/n)))}function be(i){if(!i)return;const e=Number(i.dataset.ratioX),t=Number(i.dataset.ratioY);if(!Number.isFinite(e)||!Number.isFinite(t))return;const n=Math.max(0,window.innerWidth-i.offsetWidth),r=Math.max(0,window.innerHeight-i.offsetHeight);i.style.left=`${Math.round(n*e)}px`,i.style.top=`${Math.round(r*t)}px`,i.style.right="auto",i.style.bottom="auto"}function we(i){const e=P("div",{id:"id-floating-btn",title:"图片批量下载器"},`
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);document.body.appendChild(e),e.style.right=`${pe}px`,e.style.bottom=`${me}px`,ae({target:e,onClick:()=>i.onToggle(),dragClassName:"dragging",onDragEnd:()=>{Q(e)}}),requestAnimationFrame(()=>{Q(e)}),window.addEventListener("resize",()=>{be(e)})}function oe(){const i=document.getElementById("id-panel");i&&(i.style.display="flex",i.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function V(){const i=document.getElementById("id-panel");i&&(i.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function ye(){const i=document.getElementById("id-panel");i&&(i.style.display==="none"||i.style.display===""?oe():V())}const xe={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(i){if(!this.urlPattern.test(i))return i;const e=i.indexOf("?"),t=e===-1?i:i.slice(0,e),n=e===-1?"":i.slice(e),r=t.indexOf("@");if(r===-1)return i;const a=t.slice(0,r),c=t.slice(r+1).match(/\.([a-z0-9]+)$/i),d=c?c[1].toLowerCase():"";return d==="avif"||d==="awebp"||d==="webp"?`${a}@3840w.${d}${n}`:`${a}@3840w${n}`}},ve={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(i){return i}},Ce={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(i){return i}},Se={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(i){return i.replace(/_\w+(\.\w+)$/i,"$1")}},_=[xe,ve,Ce,Se];function Ie(i){for(const e of _)if(e.urlPattern.test(i))return e;return null}function Ee(i){const e=window.location.href;for(const t of _)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function ke(i){const e=Ee();return e?e.name:null}function Ae(i){const e=_.find(t=>t.name===i);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||i}function Le(i){const e=Ie(i);return e?e.enhance(i):i}class J{constructor(){this.imageExtensions=["jpg","jpeg","png","gif","webp","bmp","svg","ico","avif","awebp"]}getAllImages(){const e=[],t=new Set;document.querySelectorAll("img").forEach(u=>{this.processImageElement(u,"img",t,e)}),document.querySelectorAll("image").forEach(u=>{var o;const l=this.getImageSrc(((o=u.href)==null?void 0:o.baseVal)||u.getAttribute("href"));l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"svg-image",u)))});const a=document.querySelectorAll("*");return a.forEach(u=>{const o=window.getComputedStyle(u).backgroundImage;o&&o!=="none"&&this.extractUrls(o).forEach(p=>{const g=this.getImageSrc(p);g&&!t.has(g)&&(t.add(g),e.push(this.createImageInfo(g,"background",u)))})}),document.querySelectorAll("source").forEach(u=>{var o,h,p;const l=this.getImageSrc((p=(h=(o=u.srcset)==null?void 0:o.split(",")[0])==null?void 0:h.trim())==null?void 0:p.split(" ")[0]);l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"source",u)))}),a.forEach(u=>{this.processLazySrc(u,t,e)}),document.querySelectorAll("video, audio").forEach(u=>{const l=u.getAttribute("poster");if(l){const o=this.getImageSrc(l);o&&!t.has(o)&&(t.add(o),e.push(this.createImageInfo(o,"media-poster",u)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(u=>{const l=this.getImageSrc(u.href);l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"icon",u)))}),e.filter(u=>this.isValidImage(u.src))}processImageElement(e,t,n,r){var s,c,d;const a=this.getImageSrc(e.src)||this.getImageSrc((s=e.dataset)==null?void 0:s.src)||this.getImageSrc((c=e.dataset)==null?void 0:c.original)||this.getImageSrc((d=e.dataset)==null?void 0:d.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),r.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var c,d,u;let s=((c=e.dataset)==null?void 0:c[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&s)try{const l=JSON.parse(s);s=l.src||l.url||l.original}catch{}if(s){(a.includes("srcset")||a==="data-srcset")&&(s=(u=(d=s.split(",")[0])==null?void 0:d.trim())==null?void 0:u.split(" ")[0]);const l=this.getImageSrc(s);l&&!t.has(l)&&(t.add(l),n.push(this.createImageInfo(l,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(r=>e.toLowerCase().includes(r))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=Le(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let r;for(;(r=n.exec(e))!==null;)t.push(r[1]);return t}isValidImage(e){var r;if(!e)return!1;const t=(r=e.split(".").pop())==null?void 0:r.toLowerCase().split("?")[0];return t&&this.imageExtensions.includes(t)||e.includes("picsum.photos")||e.includes("unsplash.com")||e.includes("placeholder.com")||e.includes("via.placeholder")?!0:["cdn.","img.","image.","assets.","byteimg.com","bytedance.com","toutiao.com","douyin.com","toutiaoimg.com","feishu.cn",".jpg",".png",".webp",".gif",".svg",".bmp",".awebp",".avif"].some(a=>e.toLowerCase().includes(a))}createImageInfo(e,t,n){return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class Be{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.emptyText=e.emptyText||"未找到资源",this.classNames={item:"rs-item",selected:"selected",empty:"rs-empty",thumb:"rs-thumb",checkbox:"rs-checkbox",info:"rs-info",...e.classNames},this.createThumbnail=e.createThumbnail||this.defaultCreateThumbnail.bind(this),this.createInfo=e.createInfo||this.defaultCreateInfo.bind(this),this.isSelectable=e.isSelectable||(()=>!0),this.getDisabledReason=e.getDisabledReason||(()=>"当前资源不可选"),this.selected=new Set,this.resources=[]}render(e){if(this.resources=e,this.selected.clear(),this.grid.innerHTML="",!Array.isArray(e)||e.length===0){this.grid.innerHTML=`<div class="${this.classNames.empty}">${this.emptyText}</div>`,this.onSelectionChange([]);return}e.forEach((t,n)=>{const r=this.createResourceItem(t,n);this.grid.appendChild(r)}),this.onSelectionChange([])}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);if(!t)return;const n=this.resources[e];if(!this.isSelectable(n,e)){const r=this.getDisabledReason(n,e);t.title=r||"";return}this.selected.has(e)?(this.selected.delete(e),t.classList.remove(this.classNames.selected)):(this.selected.add(e),t.classList.add(this.classNames.selected)),this.onSelectionChange(this.getSelectedResources())}selectAll(){this.selected.clear(),this.resources.forEach((e,t)=>{this.isSelectable(e,t)&&this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedResources())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}getSelectedResources(){return Array.from(this.selected).filter(e=>e>=0&&e<this.resources.length).filter(e=>this.isSelectable(this.resources[e],e)).map(e=>this.resources[e])}createResourceItem(e,t){const n=P("div",{className:this.classNames.item,dataset:{index:t}});this.isSelectable(e,t)||(n.classList.add("unselectable"),n.title=this.getDisabledReason(e,t)||"",n.setAttribute("aria-disabled","true"));const r={toggle:()=>this.toggle(t),createElement:P,updateResource:d=>{if(!(!d||typeof d!="object")){if(this.resources[t]&&typeof this.resources[t]=="object"){Object.assign(this.resources[t],d);return}this.resources[t]={...d}}}},a=this.createThumbnail(e,t,r);a&&n.appendChild(a);const s=P("div",{className:this.classNames.checkbox,onClick:d=>{d.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'),c=this.createInfo(e,t,r);return n.appendChild(s),c&&n.appendChild(c),n}defaultCreateThumbnail(e,t,n){const r=P("div",{className:this.classNames.thumb}),a=P("img",{src:(e==null?void 0:e.src)||"",alt:`资源 ${t+1}`,loading:"lazy"});return r.appendChild(a),r.addEventListener("click",()=>n.toggle()),r}defaultCreateInfo(e){const t=P("div",{className:this.classNames.info}),n=this.getFileName((e==null?void 0:e.src)||"");return t.appendChild(P("span",{},this.truncate(n,28))),t}updateUI(){this.grid.querySelectorAll(`.${this.classNames.item}`).forEach(t=>{const n=parseInt(t.dataset.index||"-1",10);this.selected.has(n)?t.classList.add(this.classNames.selected):t.classList.remove(this.classNames.selected)})}getFileName(e){var r;if(!e)return"未命名";const t=String(e).split("/"),n=((r=t[t.length-1])==null?void 0:r.split("?")[0])||"未命名";try{return decodeURIComponent(n)||"未命名"}catch{return n||"未命名"}}truncate(e,t){return!e||e.length<=t?e:e.slice(0,Math.max(0,t-3))+"..."}}function De(i){var n;if(!i)return"未命名";const e=String(i).split("/"),t=((n=e[e.length-1])==null?void 0:n.split("?")[0])||"未命名";try{return decodeURIComponent(t)||"未命名"}catch{return t||"未命名"}}function Me(i,e){return!i||i.length<=e?i:i.substring(0,e-3)+"..."}class ze extends Be{constructor(e){super({...e,emptyText:"未找到图片",classNames:{item:"id-image-item",selected:"selected",empty:"id-empty",thumb:"id-image-thumb",checkbox:"id-checkbox",info:"id-image-info"},createThumbnail:(t,n,r)=>{const a=r.createElement("div",{className:"id-image-thumb"}),s=r.createElement("img",{src:t.src,alt:t.alt||`图片 ${n+1}`,loading:"lazy",onerror:()=>{s.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});return s.onload=()=>{s.naturalWidth>0&&r.updateResource({width:s.naturalWidth,height:s.naturalHeight})},a.appendChild(s),a.addEventListener("click",()=>{r.toggle()}),a},createInfo:(t,n,r)=>{const a=r.createElement("div",{className:"id-image-info"}),s=De(t.src),c=r.createElement("span",{className:"id-size"});return c.textContent=t.width&&t.height?`${t.width}×${t.height}`:"",a.appendChild(r.createElement("span",{className:"id-filename",title:t.src},Me(s,20))),a.appendChild(c),a}})}getSelectedImages(){return this.getSelectedResources()}}var Pe={trailer:59};function se(i=256){let e=0,t=new Uint8Array(i);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(r){n(e+1),t[e]=r,e++},writeBytes(r,a=0,s=r.length){n(e+s);for(let c=0;c<s;c++)t[e++]=r[c+a]},writeBytesView(r,a=0,s=r.byteLength){n(e+s),t.set(r.subarray(a,a+s),e),e+=s}};function n(r){var a=t.length;if(a>=r)return;var s=1024*1024;r=Math.max(r,a*(a<s?2:1.125)>>>0),a!=0&&(r=Math.max(r,256));let c=t;t=new Uint8Array(r),e>0&&t.set(c.subarray(0,e),0)}}var q=12,Z=5003,Te=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function $e(i,e,t,n,r=se(512),a=new Uint8Array(256),s=new Int32Array(Z),c=new Int32Array(Z)){let d=s.length,u=Math.max(2,n);a.fill(0),c.fill(0),s.fill(-1);let l=0,o=0,h=u+1,p=h,g=!1,m=p,f=(1<<m)-1,y=1<<h-1,B=y+1,S=y+2,b=0,I=t[0],D=0;for(let v=d;v<65536;v*=2)++D;D=8-D,r.writeByte(u),w(y);let x=t.length;for(let v=1;v<x;v++)e:{let C=t[v],A=(C<<q)+I,k=C<<D^I;if(s[k]===A){I=c[k];break e}let M=k===0?1:d-k;for(;s[k]>=0;)if(k-=M,k<0&&(k+=d),s[k]===A){I=c[k];break e}w(I),I=C,S<1<<q?(c[k]=S++,s[k]=A):(s.fill(-1),S=y+2,g=!0,w(y))}return w(I),w(B),r.writeByte(0),r.bytesView();function w(v){for(l&=Te[o],o>0?l|=v<<o:l=v,o+=m;o>=8;)a[b++]=l&255,b>=254&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0),l>>=8,o-=8;if((S>f||g)&&(g?(m=p,f=(1<<m)-1,g=!1):(++m,f=m===q?1<<m:(1<<m)-1)),v==B){for(;o>0;)a[b++]=l&255,b>=254&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0),l>>=8,o-=8;b>0&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0)}}}var Ue=$e;function ce(i,e,t){return i<<8&63488|e<<2&992|t>>3}function le(i,e,t,n){return i>>4|e&240|(t&240)<<4|(n&240)<<8}function de(i,e,t){return i>>4<<8|e&240|t>>4}function H(i,e,t){return i<e?e:i>t?t:i}function W(i){return i*i}function ee(i,e,t){var n=0,r=1e100;let a=i[e],s=a.cnt;a.ac;let c=a.rc,d=a.gc,u=a.bc;for(var l=a.fw;l!=0;l=i[l].fw){let h=i[l],p=h.cnt,g=s*p/(s+p);if(!(g>=r)){var o=0;o+=g*W(h.rc-c),!(o>=r)&&(o+=g*W(h.gc-d),!(o>=r)&&(o+=g*W(h.bc-u),!(o>=r)&&(r=o,n=l)))}}a.err=r,a.nn=n}function j(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function Ne(i,e){let t=e==="rgb444"?4096:65536,n=new Array(t),r=i.length;if(e==="rgba4444")for(let a=0;a<r;++a){let s=i[a],c=s>>24&255,d=s>>16&255,u=s>>8&255,l=s&255,o=le(l,u,d,c),h=o in n?n[o]:n[o]=j();h.rc+=l,h.gc+=u,h.bc+=d,h.ac+=c,h.cnt++}else if(e==="rgb444")for(let a=0;a<r;++a){let s=i[a],c=s>>16&255,d=s>>8&255,u=s&255,l=de(u,d,c),o=l in n?n[l]:n[l]=j();o.rc+=u,o.gc+=d,o.bc+=c,o.cnt++}else for(let a=0;a<r;++a){let s=i[a],c=s>>16&255,d=s>>8&255,u=s&255,l=ce(u,d,c),o=l in n?n[l]:n[l]=j();o.rc+=u,o.gc+=d,o.bc+=c,o.cnt++}return n}function Re(i,e,t={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:a=0,clearAlphaThreshold:s=0,oneBitAlpha:c=!1}=t;if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let d=new Uint32Array(i.buffer),u=t.useSqrt!==!1,l=n==="rgba4444",o=Ne(d,n),h=o.length,p=h-1,g=new Uint32Array(h+1);for(var m=0,f=0;f<h;++f){let L=o[f];if(L!=null){var y=1/L.cnt;l&&(L.ac*=y),L.rc*=y,L.gc*=y,L.bc*=y,o[m++]=L}}W(e)/m<.022&&(u=!1);for(var f=0;f<m-1;++f)o[f].fw=f+1,o[f+1].bk=f,u&&(o[f].cnt=Math.sqrt(o[f].cnt));u&&(o[f].cnt=Math.sqrt(o[f].cnt));var B,S,b;for(f=0;f<m;++f){ee(o,f);var I=o[f].err;for(S=++g[0];S>1&&(b=S>>1,!(o[B=g[b]].err<=I));S=b)g[S]=B;g[S]=f}var D=m-e;for(f=0;f<D;){for(var x;;){var w=g[1];if(x=o[w],x.tm>=x.mtm&&o[x.nn].mtm<=x.tm)break;x.mtm==p?w=g[1]=g[g[0]--]:(ee(o,w),x.tm=f);var I=o[w].err;for(S=1;(b=S+S)<=g[0]&&(b<g[0]&&o[g[b]].err>o[g[b+1]].err&&b++,!(I<=o[B=g[b]].err));S=b)g[S]=B;g[S]=w}var v=o[x.nn],C=x.cnt,A=v.cnt,y=1/(C+A);l&&(x.ac=y*(C*x.ac+A*v.ac)),x.rc=y*(C*x.rc+A*v.rc),x.gc=y*(C*x.gc+A*v.gc),x.bc=y*(C*x.bc+A*v.bc),x.cnt+=v.cnt,x.mtm=++f,o[v.bk].fw=v.fw,o[v.fw].bk=v.bk,v.mtm=p}let k=[];var M=0;for(f=0;;++M){let L=H(Math.round(o[f].rc),0,255),$=H(Math.round(o[f].gc),0,255),N=H(Math.round(o[f].bc),0,255),z=255;l&&(z=H(Math.round(o[f].ac),0,255),c&&(z=z<=(typeof c=="number"?c:127)?0:255),r&&z<=s&&(L=$=N=a,z=0));let Y=l?[L,$,N,z]:[L,$,N];if(He(k,Y)||k.push(Y),(f=o[f].fw)==0)break}return k}function He(i,e){for(let t=0;t<i.length;t++){let n=i[t],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&a)return!0}return!1}function We(i,e,t="rgb565"){if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(i.buffer),r=n.length,a=t==="rgb444"?4096:65536,s=new Uint8Array(r),c=new Array(a);if(t==="rgba4444")for(let d=0;d<r;d++){let u=n[d],l=u>>24&255,o=u>>16&255,h=u>>8&255,p=u&255,g=le(p,h,o,l),m=g in c?c[g]:c[g]=Fe(p,h,o,l,e);s[d]=m}else{let d=t==="rgb444"?de:ce;for(let u=0;u<r;u++){let l=n[u],o=l>>16&255,h=l>>8&255,p=l&255,g=d(p,h,o),m=g in c?c[g]:c[g]=qe(p,h,o,e);s[u]=m}}return s}function Fe(i,e,t,n,r){let a=0,s=1e100;for(let c=0;c<r.length;c++){let d=r[c],u=d[3],l=U(u-n);if(l>s)continue;let o=d[0];if(l+=U(o-i),l>s)continue;let h=d[1];if(l+=U(h-e),l>s)continue;let p=d[2];l+=U(p-t),!(l>s)&&(s=l,a=c)}return a}function qe(i,e,t,n){let r=0,a=1e100;for(let s=0;s<n.length;s++){let c=n[s],d=c[0],u=U(d-i);if(u>a)continue;let l=c[1];if(u+=U(l-e),u>a)continue;let o=c[2];u+=U(o-t),!(u>a)&&(a=u,r=s)}return r}function U(i){return i*i}function je(i={}){let{initialCapacity:e=4096,auto:t=!0}=i,n=se(e),r=5003,a=new Uint8Array(256),s=new Int32Array(r),c=new Int32Array(r),d=!1;return{reset(){n.reset(),d=!1},finish(){n.writeByte(Pe.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:u,writeFrame(l,o,h,p={}){let{transparent:g=!1,transparentIndex:m=0,delay:f=0,palette:y=null,repeat:B=0,colorDepth:S=8,dispose:b=-1}=p,I=!1;if(t?d||(I=!0,u(),d=!0):I=!!p.first,o=Math.max(0,Math.floor(o)),h=Math.max(0,Math.floor(h)),I){if(!y)throw new Error("First frame must include a { palette } option");Ve(n,o,h,y,S),te(n,y),B>=0&&_e(n,B)}let D=Math.round(f/10);Oe(n,b,D,g,m);let x=!!y&&!I;Ge(n,o,h,x?y:null),x&&te(n,y),Ye(n,l,o,h,S,a,s,c)}};function u(){ue(n,"GIF89a")}}function Oe(i,e,t,n,r){i.writeByte(33),i.writeByte(249),i.writeByte(4),r<0&&(r=0,n=!1);var a,s;n?(a=1,s=2):(a=0,s=0),e>=0&&(s=e&7),s<<=2,i.writeByte(0|s|0|a),T(i,t),i.writeByte(r||0),i.writeByte(0)}function Ve(i,e,t,n,r=8){let a=1,s=0,c=G(n.length)-1,d=a<<7|r-1<<4|s<<3|c;T(i,e),T(i,t),i.writeBytes([d,0,0])}function _e(i,e){i.writeByte(33),i.writeByte(255),i.writeByte(11),ue(i,"NETSCAPE2.0"),i.writeByte(3),i.writeByte(1),T(i,e),i.writeByte(0)}function te(i,e){let t=1<<G(e.length);for(let n=0;n<t;n++){let r=[0,0,0];n<e.length&&(r=e[n]),i.writeByte(r[0]),i.writeByte(r[1]),i.writeByte(r[2])}}function Ge(i,e,t,n){if(i.writeByte(44),T(i,0),T(i,0),T(i,e),T(i,t),n){let r=0,a=0,s=G(n.length)-1;i.writeByte(128|r|a|0|s)}else i.writeByte(0)}function Ye(i,e,t,n,r=8,a,s,c){Ue(t,n,e,r,i,a,s,c)}function T(i,e){i.writeByte(e&255),i.writeByte(e>>8&255)}function ue(i,e){for(var t=0;t<e.length;t++)i.writeByte(e.charCodeAt(t))}function G(i){return Math.max(Math.ceil(Math.log2(i)),1)}class Xe{constructor(e){this.prefix=e.prefix||"",this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){E.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.successUrls=[],E.info("开始批量下载",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,E.info("批量下载完成",{success:this.successCount,failed:this.failedCount,successUrls:this.successUrls.length}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++,this.successUrls.push(e.src)}catch(r){E.error(`下载失败: ${e.src}`,r),this.failedCount++}this.processQueue()}async downloadFile(e,t){const n=e.startsWith("data:");try{const r=await fetch(e);if(!r.ok)throw new Error(`HTTP ${r.status}`);const a=await r.blob(),s=r.headers.get("content-type")||a.type||"",c=await this.prepareDownloadTarget(e,a,t,s),d=URL.createObjectURL(c.blob);this.triggerDownload(d,c.filename),setTimeout(()=>URL.revokeObjectURL(d),1e3)}catch{if(!n){E.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,t);return}this.downloadDataURL(e,t)}}async prepareDownloadTarget(e,t,n,r=""){if(!this.isWebpResource(e,r))return{blob:t,filename:n};if(await this.isAnimatedWebp(t)){const c=await this.convertAnimatedWebpToGif(t);return c?{blob:c,filename:this.replaceExtension(n,"gif")}:(E.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}const s=await this.convertStaticWebpToPng(t);return s?{blob:s,filename:this.replaceExtension(n,"png")}:(E.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),r=(t||"").toLowerCase();return r.includes("image/webp")||r.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let r=12;for(;r+8<=n.length;){const a=this.readFourCC(n,r),s=new DataView(t).getUint32(r+4,!0),c=r+8,d=c+s;if(d>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&s>=1&&n[c]&2)return!0;r=d+s%2}return!1}catch(t){return E.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,r=t.height||t.naturalHeight||0;if(!n||!r)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=r;const s=a.getContext("2d");return s?(s.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(d=>{a.toBlob(u=>d(u),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return E.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return E.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const r=t.tracks.selectedTrack,a=(r==null?void 0:r.frameCount)||0;if(a<=0)return null;const s=je();let c=null,d=null;for(let u=0;u<a;u++){const o=(await t.decode({frameIndex:u})).image,h=o.displayWidth||o.codedWidth,p=o.displayHeight||o.codedHeight;if((!c||c.width!==h||c.height!==p)&&(c=document.createElement("canvas"),c.width=h,c.height=p,d=c.getContext("2d",{willReadFrequently:!0}),!d))return o.close(),null;d.clearRect(0,0,h,p),d.drawImage(o,0,0,h,p);const g=d.getImageData(0,0,h,p).data,m=Re(g,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});m.unshift([0,0,0,0]);const f=We(g,m,"rgba4444"),y=Math.max(20,Math.round((o.duration||1e5)/1e3));s.writeFrame(f,h,p,{palette:m,delay:y,repeat:u===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),o.close()}return s.finish(),new Blob([s.bytesView()],{type:"image/gif"})}catch(n){return E.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const r=new Image,a=URL.createObjectURL(e);r.onload=()=>{URL.revokeObjectURL(a),t(r)},r.onerror=s=>{URL.revokeObjectURL(a),n(s)},r.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",r=(e||"download").split("?")[0],a=r.lastIndexOf(".");return a<=0?`${r}.${n}`:`${r.slice(0,a)}.${n}`}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}downloadDataURL(e,t){this.triggerDownload(e,t)}generateFilename(e,t){let n=this.getExtension(e);if(!n){const s=this.guessMimeType(e);n=this.mimeToExt(s)}const r=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${r}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[e]||"jpg"}}function Ke(i={}){const{target:e,handle:t=e,minWidth:n=300,minHeight:r=200,onResizeStart:a,onResize:s,onResizeEnd:c}=i;if(!e||!t)return()=>{};let d=!1,u=0,l=0,o=0,h=0;const p=f=>{f.preventDefault(),f.stopPropagation(),d=!0,u=f.clientX,l=f.clientY,o=e.offsetWidth,h=e.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize",a==null||a(f)},g=f=>{if(!d)return;const y=f.clientX-u,B=f.clientY-l,S=Math.max(n,o+y),b=Math.max(r,h+B);e.style.width=`${S}px`,e.style.height=`${b}px`,s==null||s(f,{width:S,height:b})},m=f=>{d&&(d=!1,document.body.style.userSelect="",document.body.style.cursor="",c==null||c(f))};return t.addEventListener("mousedown",p),document.addEventListener("mousemove",g),document.addEventListener("mouseup",m),()=>{t.removeEventListener("mousedown",p),document.removeEventListener("mousemove",g),document.removeEventListener("mouseup",m)}}function Qe(){const i=document.getElementById("id-panel");if(i)return i;const e=P("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
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
  `,document.body.appendChild(e),Je(e),Ze(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{V()}),e}function Je(i){const e=i.querySelector(".id-panel-header");ae({target:i,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".id-panel-close")})}function Ze(i){const e=i.querySelector(".id-resize-handle");e&&Ke({target:i,handle:e,minWidth:300,minHeight:200})}he(ge);const et="i";var ne,ie;const O=(ie=(ne=F.imageDownloader)==null?void 0:ne.storageKeys)==null?void 0:ie.downloadHistory;(function(){if(window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let i=[],e=[];const t=[];let n=!0;function r(o){o&&(o.textContent=`历史下载数: ${t.length}`)}function a(o){return o&&typeof o=="object"&&typeof o.url=="string"&&o.url?{url:o.url,downloadedAt:typeof o.downloadedAt=="string"?o.downloadedAt:null}:null}async function s(o){try{const h=await fe(O,[]);Array.isArray(h)&&h.forEach(p=>{const g=a(p);g&&t.push(g)}),r(o),E.info("已加载下载历史",{count:t.length})}catch(h){E.error("读取下载历史失败",h),r(o)}}async function c(){try{await K(O,t),E.debug("下载历史已保存",{count:t.length})}catch(o){E.error("保存下载历史失败",o)}}function d(o,h){document.addEventListener("keydown",p=>{const g=String(p.key||"").toLowerCase();if(p.ctrlKey&&p.shiftKey&&g===et){if(p.preventDefault(),!n)return;n=!1;const m=document.getElementById("id-panel");(!m||m.style.display==="none"||m.style.display==="")&&oe(),E.info("快捷键触发图片捕获"),i=new J().getAllImages(),o.render(i),h&&(h.textContent=`已捕获 ${i.length} 张图片`),E.info("快捷键捕获完成",{count:i.length}),setTimeout(()=>{n=!0},500)}})}async function u(){E.info("imageDownloader 初始化开始",{logLevel:F.logLevel});const o=Qe(),h=ke(),p=o.querySelector("#id-enhancer-status");if(h){const C=Ae(h);p.textContent=`✨ 当前网站已启用增强：${C}`,p.classList.add("active")}else p.textContent="",p.classList.remove("active");we({onToggle:ye}),V();const g=o.querySelector(".id-image-grid"),m=o.querySelector("#id-select-all"),f=o.querySelector("#id-select-none"),y=o.querySelector("#id-download"),B=o.querySelector("#id-clear-storage"),S=o.querySelector("#id-capture"),b=o.querySelector("#id-prefix"),I=o.querySelector(".id-status"),D=o.querySelector("#id-downloaded-count");await s(D);const x=new ze({grid:g,onSelectionChange:C=>{e=C,w()}});d(x,I),S.addEventListener("click",()=>{E.info("开始手动捕获图片"),i=new J().getAllImages(),x.render(i),I.textContent=`已捕获 ${i.length} 张图片`,E.info("手动捕获完成",{count:i.length})}),m.addEventListener("click",()=>{x.selectAll()}),f.addEventListener("click",()=>{x.selectNone()}),B.addEventListener("click",async()=>{if(window.confirm("确认清除当前脚本的存储记录吗？")){t.length=0;try{await K(O,[]),r(D),I.textContent="存储已清除",E.info("图片脚本存储已清除")}catch(A){I.textContent="清除存储失败",E.error("清除图片脚本存储失败",A)}}}),y.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const C=[...e],A=b.value||v();E.info("开始下载选中图片",{count:C.length,prefix:A}),new Xe({prefix:A,onProgress:(M,L)=>{I.textContent=`下载中: ${M}/${L}`},onComplete:async(M,L,$=[])=>{if(I.textContent=`完成: 成功 ${M}, 失败 ${L}`,$.length>0){const N=new Date().toISOString();$.forEach(z=>{typeof z=="string"&&z&&t.push({url:z,downloadedAt:N})}),r(D),await c()}E.info("下载流程完成",{success:M,failed:L,historyAdded:$.length,historyTotal:t.length})}}).download(C)});function w(){const C=e.length;y.disabled=C===0,y.textContent=C===0?"下载选中":`下载选中 (${C})`}function v(){const C=new Date,A=String(C.getMonth()+1).padStart(2,"0"),k=String(C.getDate()).padStart(2,"0"),M=String(C.getHours()).padStart(2,"0"),L=String(C.getMinutes()).padStart(2,"0");return`${A}${k}${M}${L}`}w(),E.info("imageDownloader 初始化完成",{downloadedCount:t.length})}function l(){u().catch(o=>{E.error("imageDownloader 初始化失败",o)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",l):l()})();
