var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/flexsearch/dist/flexsearch.bundle.min.js
var require_flexsearch_bundle_min = __commonJS({
  "../../node_modules/flexsearch/dist/flexsearch.bundle.min.js"(exports, module) {
    (function _f(self) {
      "use strict";
      try {
        if (module) self = module;
      } catch (e) {
      }
      self._factory = _f;
      var t;
      function u(a) {
        return "undefined" !== typeof a ? a : true;
      }
      function v(a) {
        const b = Array(a);
        for (let c = 0; c < a; c++) b[c] = x();
        return b;
      }
      function x() {
        return /* @__PURE__ */ Object.create(null);
      }
      function aa(a, b) {
        return b.length - a.length;
      }
      function C(a) {
        return "string" === typeof a;
      }
      function D(a) {
        return "object" === typeof a;
      }
      function E(a) {
        return "function" === typeof a;
      }
      ;
      function ba(a, b) {
        var c = ca;
        if (a && (b && (a = F(a, b)), this.H && (a = F(a, this.H)), this.J && 1 < a.length && (a = F(a, this.J)), c || "" === c)) {
          b = a.split(c);
          if (this.filter) {
            a = this.filter;
            c = b.length;
            const d = [];
            for (let e = 0, f = 0; e < c; e++) {
              const h = b[e];
              h && !a[h] && (d[f++] = h);
            }
            a = d;
          } else a = b;
          return a;
        }
        return a;
      }
      const ca = /[\p{Z}\p{S}\p{P}\p{C}]+/u, da = /[\u0300-\u036f]/g;
      function ea(a, b) {
        const c = Object.keys(a), d = c.length, e = [];
        let f = "", h = 0;
        for (let g = 0, k, m; g < d; g++) k = c[g], (m = a[k]) ? (e[h++] = G(b ? "(?!\\b)" + k + "(\\b|_)" : k), e[h++] = m) : f += (f ? "|" : "") + k;
        f && (e[h++] = G(b ? "(?!\\b)(" + f + ")(\\b|_)" : "(" + f + ")"), e[h] = "");
        return e;
      }
      function F(a, b) {
        for (let c = 0, d = b.length; c < d && (a = a.replace(b[c], b[c + 1]), a); c += 2) ;
        return a;
      }
      function G(a) {
        return new RegExp(a, "g");
      }
      function fa(a) {
        let b = "", c = "";
        for (let d = 0, e = a.length, f; d < e; d++) (f = a[d]) !== c && (b += c = f);
        return b;
      }
      ;
      var ia = { encode: ha, F: false, G: "" };
      function ha(a) {
        return ba.call(this, ("" + a).toLowerCase(), false);
      }
      ;
      const ja = {}, I = {};
      function ka(a) {
        J(a, "add");
        J(a, "append");
        J(a, "search");
        J(a, "update");
        J(a, "remove");
      }
      function J(a, b) {
        a[b + "Async"] = function() {
          const c = this, d = arguments;
          var e = d[d.length - 1];
          let f;
          E(e) && (f = e, delete d[d.length - 1]);
          e = new Promise(function(h) {
            setTimeout(function() {
              c.async = true;
              const g = c[b].apply(c, d);
              c.async = false;
              h(g);
            });
          });
          return f ? (e.then(f), this) : e;
        };
      }
      ;
      function la(a, b, c, d) {
        const e = a.length;
        let f = [], h, g, k = 0;
        d && (d = []);
        for (let m = e - 1; 0 <= m; m--) {
          const n = a[m], w = n.length, q = x();
          let r = !h;
          for (let l = 0; l < w; l++) {
            const p = n[l], A = p.length;
            if (A) for (let B = 0, z, y; B < A; B++) if (y = p[B], h) {
              if (h[y]) {
                if (!m) {
                  if (c) c--;
                  else if (f[k++] = y, k === b) return f;
                }
                if (m || d) q[y] = 1;
                r = true;
              }
              if (d && (z = (g[y] || 0) + 1, g[y] = z, z < e)) {
                const H = d[z - 2] || (d[z - 2] = []);
                H[H.length] = y;
              }
            } else q[y] = 1;
          }
          if (d) h || (g = q);
          else if (!r) return [];
          h = q;
        }
        if (d) for (let m = d.length - 1, n, w; 0 <= m; m--) {
          n = d[m];
          w = n.length;
          for (let q = 0, r; q < w; q++) if (r = n[q], !h[r]) {
            if (c) c--;
            else if (f[k++] = r, k === b) return f;
            h[r] = 1;
          }
        }
        return f;
      }
      function ma(a, b) {
        const c = x(), d = x(), e = [];
        for (let f = 0; f < a.length; f++) c[a[f]] = 1;
        for (let f = 0, h; f < b.length; f++) {
          h = b[f];
          for (let g = 0, k; g < h.length; g++) k = h[g], c[k] && !d[k] && (d[k] = 1, e[e.length] = k);
        }
        return e;
      }
      ;
      function K(a) {
        this.l = true !== a && a;
        this.cache = x();
        this.h = [];
      }
      function na(a, b, c) {
        D(a) && (a = a.query);
        let d = this.cache.get(a);
        d || (d = this.search(a, b, c), this.cache.set(a, d));
        return d;
      }
      K.prototype.set = function(a, b) {
        if (!this.cache[a]) {
          var c = this.h.length;
          c === this.l ? delete this.cache[this.h[c - 1]] : c++;
          for (--c; 0 < c; c--) this.h[c] = this.h[c - 1];
          this.h[0] = a;
        }
        this.cache[a] = b;
      };
      K.prototype.get = function(a) {
        const b = this.cache[a];
        if (this.l && b && (a = this.h.indexOf(a))) {
          const c = this.h[a - 1];
          this.h[a - 1] = this.h[a];
          this.h[a] = c;
        }
        return b;
      };
      const pa = { memory: { charset: "latin:extra", D: 3, B: 4, m: false }, performance: { D: 3, B: 3, s: false, context: { depth: 2, D: 1 } }, match: { charset: "latin:extra", G: "reverse" }, score: { charset: "latin:advanced", D: 20, B: 3, context: { depth: 3, D: 9 } }, "default": {} };
      function qa(a, b, c, d, e, f, h, g) {
        setTimeout(function() {
          const k = a(c ? c + "." + d : d, JSON.stringify(h));
          k && k.then ? k.then(function() {
            b.export(a, b, c, e, f + 1, g);
          }) : b.export(a, b, c, e, f + 1, g);
        });
      }
      ;
      function L(a, b) {
        if (!(this instanceof L)) return new L(a);
        var c;
        if (a) {
          C(a) ? a = pa[a] : (c = a.preset) && (a = Object.assign({}, c[c], a));
          c = a.charset;
          var d = a.lang;
          C(c) && (-1 === c.indexOf(":") && (c += ":default"), c = I[c]);
          C(d) && (d = ja[d]);
        } else a = {};
        let e, f, h = a.context || {};
        this.encode = a.encode || c && c.encode || ha;
        this.register = b || x();
        this.D = e = a.resolution || 9;
        this.G = b = c && c.G || a.tokenize || "strict";
        this.depth = "strict" === b && h.depth;
        this.l = u(h.bidirectional);
        this.s = f = u(a.optimize);
        this.m = u(a.fastupdate);
        this.B = a.minlength || 1;
        this.C = a.boost;
        this.map = f ? v(e) : x();
        this.A = e = h.resolution || 1;
        this.h = f ? v(e) : x();
        this.F = c && c.F || a.rtl;
        this.H = (b = a.matcher || d && d.H) && ea(b, false);
        this.J = (b = a.stemmer || d && d.J) && ea(b, true);
        if (c = b = a.filter || d && d.filter) {
          c = b;
          d = x();
          for (let g = 0, k = c.length; g < k; g++) d[c[g]] = 1;
          c = d;
        }
        this.filter = c;
        this.cache = (b = a.cache) && new K(b);
      }
      t = L.prototype;
      t.append = function(a, b) {
        return this.add(a, b, true);
      };
      t.add = function(a, b, c, d) {
        if (b && (a || 0 === a)) {
          if (!d && !c && this.register[a]) return this.update(a, b);
          b = this.encode(b);
          if (d = b.length) {
            const m = x(), n = x(), w = this.depth, q = this.D;
            for (let r = 0; r < d; r++) {
              let l = b[this.F ? d - 1 - r : r];
              var e = l.length;
              if (l && e >= this.B && (w || !n[l])) {
                var f = M(q, d, r), h = "";
                switch (this.G) {
                  case "full":
                    if (2 < e) {
                      for (f = 0; f < e; f++) for (var g = e; g > f; g--) if (g - f >= this.B) {
                        var k = M(q, d, r, e, f);
                        h = l.substring(f, g);
                        N(this, n, h, k, a, c);
                      }
                      break;
                    }
                  case "reverse":
                    if (1 < e) {
                      for (g = e - 1; 0 < g; g--) h = l[g] + h, h.length >= this.B && N(
                        this,
                        n,
                        h,
                        M(q, d, r, e, g),
                        a,
                        c
                      );
                      h = "";
                    }
                  case "forward":
                    if (1 < e) {
                      for (g = 0; g < e; g++) h += l[g], h.length >= this.B && N(this, n, h, f, a, c);
                      break;
                    }
                  default:
                    if (this.C && (f = Math.min(f / this.C(b, l, r) | 0, q - 1)), N(this, n, l, f, a, c), w && 1 < d && r < d - 1) {
                      for (e = x(), h = this.A, f = l, g = Math.min(w + 1, d - r), e[f] = 1, k = 1; k < g; k++) if ((l = b[this.F ? d - 1 - r - k : r + k]) && l.length >= this.B && !e[l]) {
                        e[l] = 1;
                        const p = this.l && l > f;
                        N(this, m, p ? f : l, M(h + (d / 2 > h ? 0 : 1), d, r, g - 1, k - 1), a, c, p ? l : f);
                      }
                    }
                }
              }
            }
            this.m || (this.register[a] = 1);
          }
        }
        return this;
      };
      function M(a, b, c, d, e) {
        return c && 1 < a ? b + (d || 0) <= a ? c + (e || 0) : (a - 1) / (b + (d || 0)) * (c + (e || 0)) + 1 | 0 : 0;
      }
      function N(a, b, c, d, e, f, h) {
        let g = h ? a.h : a.map;
        if (!b[c] || h && !b[c][h]) a.s && (g = g[d]), h ? (b = b[c] || (b[c] = x()), b[h] = 1, g = g[h] || (g[h] = x())) : b[c] = 1, g = g[c] || (g[c] = []), a.s || (g = g[d] || (g[d] = [])), f && g.includes(e) || (g[g.length] = e, a.m && (a = a.register[e] || (a.register[e] = []), a[a.length] = g));
      }
      t.search = function(a, b, c) {
        c || (!b && D(a) ? (c = a, a = c.query) : D(b) && (c = b));
        let d = [], e;
        let f, h = 0;
        if (c) {
          a = c.query || a;
          b = c.limit;
          h = c.offset || 0;
          var g = c.context;
          f = c.suggest;
        }
        if (a && (a = this.encode("" + a), e = a.length, 1 < e)) {
          c = x();
          var k = [];
          for (let n = 0, w = 0, q; n < e; n++) if ((q = a[n]) && q.length >= this.B && !c[q]) if (this.s || f || this.map[q]) k[w++] = q, c[q] = 1;
          else return d;
          a = k;
          e = a.length;
        }
        if (!e) return d;
        b || (b = 100);
        g = this.depth && 1 < e && false !== g;
        c = 0;
        let m;
        g ? (m = a[0], c = 1) : 1 < e && a.sort(aa);
        for (let n, w; c < e; c++) {
          w = a[c];
          g ? (n = ra(
            this,
            d,
            f,
            b,
            h,
            2 === e,
            w,
            m
          ), f && false === n && d.length || (m = w)) : n = ra(this, d, f, b, h, 1 === e, w);
          if (n) return n;
          if (f && c === e - 1) {
            k = d.length;
            if (!k) {
              if (g) {
                g = 0;
                c = -1;
                continue;
              }
              return d;
            }
            if (1 === k) return sa(d[0], b, h);
          }
        }
        return la(d, b, h, f);
      };
      function ra(a, b, c, d, e, f, h, g) {
        let k = [], m = g ? a.h : a.map;
        a.s || (m = ta(m, h, g, a.l));
        if (m) {
          let n = 0;
          const w = Math.min(m.length, g ? a.A : a.D);
          for (let q = 0, r = 0, l, p; q < w; q++) if (l = m[q]) {
            if (a.s && (l = ta(l, h, g, a.l)), e && l && f && (p = l.length, p <= e ? (e -= p, l = null) : (l = l.slice(e), e = 0)), l && (k[n++] = l, f && (r += l.length, r >= d))) break;
          }
          if (n) {
            if (f) return sa(k, d, 0);
            b[b.length] = k;
            return;
          }
        }
        return !c && k;
      }
      function sa(a, b, c) {
        a = 1 === a.length ? a[0] : [].concat.apply([], a);
        return c || a.length > b ? a.slice(c, c + b) : a;
      }
      function ta(a, b, c, d) {
        c ? (d = d && b > c, a = (a = a[d ? b : c]) && a[d ? c : b]) : a = a[b];
        return a;
      }
      t.contain = function(a) {
        return !!this.register[a];
      };
      t.update = function(a, b) {
        return this.remove(a).add(a, b);
      };
      t.remove = function(a, b) {
        const c = this.register[a];
        if (c) {
          if (this.m) for (let d = 0, e; d < c.length; d++) e = c[d], e.splice(e.indexOf(a), 1);
          else O(this.map, a, this.D, this.s), this.depth && O(this.h, a, this.A, this.s);
          b || delete this.register[a];
          if (this.cache) {
            b = this.cache;
            for (let d = 0, e, f; d < b.h.length; d++) f = b.h[d], e = b.cache[f], e.includes(a) && (b.h.splice(d--, 1), delete b.cache[f]);
          }
        }
        return this;
      };
      function O(a, b, c, d, e) {
        let f = 0;
        if (a.constructor === Array) if (e) b = a.indexOf(b), -1 !== b ? 1 < a.length && (a.splice(b, 1), f++) : f++;
        else {
          e = Math.min(a.length, c);
          for (let h = 0, g; h < e; h++) if (g = a[h]) f = O(g, b, c, d, e), d || f || delete a[h];
        }
        else for (let h in a) (f = O(a[h], b, c, d, e)) || delete a[h];
        return f;
      }
      t.searchCache = na;
      t.export = function(a, b, c, d, e, f) {
        let h = true;
        "undefined" === typeof f && (h = new Promise((m) => {
          f = m;
        }));
        let g, k;
        switch (e || (e = 0)) {
          case 0:
            g = "reg";
            if (this.m) {
              k = x();
              for (let m in this.register) k[m] = 1;
            } else k = this.register;
            break;
          case 1:
            g = "cfg";
            k = { doc: 0, opt: this.s ? 1 : 0 };
            break;
          case 2:
            g = "map";
            k = this.map;
            break;
          case 3:
            g = "ctx";
            k = this.h;
            break;
          default:
            "undefined" === typeof c && f && f();
            return;
        }
        qa(a, b || this, c, g, d, e, k, f);
        return h;
      };
      t.import = function(a, b) {
        if (b) switch (C(b) && (b = JSON.parse(b)), a) {
          case "cfg":
            this.s = !!b.opt;
            break;
          case "reg":
            this.m = false;
            this.register = b;
            break;
          case "map":
            this.map = b;
            break;
          case "ctx":
            this.h = b;
        }
      };
      ka(L.prototype);
      function ua(a) {
        a = a.data;
        var b = self._index;
        const c = a.args;
        var d = a.task;
        switch (d) {
          case "init":
            d = a.options || {};
            a = a.factory;
            b = d.encode;
            d.cache = false;
            b && 0 === b.indexOf("function") && (d.encode = Function("return " + b)());
            a ? (Function("return " + a)()(self), self._index = new self.FlexSearch.Index(d), delete self.FlexSearch) : self._index = new L(d);
            break;
          default:
            a = a.id, b = b[d].apply(b, c), postMessage("search" === d ? { id: a, msg: b } : { id: a });
        }
      }
      ;
      let va = 0;
      function P(a) {
        if (!(this instanceof P)) return new P(a);
        var b;
        a ? E(b = a.encode) && (a.encode = b.toString()) : a = {};
        (b = (self || window)._factory) && (b = b.toString());
        const c = "undefined" === typeof window && self.exports, d = this;
        this.o = wa(b, c, a.worker);
        this.h = x();
        if (this.o) {
          if (c) this.o.on("message", function(e) {
            d.h[e.id](e.msg);
            delete d.h[e.id];
          });
          else this.o.onmessage = function(e) {
            e = e.data;
            d.h[e.id](e.msg);
            delete d.h[e.id];
          };
          this.o.postMessage({ task: "init", factory: b, options: a });
        }
      }
      Q("add");
      Q("append");
      Q("search");
      Q("update");
      Q("remove");
      function Q(a) {
        P.prototype[a] = P.prototype[a + "Async"] = function() {
          const b = this, c = [].slice.call(arguments);
          var d = c[c.length - 1];
          let e;
          E(d) && (e = d, c.splice(c.length - 1, 1));
          d = new Promise(function(f) {
            setTimeout(function() {
              b.h[++va] = f;
              b.o.postMessage({ task: a, id: va, args: c });
            });
          });
          return e ? (d.then(e), this) : d;
        };
      }
      function wa(a, b, c) {
        let d;
        try {
          d = b ? new (__require("worker_threads"))["Worker"](__dirname + "/node/node.js") : a ? new Worker(URL.createObjectURL(new Blob(["onmessage=" + ua.toString()], { type: "text/javascript" }))) : new Worker(C(c) ? c : "worker/worker.js", { type: "module" });
        } catch (e) {
        }
        return d;
      }
      ;
      function S(a) {
        if (!(this instanceof S)) return new S(a);
        var b = a.document || a.doc || a, c;
        this.K = [];
        this.h = [];
        this.A = [];
        this.register = x();
        this.key = (c = b.key || b.id) && T(c, this.A) || "id";
        this.m = u(a.fastupdate);
        this.C = (c = b.store) && true !== c && [];
        this.store = c && x();
        this.I = (c = b.tag) && T(c, this.A);
        this.l = c && x();
        this.cache = (c = a.cache) && new K(c);
        a.cache = false;
        this.o = a.worker;
        this.async = false;
        c = x();
        let d = b.index || b.field || b;
        C(d) && (d = [d]);
        for (let e = 0, f, h; e < d.length; e++) f = d[e], C(f) || (h = f, f = f.field), h = D(h) ? Object.assign({}, a, h) : a, this.o && (c[f] = new P(h), c[f].o || (this.o = false)), this.o || (c[f] = new L(h, this.register)), this.K[e] = T(f, this.A), this.h[e] = f;
        if (this.C) for (a = b.store, C(a) && (a = [a]), b = 0; b < a.length; b++) this.C[b] = T(a[b], this.A);
        this.index = c;
      }
      function T(a, b) {
        const c = a.split(":");
        let d = 0;
        for (let e = 0; e < c.length; e++) a = c[e], 0 <= a.indexOf("[]") && (a = a.substring(0, a.length - 2)) && (b[d] = true), a && (c[d++] = a);
        d < c.length && (c.length = d);
        return 1 < d ? c : c[0];
      }
      function U(a, b) {
        if (C(b)) a = a[b];
        else for (let c = 0; a && c < b.length; c++) a = a[b[c]];
        return a;
      }
      function V(a, b, c, d, e) {
        a = a[e];
        if (d === c.length - 1) b[e] = a;
        else if (a) if (a.constructor === Array) for (b = b[e] = Array(a.length), e = 0; e < a.length; e++) V(a, b, c, d, e);
        else b = b[e] || (b[e] = x()), e = c[++d], V(a, b, c, d, e);
      }
      function X(a, b, c, d, e, f, h, g) {
        if (a = a[h]) if (d === b.length - 1) {
          if (a.constructor === Array) {
            if (c[d]) {
              for (b = 0; b < a.length; b++) e.add(f, a[b], true, true);
              return;
            }
            a = a.join(" ");
          }
          e.add(f, a, g, true);
        } else if (a.constructor === Array) for (h = 0; h < a.length; h++) X(a, b, c, d, e, f, h, g);
        else h = b[++d], X(a, b, c, d, e, f, h, g);
      }
      t = S.prototype;
      t.add = function(a, b, c) {
        D(a) && (b = a, a = U(b, this.key));
        if (b && (a || 0 === a)) {
          if (!c && this.register[a]) return this.update(a, b);
          for (let d = 0, e, f; d < this.h.length; d++) f = this.h[d], e = this.K[d], C(e) && (e = [e]), X(b, e, this.A, 0, this.index[f], a, e[0], c);
          if (this.I) {
            let d = U(b, this.I), e = x();
            C(d) && (d = [d]);
            for (let f = 0, h, g; f < d.length; f++) if (h = d[f], !e[h] && (e[h] = 1, g = this.l[h] || (this.l[h] = []), !c || !g.includes(a))) {
              if (g[g.length] = a, this.m) {
                const k = this.register[a] || (this.register[a] = []);
                k[k.length] = g;
              }
            }
          }
          if (this.store && (!c || !this.store[a])) {
            let d;
            if (this.C) {
              d = x();
              for (let e = 0, f; e < this.C.length; e++) f = this.C[e], C(f) ? d[f] = b[f] : V(b, d, f, 0, f[0]);
            }
            this.store[a] = d || b;
          }
        }
        return this;
      };
      t.append = function(a, b) {
        return this.add(a, b, true);
      };
      t.update = function(a, b) {
        return this.remove(a).add(a, b);
      };
      t.remove = function(a) {
        D(a) && (a = U(a, this.key));
        if (this.register[a]) {
          for (var b = 0; b < this.h.length && (this.index[this.h[b]].remove(a, !this.o), !this.m); b++) ;
          if (this.I && !this.m) for (let c in this.l) {
            b = this.l[c];
            const d = b.indexOf(a);
            -1 !== d && (1 < b.length ? b.splice(d, 1) : delete this.l[c]);
          }
          this.store && delete this.store[a];
          delete this.register[a];
        }
        return this;
      };
      t.search = function(a, b, c, d) {
        c || (!b && D(a) ? (c = a, a = "") : D(b) && (c = b, b = 0));
        let e = [], f = [], h, g, k, m, n, w, q = 0;
        if (c) if (c.constructor === Array) k = c, c = null;
        else {
          a = c.query || a;
          k = (h = c.pluck) || c.index || c.field;
          m = c.tag;
          g = this.store && c.enrich;
          n = "and" === c.bool;
          b = c.limit || b || 100;
          w = c.offset || 0;
          if (m && (C(m) && (m = [m]), !a)) {
            for (let l = 0, p; l < m.length; l++) if (p = xa.call(this, m[l], b, w, g)) e[e.length] = p, q++;
            return q ? e : [];
          }
          C(k) && (k = [k]);
        }
        k || (k = this.h);
        n = n && (1 < k.length || m && 1 < m.length);
        const r = !d && (this.o || this.async) && [];
        for (let l = 0, p, A, B; l < k.length; l++) {
          let z;
          A = k[l];
          C(A) || (z = A, A = z.field, a = z.query || a, b = z.limit || b, g = z.enrich || g);
          if (r) r[l] = this.index[A].searchAsync(a, b, z || c);
          else {
            d ? p = d[l] : p = this.index[A].search(a, b, z || c);
            B = p && p.length;
            if (m && B) {
              const y = [];
              let H = 0;
              n && (y[0] = [p]);
              for (let W = 0, oa, R; W < m.length; W++) if (oa = m[W], B = (R = this.l[oa]) && R.length) H++, y[y.length] = n ? [R] : R;
              H && (p = n ? la(y, b || 100, w || 0) : ma(p, y), B = p.length);
            }
            if (B) f[q] = A, e[q++] = p;
            else if (n) return [];
          }
        }
        if (r) {
          const l = this;
          return new Promise(function(p) {
            Promise.all(r).then(function(A) {
              p(l.search(
                a,
                b,
                c,
                A
              ));
            });
          });
        }
        if (!q) return [];
        if (h && (!g || !this.store)) return e[0];
        for (let l = 0, p; l < f.length; l++) {
          p = e[l];
          p.length && g && (p = ya.call(this, p));
          if (h) return p;
          e[l] = { field: f[l], result: p };
        }
        return e;
      };
      function xa(a, b, c, d) {
        let e = this.l[a], f = e && e.length - c;
        if (f && 0 < f) {
          if (f > b || c) e = e.slice(c, c + b);
          d && (e = ya.call(this, e));
          return { tag: a, result: e };
        }
      }
      function ya(a) {
        const b = Array(a.length);
        for (let c = 0, d; c < a.length; c++) d = a[c], b[c] = { id: d, doc: this.store[d] };
        return b;
      }
      t.contain = function(a) {
        return !!this.register[a];
      };
      t.get = function(a) {
        return this.store[a];
      };
      t.set = function(a, b) {
        this.store[a] = b;
        return this;
      };
      t.searchCache = na;
      t.export = function(a, b, c, d, e, f) {
        let h;
        "undefined" === typeof f && (h = new Promise((g) => {
          f = g;
        }));
        e || (e = 0);
        d || (d = 0);
        if (d < this.h.length) {
          const g = this.h[d], k = this.index[g];
          b = this;
          setTimeout(function() {
            k.export(a, b, e ? g : "", d, e++, f) || (d++, e = 1, b.export(a, b, g, d, e, f));
          });
        } else {
          let g, k;
          switch (e) {
            case 1:
              g = "tag";
              k = this.l;
              c = null;
              break;
            case 2:
              g = "store";
              k = this.store;
              c = null;
              break;
            default:
              f();
              return;
          }
          qa(a, this, c, g, d, e, k, f);
        }
        return h;
      };
      t.import = function(a, b) {
        if (b) switch (C(b) && (b = JSON.parse(b)), a) {
          case "tag":
            this.l = b;
            break;
          case "reg":
            this.m = false;
            this.register = b;
            for (let d = 0, e; d < this.h.length; d++) e = this.index[this.h[d]], e.register = b, e.m = false;
            break;
          case "store":
            this.store = b;
            break;
          default:
            a = a.split(".");
            const c = a[0];
            a = a[1];
            c && a && this.index[c].import(a, b);
        }
      };
      ka(S.prototype);
      var Aa = { encode: za, F: false, G: "" };
      const Ba = [G("[\xE0\xE1\xE2\xE3\xE4\xE5]"), "a", G("[\xE8\xE9\xEA\xEB]"), "e", G("[\xEC\xED\xEE\xEF]"), "i", G("[\xF2\xF3\xF4\xF5\xF6\u0151]"), "o", G("[\xF9\xFA\xFB\xFC\u0171]"), "u", G("[\xFD\u0177\xFF]"), "y", G("\xF1"), "n", G("[\xE7c]"), "k", G("\xDF"), "s", G(" & "), " and "];
      function za(a) {
        var b = a = "" + a;
        b.normalize && (b = b.normalize("NFD").replace(da, ""));
        return ba.call(this, b.toLowerCase(), !a.normalize && Ba);
      }
      ;
      var Da = { encode: Ca, F: false, G: "strict" };
      const Ea = /[^a-z0-9]+/, Fa = { b: "p", v: "f", w: "f", z: "s", x: "s", "\xDF": "s", d: "t", n: "m", c: "k", g: "k", j: "k", q: "k", i: "e", y: "e", u: "o" };
      function Ca(a) {
        a = za.call(this, a).join(" ");
        const b = [];
        if (a) {
          const c = a.split(Ea), d = c.length;
          for (let e = 0, f, h = 0; e < d; e++) if ((a = c[e]) && (!this.filter || !this.filter[a])) {
            f = a[0];
            let g = Fa[f] || f, k = g;
            for (let m = 1; m < a.length; m++) {
              f = a[m];
              const n = Fa[f] || f;
              n && n !== k && (g += n, k = n);
            }
            b[h++] = g;
          }
        }
        return b;
      }
      ;
      var Ha = { encode: Ga, F: false, G: "" };
      const Ia = [G("ae"), "a", G("oe"), "o", G("sh"), "s", G("th"), "t", G("ph"), "f", G("pf"), "f", G("(?![aeo])h(?![aeo])"), "", G("(?!^[aeo])h(?!^[aeo])"), ""];
      function Ga(a, b) {
        a && (a = Ca.call(this, a).join(" "), 2 < a.length && (a = F(a, Ia)), b || (1 < a.length && (a = fa(a)), a && (a = a.split(" "))));
        return a || [];
      }
      ;
      var Ka = { encode: Ja, F: false, G: "" };
      const La = G("(?!\\b)[aeo]");
      function Ja(a) {
        a && (a = Ga.call(this, a, true), 1 < a.length && (a = a.replace(La, "")), 1 < a.length && (a = fa(a)), a && (a = a.split(" ")));
        return a || [];
      }
      ;
      I["latin:default"] = ia;
      I["latin:simple"] = Aa;
      I["latin:balance"] = Da;
      I["latin:advanced"] = Ha;
      I["latin:extra"] = Ka;
      const Y = { Index: L, Document: S, Worker: P, registerCharset: function(a, b) {
        I[a] = b;
      }, registerLanguage: function(a, b) {
        ja[a] = b;
      } };
      let Z;
      (Z = self.define) && Z.amd ? Z([], function() {
        return Y;
      }) : self.exports ? self.exports = Y : self.FlexSearch = Y;
    })(exports);
  }
});

