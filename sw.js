(()=>{var P=/\b(href|src|action|formaction)(\s*=\s*)(["'])(\/(?!\/)[^"']*)\3/gi,H=/\bsrcset(\s*=\s*)(["'])([^"']*)\2/gi,N=/url\(\s*(["']?)(\/(?!\/)[^"')]*)\1\s*\)/gi;function $(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function y(e,t){return t.replace(/\/$/,"")+e}function w(e,{prefix:t,targetHost:s}){if(!e)return e;if(e[0]==="/"&&e[1]!=="/")return y(e,t);if(s)try{let r=new URL(e);if(r.host===s)return y(r.pathname+r.search+r.hash,t)}catch{}return e}function O(e,{prefix:t,targetHost:s,pageOrigin:r}){if(!s)return e;let n=new RegExp("(https?|wss?):(//)"+$(s)+`(/[^"'\\s)>]*)?`,"gi");return e.replace(n,(i,a,l,c)=>{let o=c||"/";return(a==="ws"||a==="wss"?r.startsWith("https")?"wss:":"ws:":r.startsWith("https")?"https:":"http:")+"//"+r.replace(/^https?:\/\//,"")+y(o,t)})}var A=/(<script[^>]*\btype\s*=\s*["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/i;function U(e,t){return e.replace(A,(s,r,n,i)=>{let a;try{a=JSON.parse(n)}catch{return s}let l=c=>{if(c)for(let o of Object.keys(c))c[o]=w(c[o],t)};if(l(a.imports),a.scopes){let c={};for(let o of Object.keys(a.scopes))l(a.scopes[o]),c[w(o,t)]=a.scopes[o];a.scopes=c}return r+JSON.stringify(a)+i})}function W(e,t){let{prefix:s}=t,r=U(e,t);return r=r.replace(P,(n,i,a,l,c)=>`${i}${a}${l}${y(c,s)}${l}`),r=r.replace(H,(n,i,a,l)=>{let c=l.split(",").map(o=>{let u=o.trim();if(!u)return u;let f=u.indexOf(" "),d=f===-1?u:u.slice(0,f),b=f===-1?"":u.slice(f);return d[0]!=="/"||d[1]==="/"?u:y(d,s)+b}).join(", ");return`srcset${i}${a}${c}${a}`}),r=O(r,t),r=M(r,t),r}function T(e,t){let{prefix:s}=t,r=e.replace(N,(n,i,a)=>`url(${i}${y(a,s)}${i})`);return r=O(r,t),r}function M(e,t){let s=`<script>${B(t)}<\/script>`,r=/<head[^>]*>/i.exec(e);if(r){let i=r.index+r[0].length;return e.slice(0,i)+s+e.slice(i)}let n=/<html[^>]*>/i.exec(e);if(n){let i=n.index+n[0].length;return e.slice(0,i)+s+e.slice(i)}return s+e}function B({prefix:e,targetHost:t}){return`(function(){
  var PREFIX = ${JSON.stringify(e)};
  var TARGET_HOST = ${JSON.stringify(t||"")};
  function isTunnelUrl(u) {
    try {
      var a = new URL(u, document.baseURI);
      // Compare host, not origin: a ws:/wss: URL never shares an origin with
      // an http:/https: page even on the identical host:port, since origin
      // serialization includes the scheme.
      if (a.host === location.host) return a.pathname.indexOf(PREFIX) !== 0 ? 'root' : false;
      if (TARGET_HOST && a.host === TARGET_HOST) return 'origin';
      return false;
    } catch (e) { return false; }
  }
  function rewrite(u) {
    try {
      var a = new URL(u, document.baseURI);
      var kind = isTunnelUrl(u);
      if (!kind) return u;
      var path = a.pathname + a.search + a.hash;
      var scheme = (a.protocol === 'ws:' || a.protocol === 'wss:') ? (location.protocol === 'https:' ? 'wss:' : 'ws:') : location.protocol;
      return scheme + '//' + location.host + PREFIX.replace(/\\/$/, '') + path;
    } catch (e) { return u; }
  }
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        if (typeof input === 'string') input = rewrite(input);
        else if (input && typeof input.url === 'string') input = new Request(rewrite(input.url), input);
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
  }
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    try { args[1] = rewrite(url); } catch (e) {}
    return origOpen.apply(this, args);
  };
  var OrigWS = window.WebSocket;
  if (OrigWS && window.top && window.top.__nygrokBridge) {
    var bridge = window.top.__nygrokBridge;
    function VirtualWebSocket(url, protocols) {
      var self = this;
      self.url = url;
      self.readyState = 0;
      self.bufferedAmount = 0;
      self.binaryType = 'blob';
      self.protocol = '';
      self._listeners = { open: [], message: [], close: [], error: [] };
      var a;
      try { a = new URL(url, document.baseURI); } catch (e) { a = null; }
      var upath = a ? (a.pathname.indexOf(PREFIX) === 0 ? a.pathname.slice(PREFIX.length) || '/' : a.pathname) + (a.search || '') : '/';
      self._sock = bridge.openWs(upath, protocols, {
        onAccept: function(protocol) {
          self.readyState = 1;
          self.protocol = protocol || '';
          self._dispatch('open', {});
        },
        onMessage: function(data, isBinary) {
          var payload = isBinary ? data : new TextDecoder().decode(data);
          self._dispatch('message', { data: payload });
        },
        onClose: function(code, reason) {
          self.readyState = 3;
          self._dispatch('close', { code: code, reason: reason });
        }
      });
    }
    VirtualWebSocket.prototype.send = function(data) {
      var isBinary = !(typeof data === 'string');
      this._sock.send(isBinary ? data : new TextEncoder().encode(data), isBinary);
    };
    VirtualWebSocket.prototype.close = function(code, reason) {
      this.readyState = 2;
      this._sock.close(code, reason);
    };
    VirtualWebSocket.prototype.addEventListener = function(type, cb) {
      if (this._listeners[type]) this._listeners[type].push(cb);
    };
    VirtualWebSocket.prototype.removeEventListener = function(type, cb) {
      if (!this._listeners[type]) return;
      var i = this._listeners[type].indexOf(cb);
      if (i !== -1) this._listeners[type].splice(i, 1);
    };
    VirtualWebSocket.prototype._dispatch = function(type, detail) {
      var handlerProp = 'on' + type;
      if (typeof this[handlerProp] === 'function') { try { this[handlerProp](detail); } catch (e) {} }
      this._listeners[type].slice().forEach(function(cb) { try { cb(detail); } catch (e) {} });
    };
    VirtualWebSocket.CONNECTING = 0; VirtualWebSocket.OPEN = 1; VirtualWebSocket.CLOSING = 2; VirtualWebSocket.CLOSED = 3;
    window.WebSocket = function(url, protocols) {
      if (isTunnelUrl(url)) return new VirtualWebSocket(url, protocols);
      return protocols === undefined ? new OrigWS(url) : new OrigWS(url, protocols);
    };
    window.WebSocket.prototype = OrigWS.prototype;
    window.WebSocket.CONNECTING = OrigWS.CONNECTING;
    window.WebSocket.OPEN = OrigWS.OPEN;
    window.WebSocket.CLOSING = OrigWS.CLOSING;
    window.WebSocket.CLOSED = OrigWS.CLOSED;
  }
})();`}self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));var h=new Map,m=new Map;function _(e){let t=m.get(e);if(t){m.delete(e);for(let s of t)s()}}self.addEventListener("message",e=>{let t=e.data;if(!(!t||typeof t!="object")){if(t.type==="nygrok-bridge-ready")h.set(t.seed,{clientId:e.source.id,targetHost:h.get(t.seed)?.targetHost||""}),_(t.seed);else if(t.type==="nygrok-info"){let s=h.get(t.seed);h.set(t.seed,{clientId:s?.clientId||e.source.id,targetHost:t.targetHost||""}),_(t.seed)}}});async function F(e,t){let s=h.get(e);if(s){if(await self.clients.get(s.clientId))return s;h.delete(e)}let r=await self.clients.matchAll({type:"window",includeUncontrolled:!0});for(let n of r)n.postMessage({type:"nygrok-who-has",seed:e});return await new Promise(n=>{let i=setTimeout(n,t),a=m.get(e)||[];a.push(()=>{clearTimeout(i),n()}),m.set(e,a)}),h.get(e)||null}function S(){return new URL(self.registration.scope).pathname}function V(e){let t=S()+"t/";if(!e.pathname.startsWith(t))return null;let s=e.pathname.slice(t.length),r=s.indexOf("/"),n=r===-1?s:s.slice(0,r);if(!n)return null;let i=(r===-1?"/":s.slice(r))+e.search;return{seed:n,upstreamPath:i,prefix:t+n}}async function G(e){if(!e)return null;let t=await self.clients.get(e);if(!t)return null;try{let s=new URL(t.url),r=/^\/t\/([^/]+)/.exec(s.pathname.slice(S().length-1));return r?r[1]:null}catch{return null}}self.addEventListener("fetch",e=>{let t=new URL(e.request.url),s=V(t);if(s){e.respondWith(v(s,e.request));return}t.origin!==self.location.origin||!t.pathname.startsWith(S())||e.respondWith((async()=>{let r=await G(e.clientId);if(!r)return fetch(e.request);let n={seed:r,upstreamPath:t.pathname+t.search,prefix:S()+"t/"+r};return v(n,e.request)})())});function X(e){return/html/i.test(e)||/css/i.test(e)}var D=["sec-fetch-","sec-ch-ua"];function J(e){let t={};for(let[s,r]of e.entries()){let n=s.toLowerCase();D.some(i=>n.startsWith(i))||(t[s]=r)}return t}function L(e){let t=new Headers;for(let[s,r]of Object.entries(e||{}))if(!(s.toLowerCase()==="cache-control"||s.toLowerCase()==="expires"))if(Array.isArray(r))for(let n of r)t.append(s,n);else r!=null&&t.append(s,String(r));return t.set("cache-control","no-store"),t}async function v(e,t){let s=await F(e.seed,2e3);if(!s)return new Response("nygrok: no active tunnel for this link. Reload the page to reconnect.",{status:502,headers:{"content-type":"text/plain"}});let r=await self.clients.get(s.clientId);if(!r)return new Response("nygrok: tunnel bridge was lost. Reload the page to reconnect.",{status:502,headers:{"content-type":"text/plain"}});let i=t.method!=="GET"&&t.method!=="HEAD"?await t.clone().arrayBuffer():null,a=J(t.headers),{port1:l,port2:c}=new MessageChannel,o=await new Promise(k=>{let g=null,E=!1,C=new ReadableStream({start(R){g=R}});l.onmessage=R=>{let p=R.data;if(p.type==="head")E=!0,k({status:p.status,statusText:p.statusText,headers:p.headers,stream:C,controller:g});else if(p.type==="body")try{g.enqueue(new Uint8Array(p.chunk,p.byteOffset,p.byteLength))}catch{}else if(p.type==="end"){try{g.close()}catch{}l.close()}else if(p.type==="error"){if(E)try{g.error(new Error(p.message))}catch{}else k({error:p.message});l.close()}};let I=i?[c,i]:[c];r.postMessage({type:"nygrok-fetch",seed:e.seed,method:t.method,path:e.upstreamPath,headers:a,body:i},I)});if(o.error)return new Response("nygrok: "+o.error,{status:502,headers:{"content-type":"text/plain"}});o.headers.location&&(o.headers={...o.headers,location:w(o.headers.location,{prefix:e.prefix,targetHost:s.targetHost})});let u=o.headers["content-type"]||"";if(!X(u))return new Response(o.stream,{status:o.status,statusText:o.statusText,headers:L(o.headers)});let f=await new Response(o.stream).text(),d={prefix:e.prefix,targetHost:s.targetHost,pageOrigin:self.location.origin},b=/html/i.test(u)?W(f,d):/css/i.test(u)?T(f,d):f,x=L(o.headers);return x.delete("content-length"),new Response(b,{status:o.status,statusText:o.statusText,headers:x})}})();
//# sourceMappingURL=sw.js.map
