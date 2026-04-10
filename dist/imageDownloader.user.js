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

function U(i,e={},t="",n=""){const r=document.createElement(i);for(const[a,s]of Object.entries(e))if(a==="className")r.className=s;else if(a==="dataset")for(const[l,u]of Object.entries(s))r.dataset[l]=u;else a.startsWith("on")?r.addEventListener(a.slice(2).toLowerCase(),s):r.setAttribute(a,s);return t?r.innerHTML=t:n&&(r.textContent=n),r}function de(i){const e=U("style",{type:"text/css"});return e.textContent=i,document.head.appendChild(e),e}const R={logLevel:"info",storagePrefix:"userscript_",imageDownloader:{storageKeys:{downloadedUrls:"imageDownloader_downloaded_urls"}}};function ne(i){return R.storagePrefix+i}const K={debug:0,info:1,warn:2,error:3};function W(i,e,...t){const n=K[R.logLevel];if(K[i]<n)return;const r=`[${i.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(i){case"debug":case"info":console.log(`${r} [${a}]`,e,...t);break;case"warn":console.warn(`${r} [${a}]`,e,...t);break;case"error":console.error(`${r} [${a}]`,e,...t);break}}const k={debug:(i,...e)=>W("debug",i,...e),info:(i,...e)=>W("info",i,...e),warn:(i,...e)=>W("warn",i,...e),error:(i,...e)=>W("error",i,...e)};async function ue(i,e){return new Promise(t=>{const n=JSON.stringify(e);GM_setValue(ne(i),n),t()})}async function fe(i,e=null){const t=await GM_getValue(ne(i));if(t===void 0)return e;try{return JSON.parse(t)}catch{return t}}const ge=`/**
 * 图片批量下载器样式
 */

/* ===========================
   悬浮按钮
   =========================== */
#id-floating-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
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
  width: 24px;
  height: 24px;
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
  padding: 10px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  position: relative;
}

.id-status {
  font-size: 12px;
  color: #666;
}

.id-downloaded-count {
  font-size: 12px;
  color: #4a5568;
  margin-right: 20px;
  white-space: nowrap;
}