// src/Fallback.jsx
import React from "react";
function Fallback({ name, ...props }) {
  const style = {
    padding: "0.75rem 1rem",
    border: "1px dashed #d1d5db",
    color: "#6b7280",
    borderRadius: 6,
    background: "#f9fafb",
    fontSize: 14
  };
  return /* @__PURE__ */ React.createElement("div", { style, "data-fallback-component": name || "Unknown" }, /* @__PURE__ */ React.createElement("strong", null, name || "Unknown component"), " not available in UI.");
}

// src/HelloWorld.jsx
import React2 from "react";
var HelloWorld = () => {
  return /* @__PURE__ */ React2.createElement("div", null, "Hello, World!");
};

// src/layout/Card.jsx
import React3 from "react";
function Card({
  href,
  src,
  alt,
  title,
  subtitle,
  className,
  style,
  children,
  ...rest
}) {
  const caption = /* @__PURE__ */ React3.createElement("figcaption", { style: { marginTop: 8 } }, title ? /* @__PURE__ */ React3.createElement("strong", { style: { display: "block" } }, title) : null, subtitle ? /* @__PURE__ */ React3.createElement("span", { style: { display: "block", color: "#6b7280" } }, subtitle) : null, children);
  return /* @__PURE__ */ React3.createElement("a", { href, className, style, ...rest }, /* @__PURE__ */ React3.createElement("figure", { style: { margin: 0 } }, src ? /* @__PURE__ */ React3.createElement(
    "img",
    {
      src,
      alt: alt || title || "",
      loading: "lazy",
      style: { display: "block", width: "100%", height: "auto", borderRadius: 4 }
    }
  ) : null, caption));
}

