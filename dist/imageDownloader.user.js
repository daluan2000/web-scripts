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

function h(i,e={},n="",t=""){const o=document.createElement(i);for(const[a,c]of Object.entries(e))if(a==="className")o.className=c;else if(a==="dataset")for(const[r,g]of Object.entries(c))o.dataset[r]=g;else a.startsWith("on")?o.addEventListener(a.slice(2).toLowerCase(),c):o.setAttribute(a,c);return n?o.innerHTML=n:t&&(o.textContent=t),o}function P(i){const e=h("style",{type:"text/css"});return e.textContent=i,document.head.appendChild(e),e}const A=`/**
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
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 2147483647;
  transition: all 0.3s ease;
}

#id-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

#id-floating-btn.active {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
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
`;function D(i){const e=h("div",{id:"id-floating-btn",title:"图片批量下载器",onClick:()=>i.onToggle()},`
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);document.body.appendChild(e)}function E(){const i=document.getElementById("id-panel");i&&(i.style.display="flex",i.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function v(){const i=document.getElementById("id-panel");i&&(i.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function j(){const i=document.getElementById("id-panel");i&&(i.style.display==="none"||i.style.display===""?E():v())}const N={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(i){if(!this.urlPattern.test(i))return i;const e=i.match(/^(.+\.(?:jpg|jpeg|png))@(.+)\.(avif|awebp)$/i);if(e){const[,n,,t]=e;return`${n}@3840w.${t}`}return i}},B={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(i){return i}},q={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(i){return i}},T={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(i){return i.replace(/_\w+(\.\w+)$/i,"$1")}},S=[N,B,q,T];function M(i){for(const e of S)if(e.urlPattern.test(i))return e;return null}function U(i){const e=window.location.href;for(const n of S)if(n.pagePattern&&n.pagePattern.test(e))return n;return null}function H(i){const e=U();return e?e.name:null}function W(i){const e=S.find(n=>n.name===i);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||i}function F(i){const e=M(i);return e?e.enhance(i):i}class k{constructor(){this.imageExtensions=["jpg","jpeg","png","gif","webp","bmp","svg","ico","avif","awebp"]}getAllImages(){const e=[],n=new Set;document.querySelectorAll("img").forEach(d=>{this.processImageElement(d,"img",n,e)}),document.querySelectorAll("image").forEach(d=>{var l;const s=this.getImageSrc(((l=d.href)==null?void 0:l.baseVal)||d.getAttribute("href"));s&&!n.has(s)&&(n.add(s),e.push(this.createImageInfo(s,"svg-image",d)))});const a=document.querySelectorAll("*");return a.forEach(d=>{const l=window.getComputedStyle(d).backgroundImage;l&&l!=="none"&&this.extractUrls(l).forEach(m=>{const p=this.getImageSrc(m);p&&!n.has(p)&&(n.add(p),e.push(this.createImageInfo(p,"background",d)))})}),document.querySelectorAll("source").forEach(d=>{var l,f,m;const s=this.getImageSrc((m=(f=(l=d.srcset)==null?void 0:l.split(",")[0])==null?void 0:f.trim())==null?void 0:m.split(" ")[0]);s&&!n.has(s)&&(n.add(s),e.push(this.createImageInfo(s,"source",d)))}),a.forEach(d=>{this.processLazySrc(d,n,e)}),document.querySelectorAll("video, audio").forEach(d=>{const s=d.getAttribute("poster");if(s){const l=this.getImageSrc(s);l&&!n.has(l)&&(n.add(l),e.push(this.createImageInfo(l,"media-poster",d)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(d=>{const s=this.getImageSrc(d.href);s&&!n.has(s)&&(n.add(s),e.push(this.createImageInfo(s,"icon",d)))}),e.filter(d=>this.isValidImage(d.src))}processImageElement(e,n,t,o){var c,r,g;const a=this.getImageSrc(e.src)||this.getImageSrc((c=e.dataset)==null?void 0:c.src)||this.getImageSrc((r=e.dataset)==null?void 0:r.original)||this.getImageSrc((g=e.dataset)==null?void 0:g.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!t.has(a)&&(t.add(a),o.push(this.createImageInfo(a,n,e)))}processLazySrc(e,n,t){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var r,g,d;let c=((r=e.dataset)==null?void 0:r[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&c)try{const s=JSON.parse(c);c=s.src||s.url||s.original}catch{}if(c){(a.includes("srcset")||a==="data-srcset")&&(c=(d=(g=c.split(",")[0])==null?void 0:g.trim())==null?void 0:d.split(" ")[0]);const s=this.getImageSrc(c);s&&!n.has(s)&&(n.add(s),t.push(this.createImageInfo(s,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(o=>e.toLowerCase().includes(o))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let t=e.split("#")[0].trim();return t=F(t),t}extractUrls(e){const n=[],t=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let o;for(;(o=t.exec(e))!==null;)n.push(o[1]);return n}isValidImage(e){var o;if(!e)return!1;const n=(o=e.split(".").pop())==null?void 0:o.toLowerCase().split("?")[0];return n&&this.imageExtensions.includes(n)||e.includes("picsum.photos")||e.includes("unsplash.com")||e.includes("placeholder.com")||e.includes("via.placeholder")?!0:["cdn.","img.","image.","assets.","byteimg.com","bytedance.com","toutiao.com","douyin.com","toutiaoimg.com","feishu.cn",".jpg",".png",".webp",".gif",".svg",".bmp",".awebp",".avif"].some(a=>e.toLowerCase().includes(a))}createImageInfo(e,n,t){return{src:e,type:n,alt:(t==null?void 0:t.alt)||"",width:(t==null?void 0:t.naturalWidth)||(t==null?void 0:t.width)||0,height:(t==null?void 0:t.naturalHeight)||(t==null?void 0:t.height)||0,fileSize:null,element:t}}async getFileSize(e){try{const t=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return t?parseInt(t,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class R{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.selected=new Set,this.images=[]}render(e){if(this.images=e,this.selected.clear(),this.grid.innerHTML="",e.length===0){this.grid.innerHTML='<div class="id-empty">未找到图片</div>',this.onSelectionChange([]);return}e.forEach((n,t)=>{const o=this.createImageItem(n,t);this.grid.appendChild(o)})}createImageItem(e,n){const t=h("div",{className:"id-image-item",dataset:{index:n}}),o=h("div",{className:"id-image-thumb"}),a=h("img",{src:e.src,alt:e.alt||`图片 ${n+1}`,loading:"lazy",onerror:()=>{a.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});a.onload=()=>{a.naturalWidth>0&&(d.textContent=`${a.naturalWidth}×${a.naturalHeight}`,this.images[n].width=a.naturalWidth,this.images[n].height=a.naturalHeight)},o.appendChild(a);const c=h("div",{className:"id-checkbox",onClick:s=>{s.stopPropagation(),this.toggle(n)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>');o.addEventListener("click",()=>{this.toggle(n)});const r=h("div",{className:"id-image-info"}),g=this.getFileName(e.src),d=h("span",{className:"id-size"});return d.textContent=e.width&&e.height?`${e.width}×${e.height}`:"",r.appendChild(h("span",{className:"id-filename",title:e.src},this.truncate(g,20))),r.appendChild(d),t.appendChild(o),t.appendChild(c),t.appendChild(r),t}toggle(e){const n=this.grid.querySelector(`[data-index="${e}"]`);n&&(this.selected.has(e)?(this.selected.delete(e),n.classList.remove("selected")):(this.selected.add(e),n.classList.add("selected")),this.onSelectionChange(this.getSelectedImages()))}selectAll(){this.selected.clear(),this.images.forEach((e,n)=>{this.selected.add(n)}),this.updateUI(),this.onSelectionChange(this.getSelectedImages())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}updateUI(){this.grid.querySelectorAll(".id-image-item").forEach(n=>{const t=parseInt(n.dataset.index,10);this.selected.has(t)?n.classList.add("selected"):n.classList.remove("selected")})}getSelectedImages(){return Array.from(this.selected).map(e=>this.images[e])}getFileName(e){const n=e.split("/"),t=n[n.length-1].split("?")[0];return decodeURIComponent(t)||"未命名"}truncate(e,n){return e.length<=n?e:e.substring(0,n-3)+"..."}}class Q{constructor(e){this.prefix=e.prefix||"",this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0}download(e){if(this.isDownloading){console.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((n,t)=>({...n,index:t,filename:this.generateFilename(n.src,t)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,this.onComplete(this.successCount,this.failedCount);return}const e=this.downloadQueue.shift(),n=this.successCount+this.failedCount+1,t=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(n,t);try{await this.downloadFile(e.src,e.filename),this.successCount++}catch(o){console.error(`下载失败: ${e.src}`,o),this.failedCount++}this.processQueue()}async downloadFile(e,n){if(e.startsWith("data:")){this.downloadDataURL(e,n);return}try{const t=await fetch(e);if(!t.ok)throw new Error(`HTTP ${t.status}`);const o=await t.blob(),a=URL.createObjectURL(o);this.triggerDownload(a,n),setTimeout(()=>URL.revokeObjectURL(a),1e3)}catch{console.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,n)}}triggerDownload(e,n){const t=document.createElement("a");t.href=e,t.download=n,t.style.display="none",document.body.appendChild(t),t.click(),document.body.removeChild(t)}downloadDataURL(e,n){this.triggerDownload(e,n)}generateFilename(e,n){let t=this.getExtension(e);if(!t){const c=this.guessMimeType(e);t=this.mimeToExt(c)}const o=String(n+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${o}.${t}`}getExtension(e){const n=e.split(".");if(n.length>1){const t=n[n.length-1].toLowerCase().split("?")[0];if(t.length>=2&&t.length<=4)return t}return null}guessMimeType(e){const n=e.toLowerCase();return n.includes("png")?"image/png":n.includes("gif")?"image/gif":n.includes("webp")?"image/webp":n.includes("bmp")?"image/bmp":n.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[e]||"jpg"}}function Y(){const i=document.getElementById("id-panel");if(i)return i;const e=h("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
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
      <div class="id-resize-handle"></div>
    </div>
  `,document.body.appendChild(e),_(e),O(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{v()}),e}function _(i){const e=i.querySelector(".id-panel-header");let n=!1,t,o,a,c;e.addEventListener("mousedown",r=>{r.target.closest(".id-panel-close")||(n=!0,t=r.clientX,o=r.clientY,a=i.offsetLeft,c=i.offsetTop,document.body.style.userSelect="none",document.body.style.cursor="move")}),document.addEventListener("mousemove",r=>{if(!n)return;const g=r.clientX-t,d=r.clientY-o;let s=a+g,l=c+d;const f=i.getBoundingClientRect(),m=window.innerWidth-f.width,p=window.innerHeight-f.height;s=Math.max(0,Math.min(s,m)),l=Math.max(0,Math.min(l,p)),i.style.left=s+"px",i.style.top=l+"px"}),document.addEventListener("mouseup",()=>{n&&(n=!1,document.body.style.userSelect="",document.body.style.cursor="")})}function O(i){const e=i.querySelector(".id-resize-handle");let n=!1,t,o,a,c;e.addEventListener("mousedown",r=>{r.preventDefault(),r.stopPropagation(),n=!0,t=r.clientX,o=r.clientY,a=i.offsetWidth,c=i.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize"}),document.addEventListener("mousemove",r=>{if(!n)return;const g=r.clientX-t,d=r.clientY-o,s=Math.max(300,a+g),l=Math.max(200,c+d);i.style.width=s+"px",i.style.height=l+"px"}),document.addEventListener("mouseup",()=>{n&&(n=!1,document.body.style.userSelect="",document.body.style.cursor="")})}const X={logLevel:"info"},C={debug:0,info:1,warn:2,error:3};function y(i,e,...n){const t=C[X.logLevel];if(C[i]<t)return;const o=`[${i.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(i){case"debug":case"info":console.log(`${o} [${a}]`,e,...n);break;case"warn":console.warn(`${o} [${a}]`,e,...n);break;case"error":console.error(`${o} [${a}]`,e,...n);break}}const K={debug:(i,...e)=>y("debug",i,...e),info:(i,...e)=>y("info",i,...e),warn:(i,...e)=>y("warn",i,...e),error:(i,...e)=>y("error",i,...e)};P(A);(function(){if(window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let i=[],e=new Set,n=!0;function t(a,c){document.addEventListener("keydown",r=>{var g;if(r.ctrlKey&&r.shiftKey&&(r.key==="I"||r.key==="i")){if(r.preventDefault(),!n)return;n=!1,(g=document.querySelector(".id-panel"))!=null&&g.classList.contains("visible")||E(),i=new k().getAllImages(),c.render(i);const s=document.querySelector(".id-status");s&&(s.textContent=`已捕获 ${i.length} 张图片`),setTimeout(()=>{n=!0},500)}})}function o(){const a=Y(),c=H(),r=a.querySelector("#id-enhancer-status");if(c){const u=W(c);r.textContent=`✨ 当前网站已启用增强：${u}`,r.classList.add("active")}else r.textContent="",r.classList.remove("active");D({onToggle:j}),v(),a.querySelector(".id-toolbar");const g=a.querySelector(".id-image-grid"),d=a.querySelector("#id-select-all"),s=a.querySelector("#id-select-none"),l=a.querySelector("#id-download"),f=a.querySelector("#id-capture"),m=a.querySelector("#id-prefix"),p=a.querySelector(".id-status"),w=new R({grid:g,onSelectionChange:u=>{e=u,L()}});t(f,w),f.addEventListener("click",()=>{i=new k().getAllImages(),w.render(i),p.textContent=`已捕获 ${i.length} 张图片`}),d.addEventListener("click",()=>{w.selectAll()}),s.addEventListener("click",()=>{w.selectNone()}),l.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const u=m.value||z();new Q({prefix:u,onProgress:(b,x)=>{p.textContent=`下载中: ${b}/${x}`},onComplete:(b,x)=>{p.textContent=`完成: 成功 ${b}, 失败 ${x}`}}).download(e)});function L(){const u=e.length;l.disabled=u===0,l.textContent=u===0?"下载选中":`下载选中 (${u})`}function z(){const u=new Date,I=String(u.getMonth()+1).padStart(2,"0"),b=String(u.getDate()).padStart(2,"0"),x=String(u.getHours()).padStart(2,"0"),$=String(u.getMinutes()).padStart(2,"0");return`${I}${b}${x}${$}`}K.info("imageDownloader initialized")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o()})();