/* 改变大小手柄 */
.id-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
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
`;function ie(i){const{target:e,handle:t=e,onClick:n,shouldStart:r,dragThreshold:a=4,clampToViewport:s=!0,dragClassName:l,bodyCursor:u="",removeTransformOnStart:d=!1,onDragStart:c,onDrag:o,onDragEnd:f}=i||{};if(!e||!t)return()=>{};let m=null,g=0,x=0,p=0,v=0,B=!1,C=!1;const b=h=>{if(n){if(C){h.preventDefault(),h.stopPropagation(),C=!1;return}n(h)}},S=h=>{if(h.pointerType==="mouse"&&h.button!==0||typeof r=="function"&&!r(h))return;const w=e.getBoundingClientRect();g=h.clientX,x=h.clientY,p=w.left,v=w.top,B=!1,m=h.pointerId,e.style.left=`${p}px`,e.style.top=`${v}px`,e.style.right="auto",e.style.bottom="auto",d&&(e.style.transform="none"),l&&e.classList.add(l),t.setPointerCapture(m),document.body.style.userSelect="none",u&&(document.body.style.cursor=u),typeof c=="function"&&c(h),h.preventDefault()},z=h=>{if(h.pointerId!==m)return;const w=h.clientX-g,L=h.clientY-x;if(!B&&Math.hypot(w,L)>=a&&(B=!0,C=!0),!B)return;let E=p+w,I=v+L;if(s){const $=Math.max(0,window.innerWidth-e.offsetWidth),A=Math.max(0,window.innerHeight-e.offsetHeight);E=Math.max(0,Math.min(E,$)),I=Math.max(0,Math.min(I,A))}e.style.left=`${E}px`,e.style.top=`${I}px`,typeof o=="function"&&o(h)},y=h=>{h.pointerId===m&&(t.hasPointerCapture(m)&&t.releasePointerCapture(m),m=null,l&&e.classList.remove(l),document.body.style.userSelect="",u&&(document.body.style.cursor=""),typeof f=="function"&&f(h))};return t.addEventListener("click",b),t.addEventListener("pointerdown",S),t.addEventListener("pointermove",z),t.addEventListener("pointerup",y),t.addEventListener("pointercancel",y),()=>{t.removeEventListener("click",b),t.removeEventListener("pointerdown",S),t.removeEventListener("pointermove",z),t.removeEventListener("pointerup",y),t.removeEventListener("pointercancel",y)}}function he(i){const e=U("div",{id:"id-floating-btn",title:"图片批量下载器"},`
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);document.body.appendChild(e),ie({target:e,onClick:()=>i.onToggle(),dragClassName:"dragging"})}function re(){const i=document.getElementById("id-panel");i&&(i.style.display="flex",i.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function O(){const i=document.getElementById("id-panel");i&&(i.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function pe(){const i=document.getElementById("id-panel");i&&(i.style.display==="none"||i.style.display===""?re():O())}const me={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(i){if(!this.urlPattern.test(i))return i;const e=i.indexOf("?"),t=e===-1?i:i.slice(0,e),n=e===-1?"":i.slice(e),r=t.indexOf("@");if(r===-1)return i;const a=t.slice(0,r),l=t.slice(r+1).match(/\.([a-z0-9]+)$/i),u=l?l[1].toLowerCase():"";return u==="avif"||u==="awebp"||u==="webp"?`${a}@3840w.${u}${n}`:`${a}@3840w${n}`}},be={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(i){return i}},we={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(i){return i}},ye={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(i){return i.replace(/_\w+(\.\w+)$/i,"$1")}},V=[me,be,we,ye];function xe(i){for(const e of V)if(e.urlPattern.test(i))return e;return null}function ve(i){const e=window.location.href;for(const t of V)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function Ce(i){const e=ve();return e?e.name:null}function Ie(i){const e=V.find(t=>t.name===i);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||i}function Se(i){const e=xe(i);return e?e.enhance(i):i}class Y{constructor(){this.imageExtensions=["jpg","jpeg","png","gif","webp","bmp","svg","ico","avif","awebp"]}getAllImages(){const e=[],t=new Set;document.querySelectorAll("img").forEach(d=>{this.processImageElement(d,"img",t,e)}),document.querySelectorAll("image").forEach(d=>{var o;const c=this.getImageSrc(((o=d.href)==null?void 0:o.baseVal)||d.getAttribute("href"));c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"svg-image",d)))});const a=document.querySelectorAll("*");return a.forEach(d=>{const o=window.getComputedStyle(d).backgroundImage;o&&o!=="none"&&this.extractUrls(o).forEach(m=>{const g=this.getImageSrc(m);g&&!t.has(g)&&(t.add(g),e.push(this.createImageInfo(g,"background",d)))})}),document.querySelectorAll("source").forEach(d=>{var o,f,m;const c=this.getImageSrc((m=(f=(o=d.srcset)==null?void 0:o.split(",")[0])==null?void 0:f.trim())==null?void 0:m.split(" ")[0]);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"source",d)))}),a.forEach(d=>{this.processLazySrc(d,t,e)}),document.querySelectorAll("video, audio").forEach(d=>{const c=d.getAttribute("poster");if(c){const o=this.getImageSrc(c);o&&!t.has(o)&&(t.add(o),e.push(this.createImageInfo(o,"media-poster",d)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(d=>{const c=this.getImageSrc(d.href);c&&!t.has(c)&&(t.add(c),e.push(this.createImageInfo(c,"icon",d)))}),e.filter(d=>this.isValidImage(d.src))}processImageElement(e,t,n,r){var s,l,u;const a=this.getImageSrc(e.src)||this.getImageSrc((s=e.dataset)==null?void 0:s.src)||this.getImageSrc((l=e.dataset)==null?void 0:l.original)||this.getImageSrc((u=e.dataset)==null?void 0:u.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),r.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var l,u,d;let s=((l=e.dataset)==null?void 0:l[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&s)try{const c=JSON.parse(s);s=c.src||c.url||c.original}catch{}if(s){(a.includes("srcset")||a==="data-srcset")&&(s=(d=(u=s.split(",")[0])==null?void 0:u.trim())==null?void 0:d.split(" ")[0]);const c=this.getImageSrc(s);c&&!t.has(c)&&(t.add(c),n.push(this.createImageInfo(c,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(r=>e.toLowerCase().includes(r))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=Se(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let r;for(;(r=n.exec(e))!==null;)t.push(r[1]);return t}isValidImage(e){var r;if(!e)return!1;const t=(r=e.split(".").pop())==null?void 0:r.toLowerCase().split("?")[0];return t&&this.imageExtensions.includes(t)||e.includes("picsum.photos")||e.includes("unsplash.com")||e.includes("placeholder.com")||e.includes("via.placeholder")?!0:["cdn.","img.","image.","assets.","byteimg.com","bytedance.com","toutiao.com","douyin.com","toutiaoimg.com","feishu.cn",".jpg",".png",".webp",".gif",".svg",".bmp",".awebp",".avif"].some(a=>e.toLowerCase().includes(a))}createImageInfo(e,t,n){return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class ke{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.selected=new Set,this.images=[]}render(e){if(this.images=e,this.selected.clear(),this.grid.innerHTML="",e.length===0){this.grid.innerHTML='<div class="id-empty">未找到图片</div>',this.onSelectionChange([]);return}e.forEach((t,n)=>{const r=this.createImageItem(t,n);this.grid.appendChild(r)})}createImageItem(e,t){const n=U("div",{className:"id-image-item",dataset:{index:t}}),r=U("div",{className:"id-image-thumb"}),a=U("img",{src:e.src,alt:e.alt||`图片 ${t+1}`,loading:"lazy",onerror:()=>{a.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});a.onload=()=>{a.naturalWidth>0&&(d.textContent=`${a.naturalWidth}×${a.naturalHeight}`,this.images[t].width=a.naturalWidth,this.images[t].height=a.naturalHeight)},r.appendChild(a);const s=U("div",{className:"id-checkbox",onClick:c=>{c.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>');r.addEventListener("click",()=>{this.toggle(t)});const l=U("div",{className:"id-image-info"}),u=this.getFileName(e.src),d=U("span",{className:"id-size"});return d.textContent=e.width&&e.height?`${e.width}×${e.height}`:"",l.appendChild(U("span",{className:"id-filename",title:e.src},this.truncate(u,20))),l.appendChild(d),n.appendChild(r),n.appendChild(s),n.appendChild(l),n}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);t&&(this.selected.has(e)?(this.selected.delete(e),t.classList.remove("selected")):(this.selected.add(e),t.classList.add("selected")),this.onSelectionChange(this.getSelectedImages()))}selectAll(){this.selected.clear(),this.images.forEach((e,t)=>{this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedImages())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}updateUI(){this.grid.querySelectorAll(".id-image-item").forEach(t=>{const n=parseInt(t.dataset.index,10);this.selected.has(n)?t.classList.add("selected"):t.classList.remove("selected")})}getSelectedImages(){return Array.from(this.selected).map(e=>this.images[e])}getFileName(e){const t=e.split("/"),n=t[t.length-1].split("?")[0];return decodeURIComponent(n)||"未命名"}truncate(e,t){return e.length<=t?e:e.substring(0,t-3)+"..."}}var Ee={trailer:59};function ae(i=256){let e=0,t=new Uint8Array(i);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(r){n(e+1),t[e]=r,e++},writeBytes(r,a=0,s=r.length){n(e+s);for(let l=0;l<s;l++)t[e++]=r[l+a]},writeBytesView(r,a=0,s=r.byteLength){n(e+s),t.set(r.subarray(a,a+s),e),e+=s}};function n(r){var a=t.length;if(a>=r)return;var s=1024*1024;r=Math.max(r,a*(a<s?2:1.125)>>>0),a!=0&&(r=Math.max(r,256));let l=t;t=new Uint8Array(r),e>0&&t.set(l.subarray(0,e),0)}}var H=12,Q=5003,Be=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function Ae(i,e,t,n,r=ae(512),a=new Uint8Array(256),s=new Int32Array(Q),l=new Int32Array(Q)){let u=s.length,d=Math.max(2,n);a.fill(0),l.fill(0),s.fill(-1);let c=0,o=0,f=d+1,m=f,g=!1,x=m,p=(1<<x)-1,v=1<<f-1,B=v+1,C=v+2,b=0,S=t[0],z=0;for(let w=u;w<65536;w*=2)++z;z=8-z,r.writeByte(d),h(v);let y=t.length;for(let w=1;w<y;w++)e:{let L=t[w],E=(L<<H)+S,I=L<<z^S;if(s[I]===E){S=l[I];break e}let $=I===0?1:u-I;for(;s[I]>=0;)if(I-=$,I<0&&(I+=u),s[I]===E){S=l[I];break e}h(S),S=L,C<1<<H?(l[I]=C++,s[I]=E):(s.fill(-1),C=v+2,g=!0,h(v))}return h(S),h(B),r.writeByte(0),r.bytesView();function h(w){for(c&=Be[o],o>0?c|=w<<o:c=w,o+=x;o>=8;)a[b++]=c&255,b>=254&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0),c>>=8,o-=8;if((C>p||g)&&(g?(x=m,p=(1<<x)-1,g=!1):(++x,p=x===H?1<<x:(1<<x)-1)),w==B){for(;o>0;)a[b++]=c&255,b>=254&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0),c>>=8,o-=8;b>0&&(r.writeByte(b),r.writeBytesView(a,0,b),b=0)}}}var Le=Ae;function oe(i,e,t){return i<<8&63488|e<<2&992|t>>3}function se(i,e,t,n){return i>>4|e&240|(t&240)<<4|(n&240)<<8}function ce(i,e,t){return i>>4<<8|e&240|t>>4}function N(i,e,t){return i<e?e:i>t?t:i}function q(i){return i*i}function X(i,e,t){var n=0,r=1e100;let a=i[e],s=a.cnt;a.ac;let l=a.rc,u=a.gc,d=a.bc;for(var c=a.fw;c!=0;c=i[c].fw){let f=i[c],m=f.cnt,g=s*m/(s+m);if(!(g>=r)){var o=0;o+=g*q(f.rc-l),!(o>=r)&&(o+=g*q(f.gc-u),!(o>=r)&&(o+=g*q(f.bc-d),!(o>=r)&&(r=o,n=c)))}}a.err=r,a.nn=n}function j(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function ze(i,e){let t=e==="rgb444"?4096:65536,n=new Array(t),r=i.length;if(e==="rgba4444")for(let a=0;a<r;++a){let s=i[a],l=s>>24&255,u=s>>16&255,d=s>>8&255,c=s&255,o=se(c,d,u,l),f=o in n?n[o]:n[o]=j();f.rc+=c,f.gc+=d,f.bc+=u,f.ac+=l,f.cnt++}else if(e==="rgb444")for(let a=0;a<r;++a){let s=i[a],l=s>>16&255,u=s>>8&255,d=s&255,c=ce(d,u,l),o=c in n?n[c]:n[c]=j();o.rc+=d,o.gc+=u,o.bc+=l,o.cnt++}else for(let a=0;a<r;++a){let s=i[a],l=s>>16&255,u=s>>8&255,d=s&255,c=oe(d,u,l),o=c in n?n[c]:n[c]=j();o.rc+=d,o.gc+=u,o.bc+=l,o.cnt++}return n}function Ue(i,e,t={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:a=0,clearAlphaThreshold:s=0,oneBitAlpha:l=!1}=t;if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let u=new Uint32Array(i.buffer),d=t.useSqrt!==!1,c=n==="rgba4444",o=ze(u,n),f=o.length,m=f-1,g=new Uint32Array(f+1);for(var x=0,p=0;p<f;++p){let A=o[p];if(A!=null){var v=1/A.cnt;c&&(A.ac*=v),A.rc*=v,A.gc*=v,A.bc*=v,o[x++]=A}}q(e)/x<.022&&(d=!1);for(var p=0;p<x-1;++p)o[p].fw=p+1,o[p+1].bk=p,d&&(o[p].cnt=Math.sqrt(o[p].cnt));d&&(o[p].cnt=Math.sqrt(o[p].cnt));var B,C,b;for(p=0;p<x;++p){X(o,p);var S=o[p].err;for(C=++g[0];C>1&&(b=C>>1,!(o[B=g[b]].err<=S));C=b)g[C]=B;g[C]=p}var z=x-e;for(p=0;p<z;){for(var y;;){var h=g[1];if(y=o[h],y.tm>=y.mtm&&o[y.nn].mtm<=y.tm)break;y.mtm==m?h=g[1]=g[g[0]--]:(X(o,h),y.tm=p);var S=o[h].err;for(C=1;(b=C+C)<=g[0]&&(b<g[0]&&o[g[b]].err>o[g[b+1]].err&&b++,!(S<=o[B=g[b]].err));C=b)g[C]=B;g[C]=h}var w=o[y.nn],L=y.cnt,E=w.cnt,v=1/(L+E);c&&(y.ac=v*(L*y.ac+E*w.ac)),y.rc=v*(L*y.rc+E*w.rc),y.gc=v*(L*y.gc+E*w.gc),y.bc=v*(L*y.bc+E*w.bc),y.cnt+=w.cnt,y.mtm=++p,o[w.bk].fw=w.fw,o[w.fw].bk=w.bk,w.mtm=m}let I=[];var $=0;for(p=0;;++$){let A=N(Math.round(o[p].rc),0,255),D=N(Math.round(o[p].gc),0,255),F=N(Math.round(o[p].bc),0,255),T=255;c&&(T=N(Math.round(o[p].ac),0,255),l&&(T=T<=(typeof l=="number"?l:127)?0:255),r&&T<=s&&(A=D=F=a,T=0));let G=c?[A,D,F,T]:[A,D,F];if(De(I,G)||I.push(G),(p=o[p].fw)==0)break}return I}function De(i,e){for(let t=0;t<i.length;t++){let n=i[t],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&a)return!0}return!1}function Pe(i,e,t="rgb565"){if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(i.buffer),r=n.length,a=t==="rgb444"?4096:65536,s=new Uint8Array(r),l=new Array(a);if(t==="rgba4444")for(let u=0;u<r;u++){let d=n[u],c=d>>24&255,o=d>>16&255,f=d>>8&255,m=d&255,g=se(m,f,o,c),x=g in l?l[g]:l[g]=$e(m,f,o,c,e);s[u]=x}else{let u=t==="rgb444"?ce:oe;for(let d=0;d<r;d++){let c=n[d],o=c>>16&255,f=c>>8&255,m=c&255,g=u(m,f,o),x=g in l?l[g]:l[g]=Me(m,f,o,e);s[d]=x}}return s}function $e(i,e,t,n,r){let a=0,s=1e100;for(let l=0;l<r.length;l++){let u=r[l],d=u[3],c=M(d-n);if(c>s)continue;let o=u[0];if(c+=M(o-i),c>s)continue;let f=u[1];if(c+=M(f-e),c>s)continue;let m=u[2];c+=M(m-t),!(c>s)&&(s=c,a=l)}return a}function Me(i,e,t,n){let r=0,a=1e100;for(let s=0;s<n.length;s++){let l=n[s],u=l[0],d=M(u-i);if(d>a)continue;let c=l[1];if(d+=M(c-e),d>a)continue;let o=l[2];d+=M(o-t),!(d>a)&&(a=d,r=s)}return r}function M(i){return i*i}function Te(i={}){let{initialCapacity:e=4096,auto:t=!0}=i,n=ae(e),r=5003,a=new Uint8Array(256),s=new Int32Array(r),l=new Int32Array(r),u=!1;return{reset(){n.reset(),u=!1},finish(){n.writeByte(Ee.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:d,writeFrame(c,o,f,m={}){let{transparent:g=!1,transparentIndex:x=0,delay:p=0,palette:v=null,repeat:B=0,colorDepth:C=8,dispose:b=-1}=m,S=!1;if(t?u||(S=!0,d(),u=!0):S=!!m.first,o=Math.max(0,Math.floor(o)),f=Math.max(0,Math.floor(f)),S){if(!v)throw new Error("First frame must include a { palette } option");Ne(n,o,f,v,C),J(n,v),B>=0&&qe(n,B)}let z=Math.round(p/10);We(n,b,z,g,x);let y=!!v&&!S;Re(n,o,f,y?v:null),y&&J(n,v),Fe(n,c,o,f,C,a,s,l)}};function d(){le(n,"GIF89a")}}function We(i,e,t,n,r){i.writeByte(33),i.writeByte(249),i.writeByte(4),r<0&&(r=0,n=!1);var a,s;n?(a=1,s=2):(a=0,s=0),e>=0&&(s=e&7),s<<=2,i.writeByte(0|s|0|a),P(i,t),i.writeByte(r||0),i.writeByte(0)}function Ne(i,e,t,n,r=8){let a=1,s=0,l=_(n.length)-1,u=a<<7|r-1<<4|s<<3|l;P(i,e),P(i,t),i.writeBytes([u,0,0])}function qe(i,e){i.writeByte(33),i.writeByte(255),i.writeByte(11),le(i,"NETSCAPE2.0"),i.writeByte(3),i.writeByte(1),P(i,e),i.writeByte(0)}function J(i,e){let t=1<<_(e.length);for(let n=0;n<t;n++){let r=[0,0,0];n<e.length&&(r=e[n]),i.writeByte(r[0]),i.writeByte(r[1]),i.writeByte(r[2])}}function Re(i,e,t,n){if(i.writeByte(44),P(i,0),P(i,0),P(i,e),P(i,t),n){let r=0,a=0,s=_(n.length)-1;i.writeByte(128|r|a|0|s)}else i.writeByte(0)}function Fe(i,e,t,n,r=8,a,s,l){Le(t,n,e,r,i,a,s,l)}function P(i,e){i.writeByte(e&255),i.writeByte(e>>8&255)}function le(i,e){for(var t=0;t<e.length;t++)i.writeByte(e.charCodeAt(t))}function _(i){return Math.max(Math.ceil(Math.log2(i)),1)}class He{constructor(e){this.prefix=e.prefix||"",this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0,this.successUrls=[]}download(e){if(this.isDownloading){k.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.successUrls=[],k.info("开始批量下载",{total:this.downloadQueue.length,prefix:this.prefix}),this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,k.info("批量下载完成",{success:this.successCount,failed:this.failedCount,successUrls:this.successUrls.length}),this.onComplete(this.successCount,this.failedCount,this.successUrls);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++,this.successUrls.push(e.src)}catch(r){k.error(`下载失败: ${e.src}`,r),this.failedCount++}this.processQueue()}async downloadFile(e,t){const n=e.startsWith("data:");try{const r=await fetch(e);if(!r.ok)throw new Error(`HTTP ${r.status}`);const a=await r.blob(),s=r.headers.get("content-type")||a.type||"",l=await this.prepareDownloadTarget(e,a,t,s),u=URL.createObjectURL(l.blob);this.triggerDownload(u,l.filename),setTimeout(()=>URL.revokeObjectURL(u),1e3)}catch{if(!n){k.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,t);return}this.downloadDataURL(e,t)}}async prepareDownloadTarget(e,t,n,r=""){if(!this.isWebpResource(e,r))return{blob:t,filename:n};if(await this.isAnimatedWebp(t)){const l=await this.convertAnimatedWebpToGif(t);return l?{blob:l,filename:this.replaceExtension(n,"gif")}:(k.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}const s=await this.convertStaticWebpToPng(t);return s?{blob:s,filename:this.replaceExtension(n,"png")}:(k.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),r=(t||"").toLowerCase();return r.includes("image/webp")||r.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let r=12;for(;r+8<=n.length;){const a=this.readFourCC(n,r),s=new DataView(t).getUint32(r+4,!0),l=r+8,u=l+s;if(u>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&s>=1&&n[l]&2)return!0;r=u+s%2}return!1}catch(t){return k.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,r=t.height||t.naturalHeight||0;if(!n||!r)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=r;const s=a.getContext("2d");return s?(s.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(u=>{a.toBlob(d=>u(d),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return k.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return k.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const r=t.tracks.selectedTrack,a=(r==null?void 0:r.frameCount)||0;if(a<=0)return null;const s=Te();let l=null,u=null;for(let d=0;d<a;d++){const o=(await t.decode({frameIndex:d})).image,f=o.displayWidth||o.codedWidth,m=o.displayHeight||o.codedHeight;if((!l||l.width!==f||l.height!==m)&&(l=document.createElement("canvas"),l.width=f,l.height=m,u=l.getContext("2d",{willReadFrequently:!0}),!u))return o.close(),null;u.clearRect(0,0,f,m),u.drawImage(o,0,0,f,m);const g=u.getImageData(0,0,f,m).data,x=Ue(g,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});x.unshift([0,0,0,0]);const p=Pe(g,x,"rgba4444"),v=Math.max(20,Math.round((o.duration||1e5)/1e3));s.writeFrame(p,f,m,{palette:x,delay:v,repeat:d===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),o.close()}return s.finish(),new Blob([s.bytesView()],{type:"image/gif"})}catch(n){return k.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const r=new Image,a=URL.createObjectURL(e);r.onload=()=>{URL.revokeObjectURL(a),t(r)},r.onerror=s=>{URL.revokeObjectURL(a),n(s)},r.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",r=(e||"download").split("?")[0],a=r.lastIndexOf(".");return a<=0?`${r}.${n}`:`${r.slice(0,a)}.${n}`}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}downloadDataURL(e,t){this.triggerDownload(e,t)}generateFilename(e,t){let n=this.getExtension(e);if(!n){const s=this.guessMimeType(e);n=this.mimeToExt(s)}const r=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${r}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[e]||"jpg"}}function je(){const i=document.getElementById("id-panel");if(i)return i;const e=U("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
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
      <div class="id-resize-handle"></div>
    </div>
  `,document.body.appendChild(e),Oe(e),Ve(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{O()}),e}function Oe(i){const e=i.querySelector(".id-panel-header");ie({target:i,handle:e,bodyCursor:"move",removeTransformOnStart:!0,shouldStart:t=>!t.target.closest(".id-panel-close")})}function Ve(i){const e=i.querySelector(".id-resize-handle");let t=!1,n,r,a,s;e.addEventListener("mousedown",l=>{l.preventDefault(),l.stopPropagation(),t=!0,n=l.clientX,r=l.clientY,a=i.offsetWidth,s=i.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize"}),document.addEventListener("mousemove",l=>{if(!t)return;const u=l.clientX-n,d=l.clientY-r,c=Math.max(300,a+u),o=Math.max(200,s+d);i.style.width=c+"px",i.style.height=o+"px"}),document.addEventListener("mouseup",()=>{t&&(t=!1,document.body.style.userSelect="",document.body.style.cursor="")})}de(ge);const _e="i";var ee,te;const Z=(te=(ee=R.imageDownloader)==null?void 0:ee.storageKeys)==null?void 0:te.downloadedUrls;(function(){if(window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let i=[],e=[];const t=new Set;let n=!0;function r(c){c&&(c.textContent=`历史下载数: ${t.size}`)}async function a(c){try{const o=await fe(Z,[]);Array.isArray(o)&&o.forEach(f=>{typeof f=="string"&&f&&t.add(f)}),r(c),k.info("已加载下载历史",{count:t.size})}catch(o){k.error("读取下载历史失败",o),r(c)}}async function s(){try{await ue(Z,Array.from(t)),k.debug("下载历史已保存",{count:t.size})}catch(c){k.error("保存下载历史失败",c)}}function l(c,o){document.addEventListener("keydown",f=>{const m=String(f.key||"").toLowerCase();if(f.ctrlKey&&f.shiftKey&&m===_e){if(f.preventDefault(),!n)return;n=!1;const g=document.getElementById("id-panel");(!g||g.style.display==="none"||g.style.display==="")&&re(),k.info("快捷键触发图片捕获"),i=new Y().getAllImages(),c.render(i),o&&(o.textContent=`已捕获 ${i.length} 张图片`),k.info("快捷键捕获完成",{count:i.length}),setTimeout(()=>{n=!0},500)}})}async function u(){k.info("imageDownloader 初始化开始",{logLevel:R.logLevel});const c=je(),o=Ce(),f=c.querySelector("#id-enhancer-status");if(o){const h=Ie(o);f.textContent=`✨ 当前网站已启用增强：${h}`,f.classList.add("active")}else f.textContent="",f.classList.remove("active");he({onToggle:pe}),O();const m=c.querySelector(".id-image-grid"),g=c.querySelector("#id-select-all"),x=c.querySelector("#id-select-none"),p=c.querySelector("#id-download"),v=c.querySelector("#id-capture"),B=c.querySelector("#id-prefix"),C=c.querySelector(".id-status"),b=c.querySelector("#id-downloaded-count");await a(b);const S=new ke({grid:m,onSelectionChange:h=>{e=h,z()}});l(S,C),v.addEventListener("click",()=>{k.info("开始手动捕获图片"),i=new Y().getAllImages(),S.render(i),C.textContent=`已捕获 ${i.length} 张图片`,k.info("手动捕获完成",{count:i.length})}),g.addEventListener("click",()=>{S.selectAll()}),x.addEventListener("click",()=>{S.selectNone()}),p.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const h=[...e],w=B.value||y();k.info("开始下载选中图片",{count:h.length,prefix:w}),new He({prefix:w,onProgress:(E,I)=>{C.textContent=`下载中: ${E}/${I}`},onComplete:async(E,I,$=[])=>{C.textContent=`完成: 成功 ${E}, 失败 ${I}`;let A=0;$.forEach(D=>{typeof D=="string"&&D&&!t.has(D)&&(t.add(D),A++)}),A>0&&(r(b),await s()),k.info("下载流程完成",{success:E,failed:I,newlyAdded:A,downloadedTotal:t.size})}}).download(h)});function z(){const h=e.length;p.disabled=h===0,p.textContent=h===0?"下载选中":`下载选中 (${h})`}function y(){const h=new Date,w=String(h.getMonth()+1).padStart(2,"0"),L=String(h.getDate()).padStart(2,"0"),E=String(h.getHours()).padStart(2,"0"),I=String(h.getMinutes()).padStart(2,"0");return`${w}${L}${E}${I}`}z(),k.info("imageDownloader 初始化完成",{downloadedCount:t.size})}function d(){u().catch(c=>{k.error("imageDownloader 初始化失败",c)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d()})();
