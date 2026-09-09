(()=>{var P=/\b(href|src|action|formaction)(\s*=\s*)(["'])(\/(?!\/)[^"']*)\3/gi,N=/\bsrcset(\s*=\s*)(["'])([^"']*)\2/gi,$=/url\(\s*(["']?)(\/(?!\/)[^"')]*)\1\s*\)/gi;function H(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function g(e,t){return t.replace(/\/$/,"")+e}function m(e,{prefix:t,targetHost:n}){if(!e)return e;if(e[0]==="/"&&e[1]!=="/")return g(e,t);if(n)try{let r=new URL(e);if(r.host===n)return g(r.pathname+r.search+r.hash,t)}catch{}return e}function E(e,{prefix:t,targetHost:n,pageOrigin:r}){if(!n)return e;let o=new RegExp("(https?|wss?):(//)"+H(n)+`(/[^"'\\s)>]*)?`,"gi");return e.replace(o,(a,i,l,c)=>{let s=c||"/";return(i==="ws"||i==="wss"?r.startsWith("https")?"wss:":"ws:":r.startsWith("https")?"https:":"http:")+"//"+r.replace(/^https?:\/\//,"")+g(s,t)})}var A=/(<script[^>]*\btype\s*=\s*["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/i;function M(e,t){return e.replace(A,(n,r,o,a)=>{let i;try{i=JSON.parse(o)}catch{return n}let l=c=>{if(c)for(let s of Object.keys(c))c[s]=m(c[s],t)};if(l(i.imports),i.scopes){let c={};for(let s of Object.keys(i.scopes))l(i.scopes[s]),c[m(s,t)]=i.scopes[s];i.scopes=c}return r+JSON.stringify(i)+a})}function T(e,t){let{prefix:n}=t,r=M(e,t);return r=r.replace(P,(o,a,i,l,c)=>`${a}${i}${l}${g(c,n)}${l}`),r=r.replace(N,(o,a,i,l)=>{let c=l.split(",").map(s=>{let p=s.trim();if(!p)return p;let f=p.indexOf(" "),y=f===-1?p:p.slice(0,f),b=f===-1?"":p.slice(f);return y[0]!=="/"||y[1]==="/"?p:g(y,n)+b}).join(", ");return`srcset${a}${i}${c}${i}`}),r=E(r,t),r=U(r,t),r}function W(e,t){let{prefix:n}=t,r=e.replace($,(o,a,i)=>`url(${a}${g(i,n)}${a})`);return r=E(r,t),r}function U(e,t){let n=`<script>${B(t)}<\/script>`,r=/<head[^>]*>/i.exec(e);if(r){let a=r.index+r[0].length;return e.slice(0,a)+n+e.slice(a)}let o=/<html[^>]*>/i.exec(e);if(o){let a=o.index+o[0].length;return e.slice(0,a)+n+e.slice(a)}return n+e}function B({prefix:e,targetHost:t}){return`(function(){
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
})();`}self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));var d=new Map,S=new Map;function v(e){let t=S.get(e);if(t){S.delete(e);for(let n of t)n()}}self.addEventListener("message",e=>{let t=e.data;if(!(!t||typeof t!="object")){if(t.type==="nygrok-bridge-ready")d.set(t.seed,{clientId:e.source.id,targetHost:d.get(t.seed)?.targetHost||""}),v(t.seed);else if(t.type==="nygrok-info"){let n=d.get(t.seed);d.set(t.seed,{clientId:n?.clientId||e.source.id,targetHost:t.targetHost||""}),v(t.seed)}}});async function V(e,t){let n=d.get(e);if(n){if(await self.clients.get(n.clientId))return n;d.delete(e)}let r=await self.clients.matchAll({type:"window",includeUncontrolled:!0});for(let o of r)o.postMessage({type:"nygrok-who-has",seed:e});return await new Promise(o=>{let a=setTimeout(o,t),i=S.get(e)||[];i.push(()=>{clearTimeout(a),o()}),S.set(e,i)}),d.get(e)||null}function x(){return new URL(self.registration.scope).pathname}function F(e){let t=x()+"t/";if(!e.pathname.startsWith(t))return null;let n=e.pathname.slice(t.length),r=n.indexOf("/"),o=r===-1?n:n.slice(0,r);if(!o)return null;let a=(r===-1?"/":n.slice(r))+e.search;return{seed:o,upstreamPath:a,prefix:t+o}}async function G(e){if(!e)return null;let t=await self.clients.get(e);if(!t)return null;try{let n=new URL(t.url),r=/^\/t\/([^/]+)/.exec(n.pathname.slice(x().length-1));return r?r[1]:null}catch{return null}}self.addEventListener("fetch",e=>{let t=new URL(e.request.url),n=F(t);if(n){e.respondWith(L(n,e.request));return}t.origin!==self.location.origin||!t.pathname.startsWith(x())||e.respondWith((async()=>{let r=await G(e.clientId);if(!r)return fetch(e.request);let o={seed:r,upstreamPath:t.pathname+t.search,prefix:x()+"t/"+r};return L(o,e.request)})())});function X(e){return/^(text\/|application\/(javascript|json|xml|xhtml\+xml)|image\/svg\+xml)/i.test(e||"")}function _(e){let t=new Headers;for(let[n,r]of Object.entries(e||{}))if(!(n.toLowerCase()==="cache-control"||n.toLowerCase()==="expires"))if(Array.isArray(r))for(let o of r)t.append(n,o);else r!=null&&t.append(n,String(r));return t.set("cache-control","no-store"),t}async function L(e,t){let n=await V(e.seed,2e3);if(!n)return new Response("nygrok: no active tunnel for this link. Reload the page to reconnect.",{status:502,headers:{"content-type":"text/plain"}});let r=await self.clients.get(n.clientId);if(!r)return new Response("nygrok: tunnel bridge was lost. Reload the page to reconnect.",{status:502,headers:{"content-type":"text/plain"}});let a=t.method!=="GET"&&t.method!=="HEAD"?await t.clone().arrayBuffer():null,i={};for(let[w,h]of t.headers.entries())i[w]=h;let{port1:l,port2:c}=new MessageChannel,s=await new Promise(w=>{let h=null,O=!1,C=new ReadableStream({start(R){h=R}});l.onmessage=R=>{let u=R.data;if(u.type==="head")O=!0,w({status:u.status,statusText:u.statusText,headers:u.headers,stream:C,controller:h});else if(u.type==="body")try{h.enqueue(new Uint8Array(u.chunk))}catch{}else if(u.type==="end"){try{h.close()}catch{}l.close()}else if(u.type==="error"){if(O)try{h.error(new Error(u.message))}catch{}else w({error:u.message});l.close()}};let I=a?[c,a]:[c];r.postMessage({type:"nygrok-fetch",seed:e.seed,method:t.method,path:e.upstreamPath,headers:i,body:a},I)});if(s.error)return new Response("nygrok: "+s.error,{status:502,headers:{"content-type":"text/plain"}});s.headers.location&&(s.headers={...s.headers,location:m(s.headers.location,{prefix:e.prefix,targetHost:n.targetHost})});let p=s.headers["content-type"]||"";if(!X(p))return new Response(s.stream,{status:s.status,statusText:s.statusText,headers:_(s.headers)});let f=await new Response(s.stream).text(),y={prefix:e.prefix,targetHost:n.targetHost,pageOrigin:self.location.origin},b=/html/i.test(p)?T(f,y):/css/i.test(p)?W(f,y):f,k=_(s.headers);return k.delete("content-length"),new Response(b,{status:s.status,statusText:s.statusText,headers:k})}})();
//# sourceMappingURL=sw.js.map
