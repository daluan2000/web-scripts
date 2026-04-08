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

function A(i,e={},t="",n=""){const r=document.createElement(i);for(const[a,o]of Object.entries(e))if(a==="className")r.className=o;else if(a==="dataset")for(const[c,u]of Object.entries(o))r.dataset[c]=u;else a.startsWith("on")?r.addEventListener(a.slice(2).toLowerCase(),o):r.setAttribute(a,o);return t?r.innerHTML=t:n&&(r.textContent=n),r}function ie(i){const e=A("style",{type:"text/css"});return e.textContent=i,document.head.appendChild(e),e}const re=`/**
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
`;function ae(i){const e=A("div",{id:"id-floating-btn",title:"图片批量下载器",onClick:()=>i.onToggle()},`
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);document.body.appendChild(e)}function K(){const i=document.getElementById("id-panel");i&&(i.style.display="flex",i.style.opacity="1");const e=document.getElementById("id-floating-btn");e&&e.classList.add("active")}function R(){const i=document.getElementById("id-panel");i&&(i.style.display="none");const e=document.getElementById("id-floating-btn");e&&e.classList.remove("active")}function oe(){const i=document.getElementById("id-panel");i&&(i.style.display==="none"||i.style.display===""?K():R())}const se={name:"bilibili",displayName:"B站（哔哩哔哩）",priority:10,urlPattern:/hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,pagePattern:/bilibili\.com|b23\.tv/i,enhance(i){if(!this.urlPattern.test(i))return i;const e=i.match(/^(.+\.(?:jpg|jpeg|png))@(.+)\.(avif|awebp)$/i);if(e){const[,t,,n]=e;return`${t}@3840w.${n}`}return i}},ce={name:"bytedance",displayName:"抖音（字节跳动）",priority:10,urlPattern:/douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,pagePattern:/douyin\.com|douyin(?:pic|img)\.com/i,enhance(i){return i}},le={name:"xiaohongshu",displayName:"小红书",priority:10,urlPattern:/xhscdn\.com/i,pagePattern:/xiaohongshu\.com|xh(?:s|s)cdn\.com/i,enhance(i){return i}},de={name:"zhihu",displayName:"知乎",priority:10,urlPattern:/zhimg\.com/i,pagePattern:/zhihu\.com/i,enhance(i){return i.replace(/_\w+(\.\w+)$/i,"$1")}},H=[se,ce,le,de];function ue(i){for(const e of H)if(e.urlPattern.test(i))return e;return null}function ge(i){const e=window.location.href;for(const t of H)if(t.pagePattern&&t.pagePattern.test(e))return t;return null}function he(i){const e=ge();return e?e.name:null}function fe(i){const e=H.find(t=>t.name===i);return(e==null?void 0:e.displayName)||(e==null?void 0:e.name)||i}function pe(i){const e=ue(i);return e?e.enhance(i):i}class O{constructor(){this.imageExtensions=["jpg","jpeg","png","gif","webp","bmp","svg","ico","avif","awebp"]}getAllImages(){const e=[],t=new Set;document.querySelectorAll("img").forEach(d=>{this.processImageElement(d,"img",t,e)}),document.querySelectorAll("image").forEach(d=>{var s;const l=this.getImageSrc(((s=d.href)==null?void 0:s.baseVal)||d.getAttribute("href"));l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"svg-image",d)))});const a=document.querySelectorAll("*");return a.forEach(d=>{const s=window.getComputedStyle(d).backgroundImage;s&&s!=="none"&&this.extractUrls(s).forEach(p=>{const g=this.getImageSrc(p);g&&!t.has(g)&&(t.add(g),e.push(this.createImageInfo(g,"background",d)))})}),document.querySelectorAll("source").forEach(d=>{var s,h,p;const l=this.getImageSrc((p=(h=(s=d.srcset)==null?void 0:s.split(",")[0])==null?void 0:h.trim())==null?void 0:p.split(" ")[0]);l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"source",d)))}),a.forEach(d=>{this.processLazySrc(d,t,e)}),document.querySelectorAll("video, audio").forEach(d=>{const l=d.getAttribute("poster");if(l){const s=this.getImageSrc(l);s&&!t.has(s)&&(t.add(s),e.push(this.createImageInfo(s,"media-poster",d)))}}),document.querySelectorAll('link[rel*="icon"], link[rel*="image"]').forEach(d=>{const l=this.getImageSrc(d.href);l&&!t.has(l)&&(t.add(l),e.push(this.createImageInfo(l,"icon",d)))}),e.filter(d=>this.isValidImage(d.src))}processImageElement(e,t,n,r){var o,c,u;const a=this.getImageSrc(e.src)||this.getImageSrc((o=e.dataset)==null?void 0:o.src)||this.getImageSrc((c=e.dataset)==null?void 0:c.original)||this.getImageSrc((u=e.dataset)==null?void 0:u.lazy)||this.getImageSrc(e.getAttribute("data-src"))||this.getImageSrc(e.getAttribute("data-original"));a&&!n.has(a)&&(n.add(a),r.push(this.createImageInfo(a,t,e)))}processLazySrc(e,t,n){["data-src","data-original","data-lazy","data-srcset","data:image","data-ks-lazyload","data-url","data-ks-observersrc"].forEach(a=>{var c,u,d;let o=((c=e.dataset)==null?void 0:c[a.replace("data-","")])||e.getAttribute(a);if(a==="data-image"&&o)try{const l=JSON.parse(o);o=l.src||l.url||l.original}catch{}if(o){(a.includes("srcset")||a==="data-srcset")&&(o=(d=(u=o.split(",")[0])==null?void 0:u.trim())==null?void 0:d.split(" ")[0]);const l=this.getImageSrc(o);l&&!t.has(l)&&(t.add(l),n.push(this.createImageInfo(l,"lazy",e)))}})}getImageSrc(e){if(!e||typeof e!="string"||e.startsWith("data:")&&!e.startsWith("data:image/svg")||e.includes(";base64,")||!e.trim()||["placeholder","default","blank","transparent","data:image/gif","loading","lazy"].some(r=>e.toLowerCase().includes(r))&&!e.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i))return null;let n=e.split("#")[0].trim();return n=pe(n),n}extractUrls(e){const t=[],n=/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;let r;for(;(r=n.exec(e))!==null;)t.push(r[1]);return t}isValidImage(e){var r;if(!e)return!1;const t=(r=e.split(".").pop())==null?void 0:r.toLowerCase().split("?")[0];return t&&this.imageExtensions.includes(t)||e.includes("picsum.photos")||e.includes("unsplash.com")||e.includes("placeholder.com")||e.includes("via.placeholder")?!0:["cdn.","img.","image.","assets.","byteimg.com","bytedance.com","toutiao.com","douyin.com","toutiaoimg.com","feishu.cn",".jpg",".png",".webp",".gif",".svg",".bmp",".awebp",".avif"].some(a=>e.toLowerCase().includes(a))}createImageInfo(e,t,n){return{src:e,type:t,alt:(n==null?void 0:n.alt)||"",width:(n==null?void 0:n.naturalWidth)||(n==null?void 0:n.width)||0,height:(n==null?void 0:n.naturalHeight)||(n==null?void 0:n.height)||0,fileSize:null,element:n}}async getFileSize(e){try{const n=(await fetch(e,{method:"HEAD"})).headers.get("content-length");return n?parseInt(n,10):null}catch{return null}}formatFileSize(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}}class me{constructor(e){this.grid=e.grid,this.onSelectionChange=e.onSelectionChange||(()=>{}),this.selected=new Set,this.images=[]}render(e){if(this.images=e,this.selected.clear(),this.grid.innerHTML="",e.length===0){this.grid.innerHTML='<div class="id-empty">未找到图片</div>',this.onSelectionChange([]);return}e.forEach((t,n)=>{const r=this.createImageItem(t,n);this.grid.appendChild(r)})}createImageItem(e,t){const n=A("div",{className:"id-image-item",dataset:{index:t}}),r=A("div",{className:"id-image-thumb"}),a=A("img",{src:e.src,alt:e.alt||`图片 ${t+1}`,loading:"lazy",onerror:()=>{a.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>'}});a.onload=()=>{a.naturalWidth>0&&(d.textContent=`${a.naturalWidth}×${a.naturalHeight}`,this.images[t].width=a.naturalWidth,this.images[t].height=a.naturalHeight)},r.appendChild(a);const o=A("div",{className:"id-checkbox",onClick:l=>{l.stopPropagation(),this.toggle(t)}},'<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>');r.addEventListener("click",()=>{this.toggle(t)});const c=A("div",{className:"id-image-info"}),u=this.getFileName(e.src),d=A("span",{className:"id-size"});return d.textContent=e.width&&e.height?`${e.width}×${e.height}`:"",c.appendChild(A("span",{className:"id-filename",title:e.src},this.truncate(u,20))),c.appendChild(d),n.appendChild(r),n.appendChild(o),n.appendChild(c),n}toggle(e){const t=this.grid.querySelector(`[data-index="${e}"]`);t&&(this.selected.has(e)?(this.selected.delete(e),t.classList.remove("selected")):(this.selected.add(e),t.classList.add("selected")),this.onSelectionChange(this.getSelectedImages()))}selectAll(){this.selected.clear(),this.images.forEach((e,t)=>{this.selected.add(t)}),this.updateUI(),this.onSelectionChange(this.getSelectedImages())}selectNone(){this.selected.clear(),this.updateUI(),this.onSelectionChange([])}updateUI(){this.grid.querySelectorAll(".id-image-item").forEach(t=>{const n=parseInt(t.dataset.index,10);this.selected.has(n)?t.classList.add("selected"):t.classList.remove("selected")})}getSelectedImages(){return Array.from(this.selected).map(e=>this.images[e])}getFileName(e){const t=e.split("/"),n=t[t.length-1].split("?")[0];return decodeURIComponent(n)||"未命名"}truncate(e,t){return e.length<=t?e:e.substring(0,t-3)+"..."}}var be={trailer:59};function J(i=256){let e=0,t=new Uint8Array(i);return{get buffer(){return t.buffer},reset(){e=0},bytesView(){return t.subarray(0,e)},bytes(){return t.slice(0,e)},writeByte(r){n(e+1),t[e]=r,e++},writeBytes(r,a=0,o=r.length){n(e+o);for(let c=0;c<o;c++)t[e++]=r[c+a]},writeBytesView(r,a=0,o=r.byteLength){n(e+o),t.set(r.subarray(a,a+o),e),e+=o}};function n(r){var a=t.length;if(a>=r)return;var o=1024*1024;r=Math.max(r,a*(a<o?2:1.125)>>>0),a!=0&&(r=Math.max(r,256));let c=t;t=new Uint8Array(r),e>0&&t.set(c.subarray(0,e),0)}}var j=12,Q=5003,we=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function ye(i,e,t,n,r=J(512),a=new Uint8Array(256),o=new Int32Array(Q),c=new Int32Array(Q)){let u=o.length,d=Math.max(2,n);a.fill(0),c.fill(0),o.fill(-1);let l=0,s=0,h=d+1,p=h,g=!1,b=p,f=(1<<b)-1,w=1<<h-1,y=w+1,v=w+2,m=0,I=t[0],E=0;for(let k=u;k<65536;k*=2)++E;E=8-E,r.writeByte(d),S(w);let x=t.length;for(let k=1;k<x;k++)e:{let L=t[k],z=(L<<j)+I,C=L<<E^I;if(o[C]===z){I=c[C];break e}let W=C===0?1:u-C;for(;o[C]>=0;)if(C-=W,C<0&&(C+=u),o[C]===z){I=c[C];break e}S(I),I=L,v<1<<j?(c[C]=v++,o[C]=z):(o.fill(-1),v=w+2,g=!0,S(w))}return S(I),S(y),r.writeByte(0),r.bytesView();function S(k){for(l&=we[s],s>0?l|=k<<s:l=k,s+=b;s>=8;)a[m++]=l&255,m>=254&&(r.writeByte(m),r.writeBytesView(a,0,m),m=0),l>>=8,s-=8;if((v>f||g)&&(g?(b=p,f=(1<<b)-1,g=!1):(++b,f=b===j?1<<b:(1<<b)-1)),k==y){for(;s>0;)a[m++]=l&255,m>=254&&(r.writeByte(m),r.writeBytesView(a,0,m),m=0),l>>=8,s-=8;m>0&&(r.writeByte(m),r.writeBytesView(a,0,m),m=0)}}}var xe=ye;function Z(i,e,t){return i<<8&63488|e<<2&992|t>>3}function ee(i,e,t,n){return i>>4|e&240|(t&240)<<4|(n&240)<<8}function te(i,e,t){return i>>4<<8|e&240|t>>4}function $(i,e,t){return i<e?e:i>t?t:i}function T(i){return i*i}function _(i,e,t){var n=0,r=1e100;let a=i[e],o=a.cnt;a.ac;let c=a.rc,u=a.gc,d=a.bc;for(var l=a.fw;l!=0;l=i[l].fw){let h=i[l],p=h.cnt,g=o*p/(o+p);if(!(g>=r)){var s=0;s+=g*T(h.rc-c),!(s>=r)&&(s+=g*T(h.gc-u),!(s>=r)&&(s+=g*T(h.bc-d),!(s>=r)&&(r=s,n=l)))}}a.err=r,a.nn=n}function F(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function ve(i,e){let t=e==="rgb444"?4096:65536,n=new Array(t),r=i.length;if(e==="rgba4444")for(let a=0;a<r;++a){let o=i[a],c=o>>24&255,u=o>>16&255,d=o>>8&255,l=o&255,s=ee(l,d,u,c),h=s in n?n[s]:n[s]=F();h.rc+=l,h.gc+=d,h.bc+=u,h.ac+=c,h.cnt++}else if(e==="rgb444")for(let a=0;a<r;++a){let o=i[a],c=o>>16&255,u=o>>8&255,d=o&255,l=te(d,u,c),s=l in n?n[l]:n[l]=F();s.rc+=d,s.gc+=u,s.bc+=c,s.cnt++}else for(let a=0;a<r;++a){let o=i[a],c=o>>16&255,u=o>>8&255,d=o&255,l=Z(d,u,c),s=l in n?n[l]:n[l]=F();s.rc+=d,s.gc+=u,s.bc+=c,s.cnt++}return n}function Ie(i,e,t={}){let{format:n="rgb565",clearAlpha:r=!0,clearAlphaColor:a=0,clearAlphaThreshold:o=0,oneBitAlpha:c=!1}=t;if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let u=new Uint32Array(i.buffer),d=t.useSqrt!==!1,l=n==="rgba4444",s=ve(u,n),h=s.length,p=h-1,g=new Uint32Array(h+1);for(var b=0,f=0;f<h;++f){let B=s[f];if(B!=null){var w=1/B.cnt;l&&(B.ac*=w),B.rc*=w,B.gc*=w,B.bc*=w,s[b++]=B}}T(e)/b<.022&&(d=!1);for(var f=0;f<b-1;++f)s[f].fw=f+1,s[f+1].bk=f,d&&(s[f].cnt=Math.sqrt(s[f].cnt));d&&(s[f].cnt=Math.sqrt(s[f].cnt));var y,v,m;for(f=0;f<b;++f){_(s,f);var I=s[f].err;for(v=++g[0];v>1&&(m=v>>1,!(s[y=g[m]].err<=I));v=m)g[v]=y;g[v]=f}var E=b-e;for(f=0;f<E;){for(var x;;){var S=g[1];if(x=s[S],x.tm>=x.mtm&&s[x.nn].mtm<=x.tm)break;x.mtm==p?S=g[1]=g[g[0]--]:(_(s,S),x.tm=f);var I=s[S].err;for(v=1;(m=v+v)<=g[0]&&(m<g[0]&&s[g[m]].err>s[g[m+1]].err&&m++,!(I<=s[y=g[m]].err));v=m)g[v]=y;g[v]=S}var k=s[x.nn],L=x.cnt,z=k.cnt,w=1/(L+z);l&&(x.ac=w*(L*x.ac+z*k.ac)),x.rc=w*(L*x.rc+z*k.rc),x.gc=w*(L*x.gc+z*k.gc),x.bc=w*(L*x.bc+z*k.bc),x.cnt+=k.cnt,x.mtm=++f,s[k.bk].fw=k.fw,s[k.fw].bk=k.bk,k.mtm=p}let C=[];var W=0;for(f=0;;++W){let B=$(Math.round(s[f].rc),0,255),q=$(Math.round(s[f].gc),0,255),N=$(Math.round(s[f].bc),0,255),M=255;l&&(M=$(Math.round(s[f].ac),0,255),c&&(M=M<=(typeof c=="number"?c:127)?0:255),r&&M<=o&&(B=q=N=a,M=0));let G=l?[B,q,N,M]:[B,q,N];if(ke(C,G)||C.push(G),(f=s[f].fw)==0)break}return C}function ke(i,e){for(let t=0;t<i.length;t++){let n=i[t],r=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],a=n.length>=4&&e.length>=4?n[3]===e[3]:!0;if(r&&a)return!0}return!1}function Ce(i,e,t="rgb565"){if(!i||!i.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(i instanceof Uint8Array)&&!(i instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(i.buffer),r=n.length,a=t==="rgb444"?4096:65536,o=new Uint8Array(r),c=new Array(a);if(t==="rgba4444")for(let u=0;u<r;u++){let d=n[u],l=d>>24&255,s=d>>16&255,h=d>>8&255,p=d&255,g=ee(p,h,s,l),b=g in c?c[g]:c[g]=Se(p,h,s,l,e);o[u]=b}else{let u=t==="rgb444"?te:Z;for(let d=0;d<r;d++){let l=n[d],s=l>>16&255,h=l>>8&255,p=l&255,g=u(p,h,s),b=g in c?c[g]:c[g]=Be(p,h,s,e);o[d]=b}}return o}function Se(i,e,t,n,r){let a=0,o=1e100;for(let c=0;c<r.length;c++){let u=r[c],d=u[3],l=U(d-n);if(l>o)continue;let s=u[0];if(l+=U(s-i),l>o)continue;let h=u[1];if(l+=U(h-e),l>o)continue;let p=u[2];l+=U(p-t),!(l>o)&&(o=l,a=c)}return a}function Be(i,e,t,n){let r=0,a=1e100;for(let o=0;o<n.length;o++){let c=n[o],u=c[0],d=U(u-i);if(d>a)continue;let l=c[1];if(d+=U(l-e),d>a)continue;let s=c[2];d+=U(s-t),!(d>a)&&(a=d,r=o)}return r}function U(i){return i*i}function Ee(i={}){let{initialCapacity:e=4096,auto:t=!0}=i,n=J(e),r=5003,a=new Uint8Array(256),o=new Int32Array(r),c=new Int32Array(r),u=!1;return{reset(){n.reset(),u=!1},finish(){n.writeByte(be.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:d,writeFrame(l,s,h,p={}){let{transparent:g=!1,transparentIndex:b=0,delay:f=0,palette:w=null,repeat:y=0,colorDepth:v=8,dispose:m=-1}=p,I=!1;if(t?u||(I=!0,d(),u=!0):I=!!p.first,s=Math.max(0,Math.floor(s)),h=Math.max(0,Math.floor(h)),I){if(!w)throw new Error("First frame must include a { palette } option");Le(n,s,h,w,v),X(n,w),y>=0&&ze(n,y)}let E=Math.round(f/10);Ae(n,m,E,g,b);let x=!!w&&!I;Pe(n,s,h,x?w:null),x&&X(n,w),Ue(n,l,s,h,v,a,o,c)}};function d(){ne(n,"GIF89a")}}function Ae(i,e,t,n,r){i.writeByte(33),i.writeByte(249),i.writeByte(4),r<0&&(r=0,n=!1);var a,o;n?(a=1,o=2):(a=0,o=0),e>=0&&(o=e&7),o<<=2,i.writeByte(0|o|0|a),P(i,t),i.writeByte(r||0),i.writeByte(0)}function Le(i,e,t,n,r=8){let a=1,o=0,c=V(n.length)-1,u=a<<7|r-1<<4|o<<3|c;P(i,e),P(i,t),i.writeBytes([u,0,0])}function ze(i,e){i.writeByte(33),i.writeByte(255),i.writeByte(11),ne(i,"NETSCAPE2.0"),i.writeByte(3),i.writeByte(1),P(i,e),i.writeByte(0)}function X(i,e){let t=1<<V(e.length);for(let n=0;n<t;n++){let r=[0,0,0];n<e.length&&(r=e[n]),i.writeByte(r[0]),i.writeByte(r[1]),i.writeByte(r[2])}}function Pe(i,e,t,n){if(i.writeByte(44),P(i,0),P(i,0),P(i,e),P(i,t),n){let r=0,a=0,o=V(n.length)-1;i.writeByte(128|r|a|0|o)}else i.writeByte(0)}function Ue(i,e,t,n,r=8,a,o,c){xe(t,n,e,r,i,a,o,c)}function P(i,e){i.writeByte(e&255),i.writeByte(e>>8&255)}function ne(i,e){for(var t=0;t<e.length;t++)i.writeByte(e.charCodeAt(t))}function V(i){return Math.max(Math.ceil(Math.log2(i)),1)}class Me{constructor(e){this.prefix=e.prefix||"",this.onProgress=e.onProgress||(()=>{}),this.onComplete=e.onComplete||(()=>{}),this.downloadQueue=[],this.isDownloading=!1,this.successCount=0,this.failedCount=0}download(e){if(this.isDownloading){console.warn("下载进行中，请稍候");return}this.downloadQueue=e.map((t,n)=>({...t,index:n,filename:this.generateFilename(t.src,n)})),this.isDownloading=!0,this.successCount=0,this.failedCount=0,this.processQueue()}async processQueue(){if(this.downloadQueue.length===0){this.isDownloading=!1,this.onComplete(this.successCount,this.failedCount);return}const e=this.downloadQueue.shift(),t=this.successCount+this.failedCount+1,n=this.successCount+this.failedCount+this.downloadQueue.length;this.onProgress(t,n);try{await this.downloadFile(e.src,e.filename),this.successCount++}catch(r){console.error(`下载失败: ${e.src}`,r),this.failedCount++}this.processQueue()}async downloadFile(e,t){const n=e.startsWith("data:");try{const r=await fetch(e);if(!r.ok)throw new Error(`HTTP ${r.status}`);const a=await r.blob(),o=r.headers.get("content-type")||a.type||"",c=await this.prepareDownloadTarget(e,a,t,o),u=URL.createObjectURL(c.blob);this.triggerDownload(u,c.filename),setTimeout(()=>URL.revokeObjectURL(u),1e3)}catch{if(!n){console.warn(`fetch 下载失败，尝试直接下载: ${e}`),this.triggerDownload(e,t);return}this.downloadDataURL(e,t)}}async prepareDownloadTarget(e,t,n,r=""){if(!this.isWebpResource(e,r))return{blob:t,filename:n};if(await this.isAnimatedWebp(t)){const c=await this.convertAnimatedWebpToGif(t);return c?{blob:c,filename:this.replaceExtension(n,"gif")}:(console.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}const o=await this.convertStaticWebpToPng(t);return o?{blob:o,filename:this.replaceExtension(n,"png")}:(console.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载"),{blob:t,filename:this.replaceExtension(n,"webp")})}isWebpResource(e,t=""){const n=(e||"").toLowerCase(),r=(t||"").toLowerCase();return r.includes("image/webp")||r.includes("image/x-webp")||n.startsWith("data:image/webp")?!0:/\.(?:webp|awebp)(?:$|[?#])/i.test(n)}async isAnimatedWebp(e){try{const t=await e.arrayBuffer(),n=new Uint8Array(t);if(n.length<16||this.readFourCC(n,0)!=="RIFF"||this.readFourCC(n,8)!=="WEBP")return!1;let r=12;for(;r+8<=n.length;){const a=this.readFourCC(n,r),o=new DataView(t).getUint32(r+4,!0),c=r+8,u=c+o;if(u>n.length)break;if(a==="ANIM"||a==="ANMF"||a==="VP8X"&&o>=1&&n[c]&2)return!0;r=u+o%2}return!1}catch(t){return console.warn("WebP 动静态检测失败:",t),!1}}async convertStaticWebpToPng(e){try{const t=await this.decodeImageBitmap(e);if(!t)return null;const n=t.width||t.naturalWidth||0,r=t.height||t.naturalHeight||0;if(!n||!r)return typeof t.close=="function"&&t.close(),null;const a=document.createElement("canvas");a.width=n,a.height=r;const o=a.getContext("2d");return o?(o.drawImage(t,0,0),typeof t.close=="function"&&t.close(),await new Promise(u=>{a.toBlob(d=>u(d),"image/png")})||null):(typeof t.close=="function"&&t.close(),null)}catch(t){return console.warn("静态 WebP 转 PNG 失败:",t),null}}async convertAnimatedWebpToGif(e){if(typeof ImageDecoder>"u")return console.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF"),null;let t;try{const n=new Uint8Array(await e.arrayBuffer());t=new ImageDecoder({data:n,type:"image/webp"}),await t.tracks.ready;const r=t.tracks.selectedTrack,a=(r==null?void 0:r.frameCount)||0;if(a<=0)return null;const o=Ee();let c=null,u=null;for(let d=0;d<a;d++){const s=(await t.decode({frameIndex:d})).image,h=s.displayWidth||s.codedWidth,p=s.displayHeight||s.codedHeight;if((!c||c.width!==h||c.height!==p)&&(c=document.createElement("canvas"),c.width=h,c.height=p,u=c.getContext("2d",{willReadFrequently:!0}),!u))return s.close(),null;u.clearRect(0,0,h,p),u.drawImage(s,0,0,h,p);const g=u.getImageData(0,0,h,p).data,b=Ie(g,255,{format:"rgba4444",oneBitAlpha:!0,clearAlpha:!0,clearAlphaColor:0,clearAlphaThreshold:0});b.unshift([0,0,0,0]);const f=Ce(g,b,"rgba4444"),w=Math.max(20,Math.round((s.duration||1e5)/1e3));o.writeFrame(f,h,p,{palette:b,delay:w,repeat:d===0?0:-1,transparent:!0,transparentIndex:0,dispose:2}),s.close()}return o.finish(),new Blob([o.bytesView()],{type:"image/gif"})}catch(n){return console.warn("动态 WebP 转 GIF 失败:",n),null}finally{t&&typeof t.close=="function"&&t.close()}}async decodeImageBitmap(e){return typeof createImageBitmap=="function"?createImageBitmap(e):new Promise((t,n)=>{const r=new Image,a=URL.createObjectURL(e);r.onload=()=>{URL.revokeObjectURL(a),t(r)},r.onerror=o=>{URL.revokeObjectURL(a),n(o)},r.src=a})}readFourCC(e,t){return t+4>e.length?"":String.fromCharCode(e[t],e[t+1],e[t+2],e[t+3])}replaceExtension(e,t){const n=String(t||"").replace(/^\./,"").toLowerCase()||"jpg",r=(e||"download").split("?")[0],a=r.lastIndexOf(".");return a<=0?`${r}.${n}`:`${r.slice(0,a)}.${n}`}triggerDownload(e,t){const n=document.createElement("a");n.href=e,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n)}downloadDataURL(e,t){this.triggerDownload(e,t)}generateFilename(e,t){let n=this.getExtension(e);if(!n){const o=this.guessMimeType(e);n=this.mimeToExt(o)}const r=String(t+1).padStart(3,"0");return`${this.prefix?`${this.prefix}_`:""}${r}.${n}`}getExtension(e){const t=e.split(".");if(t.length>1){const n=t[t.length-1].toLowerCase().split("?")[0];if(n.length>=2&&n.length<=4)return n}return null}guessMimeType(e){const t=e.toLowerCase();return t.includes("png")?"image/png":t.includes("gif")?"image/gif":t.includes("webp")?"image/webp":t.includes("bmp")?"image/bmp":t.includes("svg")?"image/svg+xml":"image/jpeg"}mimeToExt(e){return{"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/gif":"gif","image/webp":"webp","image/bmp":"bmp","image/svg+xml":"svg","image/avif":"avif"}[e]||"jpg"}}function $e(){const i=document.getElementById("id-panel");if(i)return i;const e=A("div",{id:"id-panel",className:"id-panel"});return e.innerHTML=`
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
  `,document.body.appendChild(e),De(e),Te(e),e.querySelector("#id-close-btn").addEventListener("click",()=>{R()}),e}function De(i){const e=i.querySelector(".id-panel-header");let t=!1,n,r,a,o;e.addEventListener("mousedown",c=>{c.target.closest(".id-panel-close")||(t=!0,n=c.clientX,r=c.clientY,a=i.offsetLeft,o=i.offsetTop,document.body.style.userSelect="none",document.body.style.cursor="move")}),document.addEventListener("mousemove",c=>{if(!t)return;const u=c.clientX-n,d=c.clientY-r;let l=a+u,s=o+d;const h=i.getBoundingClientRect(),p=window.innerWidth-h.width,g=window.innerHeight-h.height;l=Math.max(0,Math.min(l,p)),s=Math.max(0,Math.min(s,g)),i.style.left=l+"px",i.style.top=s+"px"}),document.addEventListener("mouseup",()=>{t&&(t=!1,document.body.style.userSelect="",document.body.style.cursor="")})}function Te(i){const e=i.querySelector(".id-resize-handle");let t=!1,n,r,a,o;e.addEventListener("mousedown",c=>{c.preventDefault(),c.stopPropagation(),t=!0,n=c.clientX,r=c.clientY,a=i.offsetWidth,o=i.offsetHeight,document.body.style.userSelect="none",document.body.style.cursor="se-resize"}),document.addEventListener("mousemove",c=>{if(!t)return;const u=c.clientX-n,d=c.clientY-r,l=Math.max(300,a+u),s=Math.max(200,o+d);i.style.width=l+"px",i.style.height=s+"px"}),document.addEventListener("mouseup",()=>{t&&(t=!1,document.body.style.userSelect="",document.body.style.cursor="")})}const We={logLevel:"info"},Y={debug:0,info:1,warn:2,error:3};function D(i,e,...t){const n=Y[We.logLevel];if(Y[i]<n)return;const r=`[${i.toUpperCase()}]`,a=new Date().toLocaleTimeString();switch(i){case"debug":case"info":console.log(`${r} [${a}]`,e,...t);break;case"warn":console.warn(`${r} [${a}]`,e,...t);break;case"error":console.error(`${r} [${a}]`,e,...t);break}}const qe={debug:(i,...e)=>D("debug",i,...e),info:(i,...e)=>D("info",i,...e),warn:(i,...e)=>D("warn",i,...e),error:(i,...e)=>D("error",i,...e)};ie(re);(function(){if(window.__imageDownloaderInitialized)return;window.__imageDownloaderInitialized=!0;let i=[],e=new Set,t=!0;function n(a,o){document.addEventListener("keydown",c=>{var u;if(c.ctrlKey&&c.shiftKey&&(c.key==="I"||c.key==="i")){if(c.preventDefault(),!t)return;t=!1,(u=document.querySelector(".id-panel"))!=null&&u.classList.contains("visible")||K(),i=new O().getAllImages(),o.render(i);const l=document.querySelector(".id-status");l&&(l.textContent=`已捕获 ${i.length} 张图片`),setTimeout(()=>{t=!0},500)}})}function r(){const a=$e(),o=he(),c=a.querySelector("#id-enhancer-status");if(o){const y=fe(o);c.textContent=`✨ 当前网站已启用增强：${y}`,c.classList.add("active")}else c.textContent="",c.classList.remove("active");ae({onToggle:oe}),R(),a.querySelector(".id-toolbar");const u=a.querySelector(".id-image-grid"),d=a.querySelector("#id-select-all"),l=a.querySelector("#id-select-none"),s=a.querySelector("#id-download"),h=a.querySelector("#id-capture"),p=a.querySelector("#id-prefix"),g=a.querySelector(".id-status"),b=new me({grid:u,onSelectionChange:y=>{e=y,f()}});n(h,b),h.addEventListener("click",()=>{i=new O().getAllImages(),b.render(i),g.textContent=`已捕获 ${i.length} 张图片`}),d.addEventListener("click",()=>{b.selectAll()}),l.addEventListener("click",()=>{b.selectNone()}),s.addEventListener("click",()=>{if(e.length===0){alert("请先选择要下载的图片");return}const y=p.value||w();new Me({prefix:y,onProgress:(m,I)=>{g.textContent=`下载中: ${m}/${I}`},onComplete:(m,I)=>{g.textContent=`完成: 成功 ${m}, 失败 ${I}`}}).download(e)});function f(){const y=e.length;s.disabled=y===0,s.textContent=y===0?"下载选中":`下载选中 (${y})`}function w(){const y=new Date,v=String(y.getMonth()+1).padStart(2,"0"),m=String(y.getDate()).padStart(2,"0"),I=String(y.getHours()).padStart(2,"0"),E=String(y.getMinutes()).padStart(2,"0");return`${v}${m}${I}${E}`}qe.info("imageDownloader initialized")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r):r()})();