// src/iiif/Viewer.jsx
import React4, { useEffect, useState } from "react";
var Viewer = (props) => {
  const [CloverViewer, setCloverViewer] = useState(null);
  const options = {
    informationPanel: {
      open: false,
      renderAbout: false
    }
  };
  useEffect(() => {
    let mounted = true;
    const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer").then((mod) => {
        if (!mounted) return;
        console.log(mod);
        const Comp = mod && (mod.default || mod.Viewer || mod);
        setCloverViewer(() => Comp);
      }).catch(() => {
      });
    }
    return () => {
      mounted = false;
    };
  }, []);
  if (!CloverViewer) {
    let json = "{}";
    try {
      json = JSON.stringify(props || {});
    } catch (_) {
      json = "{}";
    }
    return /* @__PURE__ */ React4.createElement("div", { "data-canopy-viewer": "1" }, /* @__PURE__ */ React4.createElement(
      "script",
      {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: json }
      }
    ));
  }
  return /* @__PURE__ */ React4.createElement(CloverViewer, { options, ...props });
};

// src/layout/TestFile.jsx
import React5, { useEffect as useEffect2, useState as useState2 } from "react";
var TestFile = (props) => {
  const [CloverViewer, setCloverViewer] = useState2(null);
  useEffect2(() => {
    let mounted = true;
    const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";
    if (canUseDom) {
      import("@samvera/clover-iiif/viewer").then((mod) => {
        if (!mounted) return;
        const Comp = mod && (mod.default || mod.Viewer || mod);
        setCloverViewer(() => Comp);
      }).catch(() => {
      });
    }
    return () => {
      mounted = false;
    };
  }, []);
  if (!CloverViewer) return null;
  return /* @__PURE__ */ React5.createElement(CloverViewer, { ...props });
};

// src/search/MdxSearchForm.jsx
import React6 from "react";
function MdxSearchForm(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React6.createElement("div", { "data-canopy-search-form": "1" }, /* @__PURE__ */ React6.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/MdxSearchResults.jsx
import React7 from "react";
function MdxSearchResults(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React7.createElement("div", { "data-canopy-search-results": "1" }, /* @__PURE__ */ React7.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchSummary.jsx
import React8 from "react";
function SearchSummary(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React8.createElement("div", { "data-canopy-search-summary": "1" }, /* @__PURE__ */ React8.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchTotal.jsx
import React9 from "react";
function SearchTotal(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React9.createElement("div", { "data-canopy-search-total": "1" }, /* @__PURE__ */ React9.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}

// src/search/SearchForm.jsx
import React10 from "react";
function SearchForm({ query, onQueryChange, type = "all", onTypeChange, types = [] }) {
  const allTypes = Array.from(/* @__PURE__ */ new Set(["all", ...types]));
  return /* @__PURE__ */ React10.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-2" }, /* @__PURE__ */ React10.createElement(
    "input",
    {
      id: "search-input",
      type: "search",
      value: query,
      placeholder: "Type to search\u2026",
      onChange: (e) => onQueryChange && onQueryChange(e.target.value),
      className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
    }
  ), /* @__PURE__ */ React10.createElement("div", { className: "flex items-center gap-3 text-sm text-slate-600" }, /* @__PURE__ */ React10.createElement("label", { htmlFor: "search-type" }, "Type:"), /* @__PURE__ */ React10.createElement(
    "select",
    {
      id: "search-type",
      value: type,
      onChange: (e) => onTypeChange && onTypeChange(e.target.value),
      className: "px-2 py-1 border border-slate-300 rounded-md bg-white"
    },
    allTypes.map((t) => /* @__PURE__ */ React10.createElement("option", { key: t, value: t }, t.charAt(0).toUpperCase() + t.slice(1)))
  )));
}

// src/search/SearchResults.jsx
import React11 from "react";
function WorkItem({ href, title, thumbnail }) {
  return /* @__PURE__ */ React11.createElement("li", { className: "search-result work" }, /* @__PURE__ */ React11.createElement("a", { href, className: "card" }, /* @__PURE__ */ React11.createElement("figure", { style: { margin: 0 } }, thumbnail ? /* @__PURE__ */ React11.createElement(
    "img",
    {
      src: thumbnail,
      alt: title || "",
      loading: "lazy",
      style: { display: "block", width: "100%", height: "auto", borderRadius: 4 }
    }
  ) : null, /* @__PURE__ */ React11.createElement("figcaption", { style: { marginTop: 8 } }, /* @__PURE__ */ React11.createElement("strong", null, title || href)))));
}
function PageItem({ href, title }) {
  return /* @__PURE__ */ React11.createElement("li", { className: "search-result page" }, /* @__PURE__ */ React11.createElement("a", { href }, title || href));
}
function SearchResults({ results = [], type = "all" }) {
  if (!results.length) {
    return /* @__PURE__ */ React11.createElement("div", { className: "text-slate-600" }, /* @__PURE__ */ React11.createElement("em", null, "No results"));
  }
  return /* @__PURE__ */ React11.createElement("ul", { id: "search-results", className: "space-y-3" }, results.map(
    (r, i) => r.type === "work" ? /* @__PURE__ */ React11.createElement(WorkItem, { key: i, href: r.href, title: r.title, thumbnail: r.thumbnail }) : /* @__PURE__ */ React11.createElement(PageItem, { key: i, href: r.href, title: r.title })
  ));
}

// src/search/useSearch.js
import { useEffect as useEffect3, useMemo, useRef, useState as useState3 } from "react";
function useSearch(query, type) {
  const [records, setRecords] = useState3([]);
  const [loading, setLoading] = useState3(true);
  const indexRef = useRef(null);
  const idToRecRef = useRef([]);
  const [types, setTypes] = useState3([]);
  useEffect3(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve().then(() => __toESM(require_flexsearch_bundle_min(), 1)).then((mod) => {
      const FlexSearch = mod.default || mod;
      return fetch("./search-index.json").then((r) => r.ok ? r.json() : []).catch(() => []).then((data) => {
        if (cancelled) return;
        const idx = new FlexSearch.Index({ tokenize: "forward" });
        const idToRec = [];
        data.forEach((rec, i) => {
          try {
            idx.add(i, rec && rec.title ? String(rec.title) : "");
          } catch (_) {
          }
          idToRec[i] = rec || {};
        });
        const ts = Array.from(
          new Set(data.map((r) => String(r && r.type || "page")))
        );
        const order = ["work", "docs", "page"];
        ts.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
        indexRef.current = idx;
        idToRecRef.current = idToRec;
        setRecords(data);
        setTypes(ts);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const results = useMemo(() => {
    const all = idToRecRef.current;
    if (!all || !all.length) return [];
    const t = String(type || "all").toLowerCase();
    if (!query) {
      return all.filter((r) => t === "all" ? true : String(r.type).toLowerCase() === t);
    }
    let ids = [];
    try {
      ids = indexRef.current && indexRef.current.search(query, { limit: 200 }) || [];
    } catch (_) {
      ids = [];
    }
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      const rec = all[id];
      if (!rec) continue;
      if (t !== "all" && String(rec.type).toLowerCase() !== t) continue;
      out.push(rec);
    }
    return out;
  }, [query, type, records]);
  return { results, total: records.length || 0, loading, types };
}

// src/search/Search.jsx
import React12 from "react";
function Search(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return /* @__PURE__ */ React12.createElement("div", { "data-canopy-search": "1" }, /* @__PURE__ */ React12.createElement("script", { type: "application/json", dangerouslySetInnerHTML: { __html: json } }));
}
export {
  Card,
  Fallback,
  HelloWorld,
  Search,
  MdxSearchForm as SearchForm,
  SearchForm as SearchFormUI,
  MdxSearchResults as SearchResults,
  SearchResults as SearchResultsUI,
  SearchSummary,
  SearchTotal,
  TestFile,
  Viewer,
  useSearch
};
//# sourceMappingURL=index.js.map
