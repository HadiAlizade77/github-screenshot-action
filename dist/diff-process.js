require('./sourcemap-register.js');module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 9417:
/***/ ((module) => {

"use strict";

module.exports = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    if(a===b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}


/***/ }),

/***/ 3717:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var concatMap = __nccwpck_require__(6891);
var balanced = __nccwpck_require__(9417);

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}



/***/ }),

/***/ 6891:
/***/ ((module) => {

module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};


/***/ }),

/***/ 6863:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = realpath
realpath.realpath = realpath
realpath.sync = realpathSync
realpath.realpathSync = realpathSync
realpath.monkeypatch = monkeypatch
realpath.unmonkeypatch = unmonkeypatch

var fs = __nccwpck_require__(5747)
var origRealpath = fs.realpath
var origRealpathSync = fs.realpathSync

var version = process.version
var ok = /^v[0-5]\./.test(version)
var old = __nccwpck_require__(1734)

function newError (er) {
  return er && er.syscall === 'realpath' && (
    er.code === 'ELOOP' ||
    er.code === 'ENOMEM' ||
    er.code === 'ENAMETOOLONG'
  )
}

function realpath (p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb)
  }

  if (typeof cache === 'function') {
    cb = cache
    cache = null
  }
  origRealpath(p, cache, function (er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb)
    } else {
      cb(er, result)
    }
  })
}

function realpathSync (p, cache) {
  if (ok) {
    return origRealpathSync(p, cache)
  }

  try {
    return origRealpathSync(p, cache)
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache)
    } else {
      throw er
    }
  }
}

function monkeypatch () {
  fs.realpath = realpath
  fs.realpathSync = realpathSync
}

function unmonkeypatch () {
  fs.realpath = origRealpath
  fs.realpathSync = origRealpathSync
}


/***/ }),

/***/ 1734:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var pathModule = __nccwpck_require__(5622);
var isWindows = process.platform === 'win32';
var fs = __nccwpck_require__(5747);

// JavaScript implementation of realpath, ported from node pre-v6

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  var callback;
  if (DEBUG) {
    var backtrace = new Error;
    callback = debugCallback;
  } else
    callback = missingCallback;

  return callback;

  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }

  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
      else if (!process.noDeprecation) {
        var msg = 'fs: missing callback ' + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

var normalize = pathModule.normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

exports.realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link.  no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs.statSync(base);
        linkTarget = fs.readlinkSync(base);
      }
      resolvedLink = pathModule.resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


exports.realpath = function realpath(p, cache, cb) {
  if (typeof cb !== 'function') {
    cb = maybeCallback(cache);
    cache = null;
  }

  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  function LOOP() {
    // stop if scanned past end of path
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }

    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      return process.nextTick(LOOP);
    }

    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // known symbolic link.  no need to stat again.
      return gotResolvedLink(cache[base]);
    }

    return fs.lstat(base, gotStat);
  }

  function gotStat(err, stat) {
    if (err) return cb(err);

    // if not a symlink, skip to the next path part
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }

    // stat & read the link if not read before
    // call gotTarget as soon as the link target is known
    // dev/ino always return 0 on windows, so skip the check.
    if (!isWindows) {
      var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs.stat(base, function(err) {
      if (err) return cb(err);

      fs.readlink(base, function(err, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err, target);
      });
    });
  }

  function gotTarget(err, target, base) {
    if (err) return cb(err);

    var resolvedLink = pathModule.resolve(previous, target);
    if (cache) cache[base] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }

  function gotResolvedLink(resolvedLink) {
    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }
};


/***/ }),

/***/ 8445:
/***/ ((module) => {

"use strict";

var stdin = process.stdin;

module.exports = function () {
	var ret = '';

	return new Promise(function (resolve) {
		if (stdin.isTTY) {
			resolve(ret);
			return;
		}

		stdin.setEncoding('utf8');

		stdin.on('readable', function () {
			var chunk;

			while ((chunk = stdin.read())) {
				ret += chunk;
			}
		});

		stdin.on('end', function () {
			resolve(ret);
		});
	});
};

module.exports.buffer = function () {
	var ret = [];
	var len = 0;

	return new Promise(function (resolve) {
		if (stdin.isTTY) {
			resolve(new Buffer(''));
			return;
		}

		stdin.on('readable', function () {
			var chunk;

			while ((chunk = stdin.read())) {
				ret.push(chunk);
				len += chunk.length;
			}
		});

		stdin.on('end', function () {
			resolve(Buffer.concat(ret, len));
		});
	});
};


/***/ }),

/***/ 7625:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

exports.setopts = setopts
exports.ownProp = ownProp
exports.makeAbs = makeAbs
exports.finish = finish
exports.mark = mark
exports.isIgnored = isIgnored
exports.childrenIgnored = childrenIgnored

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

var path = __nccwpck_require__(5622)
var minimatch = __nccwpck_require__(3973)
var isAbsolute = __nccwpck_require__(8714)
var Minimatch = minimatch.Minimatch

function alphasort (a, b) {
  return a.localeCompare(b, 'en')
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || []

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore]

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap)
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
    gmatcher = new Minimatch(gpattern, { dot: true })
  }

  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {}

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern
  }

  self.silent = !!options.silent
  self.pattern = pattern
  self.strict = options.strict !== false
  self.realpath = !!options.realpath
  self.realpathCache = options.realpathCache || Object.create(null)
  self.follow = !!options.follow
  self.dot = !!options.dot
  self.mark = !!options.mark
  self.nodir = !!options.nodir
  if (self.nodir)
    self.mark = true
  self.sync = !!options.sync
  self.nounique = !!options.nounique
  self.nonull = !!options.nonull
  self.nosort = !!options.nosort
  self.nocase = !!options.nocase
  self.stat = !!options.stat
  self.noprocess = !!options.noprocess
  self.absolute = !!options.absolute

  self.maxLength = options.maxLength || Infinity
  self.cache = options.cache || Object.create(null)
  self.statCache = options.statCache || Object.create(null)
  self.symlinks = options.symlinks || Object.create(null)

  setupIgnores(self, options)

  self.changedCwd = false
  var cwd = process.cwd()
  if (!ownProp(options, "cwd"))
    self.cwd = cwd
  else {
    self.cwd = path.resolve(options.cwd)
    self.changedCwd = self.cwd !== cwd
  }

  self.root = options.root || path.resolve(self.cwd, "/")
  self.root = path.resolve(self.root)
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/")

  // TODO: is an absolute `cwd` supposed to be resolved against `root`?
  // e.g. { cwd: '/test', root: __dirname } === path.join(__dirname, '/test')
  self.cwdAbs = isAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd)
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/")
  self.nomount = !!options.nomount

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true
  options.nocomment = true

  self.minimatch = new Minimatch(pattern, options)
  self.options = self.minimatch.options
}

function finish (self) {
  var nou = self.nounique
  var all = nou ? [] : Object.create(null)

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i]
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i]
        if (nou)
          all.push(literal)
        else
          all[literal] = true
      }
    } else {
      // had matches
      var m = Object.keys(matches)
      if (nou)
        all.push.apply(all, m)
      else
        m.forEach(function (m) {
          all[m] = true
        })
    }
  }

  if (!nou)
    all = Object.keys(all)

  if (!self.nosort)
    all = all.sort(alphasort)

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i])
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        var notDir = !(/\/$/.test(e))
        var c = self.cache[e] || self.cache[makeAbs(self, e)]
        if (notDir && c)
          notDir = c !== 'DIR' && !Array.isArray(c)
        return notDir
      })
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    })

  self.found = all
}

function mark (self, p) {
  var abs = makeAbs(self, p)
  var c = self.cache[abs]
  var m = p
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c)
    var slash = p.slice(-1) === '/'

    if (isDir && !slash)
      m += '/'
    else if (!isDir && slash)
      m = m.slice(0, -1)

    if (m !== p) {
      var mabs = makeAbs(self, m)
      self.statCache[mabs] = self.statCache[abs]
      self.cache[mabs] = self.cache[abs]
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f)
  } else if (isAbsolute(f) || f === '') {
    abs = f
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f)
  } else {
    abs = path.resolve(f)
  }

  if (process.platform === 'win32')
    abs = abs.replace(/\\/g, '/')

  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}


/***/ }),

/***/ 1957:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

module.exports = glob

var fs = __nccwpck_require__(5747)
var rp = __nccwpck_require__(6863)
var minimatch = __nccwpck_require__(3973)
var Minimatch = minimatch.Minimatch
var inherits = __nccwpck_require__(4124)
var EE = __nccwpck_require__(8614).EventEmitter
var path = __nccwpck_require__(5622)
var assert = __nccwpck_require__(2357)
var isAbsolute = __nccwpck_require__(8714)
var globSync = __nccwpck_require__(9010)
var common = __nccwpck_require__(7625)
var setopts = common.setopts
var ownProp = common.ownProp
var inflight = __nccwpck_require__(2492)
var util = __nccwpck_require__(1669)
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

var once = __nccwpck_require__(1223)

function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {}
  if (!options) options = {}

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return globSync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = globSync
var GlobSync = glob.GlobSync = globSync.GlobSync

// old api surface
glob.glob = glob

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add)
  var i = keys.length
  while (i--) {
    origin[keys[i]] = add[keys[i]]
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_)
  options.noprocess = true

  var g = new Glob(pattern, options)
  var set = g.minimatch.set

  if (!pattern)
    return false

  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
}

glob.Glob = Glob
inherits(Glob, EE)
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts(this, pattern, options)
  this._didRealPath = false

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n)

  if (typeof cb === 'function') {
    cb = once(cb)
    this.on('error', cb)
    this.on('end', function (matches) {
      cb(null, matches)
    })
  }

  var self = this
  this._processing = 0

  this._emitQueue = []
  this._processQueue = []
  this.paused = false

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  var sync = true
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done)
  }
  sync = false

  function done () {
    --self._processing
    if (self._processing <= 0) {
      if (sync) {
        process.nextTick(function () {
          self._finish()
        })
      } else {
        self._finish()
      }
    }
  }
}

Glob.prototype._finish = function () {
  assert(this instanceof Glob)
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this)
  this.emit('end', this.found)
}

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true

  var n = this.matches.length
  if (n === 0)
    return this._finish()

  var self = this
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next)

  function next () {
    if (--n === 0)
      self._finish()
  }
}

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index]
  if (!matchset)
    return cb()

  var found = Object.keys(matchset)
  var self = this
  var n = found.length

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null)
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p)
    rp.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true
      else if (er.syscall === 'stat')
        set[p] = true
      else
        self.emit('error', er) // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set
        cb()
      }
    })
  })
}

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
}

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

Glob.prototype.abort = function () {
  this.aborted = true
  this.emit('abort')
}

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume')
    this.paused = false
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0)
      this._emitQueue.length = 0
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i]
        this._emitMatch(e[0], e[1])
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0)
      this._processQueue.length = 0
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i]
        this._processing--
        this._process(p[0], p[1], p[2], p[3])
      }
    }
  }
}

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob)
  assert(typeof cb === 'function')

  if (this.aborted)
    return

  this._processing++
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb])
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip _processing
  if (childrenIgnored(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
}

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e
      else
        e = prefix + e
    }
    this._process([e].concat(remain), index, inGlobStar, cb)
  }
  cb()
}

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (isIgnored(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e])
    return
  }

  var abs = isAbsolute(e) ? e : this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute)
    e = abs

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  var st = this.statCache[abs]
  if (st)
    this.emit('stat', e, st)

  this.emit('match', e)
}

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs
  var self = this
  var lstatcb = inflight(lstatkey, lstatcb_)

  if (lstatcb)
    fs.lstat(abs, lstatcb)

  function lstatcb_ (er, lstat) {
    if (er && er.code === 'ENOENT')
      return cb()

    var isSym = lstat && lstat.isSymbolicLink()
    self.symlinks[abs] = isSym

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && lstat && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE'
      cb()
    } else
      self._readdir(abs, false, cb)
  }
}

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }

  var self = this
  fs.readdir(abs, readdirCb(this, abs, cb))
}

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb)
    else
      self._readdirEntries(abs, entries, cb)
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries
  return cb(null, entries)
}

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        this.emit('error', error)
        this.abort()
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict) {
        this.emit('error', er)
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort()
      }
      if (!this.silent)
        console.error('glob error', er)
      break
  }

  return cb()
}

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb)

  var isSym = this.symlinks[abs]
  var len = entries.length

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true, cb)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true, cb)
  }

  cb()
}

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb)
  })
}
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
  cb()
}

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE'
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this
  var statcb = inflight('stat\0' + abs, lstatcb_)
  if (statcb)
    fs.lstat(abs, statcb)

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb)
        else
          self._stat2(f, abs, er, stat, cb)
      })
    } else {
      self._stat2(f, abs, er, lstat, cb)
    }
  }
}

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
    this.statCache[abs] = false
    return cb()
  }

  var needDir = f.slice(-1) === '/'
  this.statCache[abs] = stat

  if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
    return cb(null, false, stat)

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return cb()

  return cb(null, c, stat)
}


/***/ }),

/***/ 9010:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = globSync
globSync.GlobSync = GlobSync

var fs = __nccwpck_require__(5747)
var rp = __nccwpck_require__(6863)
var minimatch = __nccwpck_require__(3973)
var Minimatch = minimatch.Minimatch
var Glob = __nccwpck_require__(1957).Glob
var util = __nccwpck_require__(1669)
var path = __nccwpck_require__(5622)
var assert = __nccwpck_require__(2357)
var isAbsolute = __nccwpck_require__(8714)
var common = __nccwpck_require__(7625)
var setopts = common.setopts
var ownProp = common.ownProp
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts(this, pattern, options)

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length
  this.matches = new Array(n)
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false)
  }
  this._finish()
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync)
  if (this.realpath) {
    var self = this
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null)
      for (var p in matchset) {
        try {
          p = self._makeAbs(p)
          var real = rp.realpathSync(p, self.realpathCache)
          set[real] = true
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true
          else
            throw er
        }
      }
    })
  }
  common.finish(this)
}


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip processing
  if (childrenIgnored(this, read))
    return

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
}


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar)

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix)
      newPattern = [prefix, e]
    else
      newPattern = [e]
    this._process(newPattern.concat(remain), index, inGlobStar)
  }
}


GlobSync.prototype._emitMatch = function (index, e) {
  if (isIgnored(this, e))
    return

  var abs = this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute) {
    e = abs
  }

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  if (this.stat)
    this._stat(e)
}


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries
  var lstat
  var stat
  try {
    lstat = fs.lstatSync(abs)
  } catch (er) {
    if (er.code === 'ENOENT') {
      // lstat failed, doesn't exist
      return null
    }
  }

  var isSym = lstat && lstat.isSymbolicLink()
  this.symlinks[abs] = isSym

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && lstat && !lstat.isDirectory())
    this.cache[abs] = 'FILE'
  else
    entries = this._readdir(abs, false)

  return entries
}

GlobSync.prototype._readdir = function (abs, inGlobStar) {
  var entries

  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er)
    return null
  }
}

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries

  // mark and cache dir-ness
  return entries
}

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er)
      break
  }
}

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false)

  var len = entries.length
  var isSym = this.symlinks[abs]

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true)
  }
}

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
}

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (!stat) {
    var lstat
    try {
      lstat = fs.lstatSync(abs)
    } catch (er) {
      if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false
        return false
      }
    }

    if (lstat && lstat.isSymbolicLink()) {
      try {
        stat = fs.statSync(abs)
      } catch (er) {
        stat = lstat
      }
    } else {
      stat = lstat
    }
  }

  this.statCache[abs] = stat

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'

  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return false

  return c
}

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
}

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}


/***/ }),

/***/ 1628:
/***/ ((module) => {

// Calculate Gaussian blur of an image using IIR filter
// The method is taken from Intel's white paper and code example attached to it:
// https://software.intel.com/en-us/articles/iir-gaussian-blur-filter
// -implementation-using-intel-advanced-vector-extensions

var a0, a1, a2, a3, b1, b2, left_corner, right_corner;

function gaussCoef(sigma) {
  if (sigma < 0.5) {
    sigma = 0.5;
  }

  var a = Math.exp(0.726 * 0.726) / sigma,
      g1 = Math.exp(-a),
      g2 = Math.exp(-2 * a),
      k = (1 - g1) * (1 - g1) / (1 + 2 * a * g1 - g2);

  a0 = k;
  a1 = k * (a - 1) * g1;
  a2 = k * (a + 1) * g1;
  a3 = -k * g2;
  b1 = 2 * g1;
  b2 = -g2;
  left_corner = (a0 + a1) / (1 - b1 - b2);
  right_corner = (a2 + a3) / (1 - b1 - b2);

  // Attempt to force type to FP32.
  return new Float32Array([ a0, a1, a2, a3, b1, b2, left_corner, right_corner ]);
}

function convolveRGBA(src, out, line, coeff, width, height) {
  // takes src image and writes the blurred and transposed result into out

  var rgba;
  var prev_src_r, prev_src_g, prev_src_b, prev_src_a;
  var curr_src_r, curr_src_g, curr_src_b, curr_src_a;
  var curr_out_r, curr_out_g, curr_out_b, curr_out_a;
  var prev_out_r, prev_out_g, prev_out_b, prev_out_a;
  var prev_prev_out_r, prev_prev_out_g, prev_prev_out_b, prev_prev_out_a;

  var src_index, out_index, line_index;
  var i, j;
  var coeff_a0, coeff_a1, coeff_b1, coeff_b2;

  for (i = 0; i < height; i++) {
    src_index = i * width;
    out_index = i;
    line_index = 0;

    // left to right
    rgba = src[src_index];

    prev_src_r = rgba & 0xff;
    prev_src_g = (rgba >> 8) & 0xff;
    prev_src_b = (rgba >> 16) & 0xff;
    prev_src_a = (rgba >> 24) & 0xff;

    prev_prev_out_r = prev_src_r * coeff[6];
    prev_prev_out_g = prev_src_g * coeff[6];
    prev_prev_out_b = prev_src_b * coeff[6];
    prev_prev_out_a = prev_src_a * coeff[6];

    prev_out_r = prev_prev_out_r;
    prev_out_g = prev_prev_out_g;
    prev_out_b = prev_prev_out_b;
    prev_out_a = prev_prev_out_a;

    coeff_a0 = coeff[0];
    coeff_a1 = coeff[1];
    coeff_b1 = coeff[4];
    coeff_b2 = coeff[5];

    for (j = 0; j < width; j++) {
      rgba = src[src_index];
      curr_src_r = rgba & 0xff;
      curr_src_g = (rgba >> 8) & 0xff;
      curr_src_b = (rgba >> 16) & 0xff;
      curr_src_a = (rgba >> 24) & 0xff;

      curr_out_r = curr_src_r * coeff_a0 + prev_src_r * coeff_a1 + prev_out_r * coeff_b1 + prev_prev_out_r * coeff_b2;
      curr_out_g = curr_src_g * coeff_a0 + prev_src_g * coeff_a1 + prev_out_g * coeff_b1 + prev_prev_out_g * coeff_b2;
      curr_out_b = curr_src_b * coeff_a0 + prev_src_b * coeff_a1 + prev_out_b * coeff_b1 + prev_prev_out_b * coeff_b2;
      curr_out_a = curr_src_a * coeff_a0 + prev_src_a * coeff_a1 + prev_out_a * coeff_b1 + prev_prev_out_a * coeff_b2;

      prev_prev_out_r = prev_out_r;
      prev_prev_out_g = prev_out_g;
      prev_prev_out_b = prev_out_b;
      prev_prev_out_a = prev_out_a;

      prev_out_r = curr_out_r;
      prev_out_g = curr_out_g;
      prev_out_b = curr_out_b;
      prev_out_a = curr_out_a;

      prev_src_r = curr_src_r;
      prev_src_g = curr_src_g;
      prev_src_b = curr_src_b;
      prev_src_a = curr_src_a;

      line[line_index] = prev_out_r;
      line[line_index + 1] = prev_out_g;
      line[line_index + 2] = prev_out_b;
      line[line_index + 3] = prev_out_a;
      line_index += 4;
      src_index++;
    }

    src_index--;
    line_index -= 4;
    out_index += height * (width - 1);

    // right to left
    rgba = src[src_index];

    prev_src_r = rgba & 0xff;
    prev_src_g = (rgba >> 8) & 0xff;
    prev_src_b = (rgba >> 16) & 0xff;
    prev_src_a = (rgba >> 24) & 0xff;

    prev_prev_out_r = prev_src_r * coeff[7];
    prev_prev_out_g = prev_src_g * coeff[7];
    prev_prev_out_b = prev_src_b * coeff[7];
    prev_prev_out_a = prev_src_a * coeff[7];

    prev_out_r = prev_prev_out_r;
    prev_out_g = prev_prev_out_g;
    prev_out_b = prev_prev_out_b;
    prev_out_a = prev_prev_out_a;

    curr_src_r = prev_src_r;
    curr_src_g = prev_src_g;
    curr_src_b = prev_src_b;
    curr_src_a = prev_src_a;

    coeff_a0 = coeff[2];
    coeff_a1 = coeff[3];

    for (j = width - 1; j >= 0; j--) {
      curr_out_r = curr_src_r * coeff_a0 + prev_src_r * coeff_a1 + prev_out_r * coeff_b1 + prev_prev_out_r * coeff_b2;
      curr_out_g = curr_src_g * coeff_a0 + prev_src_g * coeff_a1 + prev_out_g * coeff_b1 + prev_prev_out_g * coeff_b2;
      curr_out_b = curr_src_b * coeff_a0 + prev_src_b * coeff_a1 + prev_out_b * coeff_b1 + prev_prev_out_b * coeff_b2;
      curr_out_a = curr_src_a * coeff_a0 + prev_src_a * coeff_a1 + prev_out_a * coeff_b1 + prev_prev_out_a * coeff_b2;

      prev_prev_out_r = prev_out_r;
      prev_prev_out_g = prev_out_g;
      prev_prev_out_b = prev_out_b;
      prev_prev_out_a = prev_out_a;

      prev_out_r = curr_out_r;
      prev_out_g = curr_out_g;
      prev_out_b = curr_out_b;
      prev_out_a = curr_out_a;

      prev_src_r = curr_src_r;
      prev_src_g = curr_src_g;
      prev_src_b = curr_src_b;
      prev_src_a = curr_src_a;

      rgba = src[src_index];
      curr_src_r = rgba & 0xff;
      curr_src_g = (rgba >> 8) & 0xff;
      curr_src_b = (rgba >> 16) & 0xff;
      curr_src_a = (rgba >> 24) & 0xff;

      rgba = ((line[line_index] + prev_out_r) << 0) +
        ((line[line_index + 1] + prev_out_g) << 8) +
        ((line[line_index + 2] + prev_out_b) << 16) +
        ((line[line_index + 3] + prev_out_a) << 24);

      out[out_index] = rgba;

      src_index--;
      line_index -= 4;
      out_index -= height;
    }
  }
}


function blurRGBA(src, width, height, radius) {
  // Quick exit on zero radius
  if (!radius) { return; }

  // Unify input data type, to keep convolver calls isomorphic
  var src32 = new Uint32Array(src.buffer);

  var out      = new Uint32Array(src32.length),
      tmp_line = new Float32Array(Math.max(width, height) * 4);

  var coeff = gaussCoef(radius);

  convolveRGBA(src32, out, tmp_line, coeff, width, height, radius);
  convolveRGBA(out, src32, tmp_line, coeff, height, width, radius);
}

module.exports = blurRGBA;


/***/ }),

/***/ 2492:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var wrappy = __nccwpck_require__(2940)
var reqs = Object.create(null)
var once = __nccwpck_require__(1223)

module.exports = wrappy(inflight)

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb)
    return null
  } else {
    reqs[key] = [cb]
    return makeres(key)
  }
}

function makeres (key) {
  return once(function RES () {
    var cbs = reqs[key]
    var len = cbs.length
    var args = slice(arguments)

    // XXX It's somewhat ambiguous whether a new callback added in this
    // pass should be queued for later execution if something in the
    // list of callbacks throws, or if it should just be discarded.
    // However, it's such an edge case that it hardly matters, and either
    // choice is likely as surprising as the other.
    // As it happens, we do go ahead and schedule it for later execution.
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args)
      }
    } finally {
      if (cbs.length > len) {
        // added more in the interim.
        // de-zalgo, just in case, but don't call again.
        cbs.splice(0, len)
        process.nextTick(function () {
          RES.apply(null, args)
        })
      } else {
        delete reqs[key]
      }
    }
  })
}

function slice (args) {
  var length = args.length
  var array = []

  for (var i = 0; i < length; i++) array[i] = args[i]
  return array
}


/***/ }),

/***/ 4124:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

try {
  var util = __nccwpck_require__(1669);
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  module.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  module.exports = __nccwpck_require__(8544);
}


/***/ }),

/***/ 8544:
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ 3381:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = rimraf
rimraf.sync = rimrafSync

var assert = __nccwpck_require__(2357)
var path = __nccwpck_require__(5622)
var fs = __nccwpck_require__(5747)
var glob = undefined
try {
  glob = __nccwpck_require__(1957)
} catch (_err) {
  // treat glob as optional.
}
var _0666 = parseInt('666', 8)

var defaultGlobOpts = {
  nosort: true,
  silent: true
}

// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === "win32")

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  if (options.disableGlob !== true && glob === undefined) {
    throw Error('glob dependency not found, set `options.disableGlob = true` if intentional')
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  defaults(options)

  var busyTries = 0
  var errState = null
  var n = 0

  if (options.disableGlob || !glob.hasMagic(p))
    return afterGlob(null, [p])

  options.lstat(p, function (er, stat) {
    if (!er)
      return afterGlob(null, [p])

    glob(p, options.glob, afterGlob)
  })

  function next (er) {
    errState = errState || er
    if (--n === 0)
      cb(errState)
  }

  function afterGlob (er, results) {
    if (er)
      return cb(er)

    n = results.length
    if (n === 0)
      return cb()

    results.forEach(function (p) {
      rimraf_(p, options, function CB (er) {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout ++)
          }

          // already gone
          if (er.code === "ENOENT") er = null
        }

        timeout = 0
        next(er)
      })
    })
  }
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (er, st) {
    if (er && er.code === "ENOENT")
      return cb(null)

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === "EPERM" && isWindows)
      fixWinEPERM(p, options, er, cb)

    if (st && st.isDirectory())
      return rmdir(p, options, er, cb)

    options.unlink(p, function (er) {
      if (er) {
        if (er.code === "ENOENT")
          return cb(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        if (er.code === "EISDIR")
          return rmdir(p, options, er, cb)
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  options.chmod(p, _0666, function (er2) {
    if (er2)
      cb(er2.code === "ENOENT" ? null : er)
    else
      options.stat(p, function(er3, stats) {
        if (er3)
          cb(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(p, options, er, cb)
        else
          options.unlink(p, cb)
      })
  })
}

function fixWinEPERMSync (p, options, er) {
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  try {
    options.chmodSync(p, _0666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

function rmkids(p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (er, files) {
    if (er)
      return cb(er)
    var n = files.length
    if (n === 0)
      return options.rmdir(p, cb)
    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (er) {
        if (errState)
          return
        if (er)
          return cb(errState = er)
        if (--n === 0)
          options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      options.lstatSync(p)
      results = [p]
    } catch (er) {
      results = glob.sync(p, options.glob)
    }
  }

  if (!results.length)
    return

  for (var i = 0; i < results.length; i++) {
    var p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return

      // Windows can EPERM on stat.  Life is suffering.
      if (er.code === "EPERM" && isWindows)
        fixWinEPERMSync(p, options, er)
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er

      rmdirSync(p, options, er)
    }
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })

  // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.
  var retries = isWindows ? 100 : 1
  var i = 0
  do {
    var threw = true
    try {
      var ret = options.rmdirSync(p, options)
      threw = false
      return ret
    } finally {
      if (++i < retries && threw)
        continue
    }
  } while (true)
}


/***/ }),

/***/ 6816:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __nccwpck_require__) => {

/*
 * Copyright (c) 2018 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const fs = __nccwpck_require__(5747);

const getStdin = __nccwpck_require__(8445);

const { diffImageToSnapshot } = __nccwpck_require__(7071);

getStdin.buffer().then((buffer) => {
  try {
    const options = JSON.parse(buffer);

    options.receivedImageBuffer = Buffer.from(options.receivedImageBuffer, 'base64');

    const result = diffImageToSnapshot(options);

    fs.writeSync(3, Buffer.from(JSON.stringify(result)));

    process.exit(0);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }
});


/***/ }),

/***/ 7071:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*
 * Copyright (c) 2017 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const childProcess = __nccwpck_require__(3129);
const fs = __nccwpck_require__(5747);
const path = __nccwpck_require__(5622);
const mkdirp = __nccwpck_require__(6186);
const pixelmatch = __nccwpck_require__(6097);
const ssim = __nccwpck_require__(3555);
const { PNG } = __nccwpck_require__(6413);
const rimraf = __nccwpck_require__(3381);
const glur = __nccwpck_require__(1628);
const ImageComposer = __nccwpck_require__(2014);

/**
 * Helper function to create reusable image resizer
 */
const createImageResizer = (width, height) => (source) => {
  const resized = new PNG({ width, height, fill: true });
  PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
  return resized;
};

/**
 * Fills diff area with black transparent color for meaningful diff
 */
/* eslint-disable no-plusplus, no-param-reassign, no-bitwise */
const fillSizeDifference = (width, height) => (image) => {
  const inArea = (x, y) => y > height || x > width;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y)) {
        const idx = ((image.width * y) + x) << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }
  return image;
};
/* eslint-enabled */
/**
 * This was originally embedded in diffImageToSnapshot
 * when it only worked with pixelmatch.  It has a default
 * threshold of 0.01 defined in terms of what it means to pixelmatch.
 * It has been moved here as part of the SSIM implementation to make it
 * a little easier to read and find.
 * More information about this can be found under the options section listed
 * in https://github.com/mapbox/pixelmatch/README.md and in the original pixelmatch
 * code.  There is also some documentation on this in our README.md under the
 * customDiffConfig option.
 * @type {{threshold: number}}
 */
const defaultPixelmatchDiffConfig = {
  threshold: 0.01,
};
/**
 * This is the default SSIM diff configuration
 * for the jest-image-snapshot's use of the ssim.js
 * library.  Bezkrovny is a specific SSIM algorithm optimized
 * for speed by downsampling the origin image into a smaller image.
 * For the small loss in precision, it is roughly 9x faster than the
 * SSIM preset 'fast' -- which is modeled after the original SSIM whitepaper.
 * Wang, et al. 2004 on "Image Quality Assessment: From Error Visibility to Structural Similarity"
 * (https://github.com/obartra/ssim/blob/master/assets/ssim.pdf)
 * Most users will never need or want to change this -- unless --
 * they want to get a better quality generated diff.
 * @type {{ssim: string}}
 */
const defaultSSIMDiffConfig = { ssim: 'bezkrovny' };

/**
 * Helper function for SSIM comparison that allows us to use the existing diff
 * config that works with jest-image-snapshot to pass parameters
 * that will work with SSIM.  It also transforms the parameters to match the spec
 * required by the SSIM library.
 */
const ssimMatch = (
  newImageData,
  baselineImageData,
  diffImageData,
  imageWidth,
  imageHeight,
  diffConfig
) => {
  const newImage = { data: newImageData, width: imageWidth, height: imageHeight };
  const baselineImage = { data: baselineImageData, width: imageWidth, height: imageHeight };
  // eslint-disable-next-line camelcase
  const { ssim_map, mssim } = ssim.ssim(newImage, baselineImage, diffConfig);
  // Converts the SSIM value to different pixels based on image width and height
  // conforms to how pixelmatch works.
  const diffPixels = (1 - mssim) * imageWidth * imageHeight;
  const diffRgbaPixels = new DataView(diffImageData.buffer, diffImageData.byteOffset);
  for (let ln = 0; ln !== imageHeight; ++ln) {
    for (let pos = 0; pos !== imageWidth; ++pos) {
      const rpos = (ln * imageWidth) + pos;
      // initial value is transparent.  We'll add in the SSIM offset.
      // red (ff) green (00) blue (00) alpha (00)
      const diffValue = 0xff000000 + Math.floor(0xff *
        (1 - ssim_map.data[
          // eslint-disable-next-line no-mixed-operators
          (ssim_map.width * Math.round(ssim_map.height * ln / imageHeight)) +
          // eslint-disable-next-line no-mixed-operators
          Math.round(ssim_map.width * pos / imageWidth)]));
      diffRgbaPixels.setUint32(rpos * 4, diffValue);
    }
  }
  return diffPixels;
};

/**
 * Aligns images sizes to biggest common value
 * and fills new pixels with transparent pixels
 */
const alignImagesToSameSize = (firstImage, secondImage) => {
  // Keep original sizes to fill extended area later
  const firstImageWidth = firstImage.width;
  const firstImageHeight = firstImage.height;
  const secondImageWidth = secondImage.width;
  const secondImageHeight = secondImage.height;
  // Calculate biggest common values
  const resizeToSameSize = createImageResizer(
    Math.max(firstImageWidth, secondImageWidth),
    Math.max(firstImageHeight, secondImageHeight)
  );
  // Resize both images
  const resizedFirst = resizeToSameSize(firstImage);
  const resizedSecond = resizeToSameSize(secondImage);
  // Fill resized area with black transparent pixels
  return [
    fillSizeDifference(firstImageWidth, firstImageHeight)(resizedFirst),
    fillSizeDifference(secondImageWidth, secondImageHeight)(resizedSecond),
  ];
};

const isFailure = ({ pass, updateSnapshot }) => !pass && !updateSnapshot;

const shouldUpdate = ({ pass, updateSnapshot, updatePassedSnapshot }) => (
  (!pass && updateSnapshot) || (pass && updatePassedSnapshot)
);

const shouldFail = ({
  totalPixels,
  diffPixelCount,
  hasSizeMismatch,
  allowSizeMismatch,
  failureThresholdType,
  failureThreshold,
}) => {
  let pass = false;
  let diffSize = false;
  const diffRatio = diffPixelCount / totalPixels;
  if (hasSizeMismatch) {
    // do not fail if allowSizeMismatch is set
    pass = allowSizeMismatch;
    diffSize = true;
  }
  if (!diffSize || pass === true) {
    if (failureThresholdType === 'pixel') {
      pass = diffPixelCount <= failureThreshold;
    } else if (failureThresholdType === 'percent') {
      pass = diffRatio <= failureThreshold;
    } else {
      throw new Error(`Unknown failureThresholdType: ${failureThresholdType}. Valid options are "pixel" or "percent".`);
    }
  }
  return {
    pass,
    diffSize,
    diffRatio,
  };
};

function diffImageToSnapshot(options) {
  const {
    receivedImageBuffer,
    snapshotIdentifier,
    snapshotsDir,
    diffDir,
    diffDirection,
    updateSnapshot = false,
    updatePassedSnapshot = false,
    customDiffConfig = {},
    failureThreshold,
    failureThresholdType,
    blur,
    allowSizeMismatch = false,
    comparisonMethod = 'pixelmatch',
  } = options;

  const comparisonFn = comparisonMethod === 'ssim' ? ssimMatch : pixelmatch;
  let result = {};
  const baselineSnapshotPath = path.join(snapshotsDir, `${snapshotIdentifier}-snap.png`);
  if (!fs.existsSync(baselineSnapshotPath)) {
    mkdirp.sync(path.dirname(baselineSnapshotPath));
    fs.writeFileSync(baselineSnapshotPath, receivedImageBuffer);
    result = { added: true };
  } else {
    const diffOutputPath = path.join(diffDir, `${snapshotIdentifier}-diff.png`);
    rimraf.sync(diffOutputPath);

    const defaultDiffConfig = comparisonMethod !== 'ssim' ? defaultPixelmatchDiffConfig : defaultSSIMDiffConfig;

    const diffConfig = Object.assign({}, defaultDiffConfig, customDiffConfig);

    const rawReceivedImage = PNG.sync.read(receivedImageBuffer);
    const rawBaselineImage = PNG.sync.read(fs.readFileSync(baselineSnapshotPath));
    const hasSizeMismatch = (
      rawReceivedImage.height !== rawBaselineImage.height ||
      rawReceivedImage.width !== rawBaselineImage.width
    );
    const imageDimensions = {
      receivedHeight: rawReceivedImage.height,
      receivedWidth: rawReceivedImage.width,
      baselineHeight: rawBaselineImage.height,
      baselineWidth: rawBaselineImage.width,
    };
    // Align images in size if different
    const [receivedImage, baselineImage] = hasSizeMismatch
      ? alignImagesToSameSize(rawReceivedImage, rawBaselineImage)
      : [rawReceivedImage, rawBaselineImage];
    const imageWidth = receivedImage.width;
    const imageHeight = receivedImage.height;

    if (typeof blur === 'number' && blur > 0) {
      glur(receivedImage.data, imageWidth, imageHeight, blur);
      glur(baselineImage.data, imageWidth, imageHeight, blur);
    }

    const diffImage = new PNG({ width: imageWidth, height: imageHeight });

    let diffPixelCount = 0;

    diffPixelCount = comparisonFn(
      receivedImage.data,
      baselineImage.data,
      diffImage.data,
      imageWidth,
      imageHeight,
      diffConfig
    );

    const totalPixels = imageWidth * imageHeight;

    const {
      pass,
      diffSize,
      diffRatio,
    } = shouldFail({
      totalPixels,
      diffPixelCount,
      hasSizeMismatch,
      allowSizeMismatch,
      failureThresholdType,
      failureThreshold,
    });

    if (isFailure({ pass, updateSnapshot })) {
      mkdirp.sync(path.dirname(diffOutputPath));
      const composer = new ImageComposer({
        direction: diffDirection,
      });

      composer.addImage(baselineImage, imageWidth, imageHeight);
      composer.addImage(diffImage, imageWidth, imageHeight);
      composer.addImage(receivedImage, imageWidth, imageHeight);

      const composerParams = composer.getParams();

      const compositeResultImage = new PNG({
        width: composerParams.compositeWidth,
        height: composerParams.compositeHeight,
      });

      // copy baseline, diff, and received images into composite result image
      composerParams.images.forEach((image, index) => {
        PNG.bitblt(
          image.imageData, compositeResultImage, 0, 0, image.imageWidth, image.imageHeight,
          composerParams.offsetX * index, composerParams.offsetY * index
        );
      });
      // Set filter type to Paeth to avoid expensive auto scanline filter detection
      // For more information see https://www.w3.org/TR/PNG-Filters.html
      const pngBuffer = PNG.sync.write(compositeResultImage, { filterType: 4 });
      fs.writeFileSync(diffOutputPath, pngBuffer);

      result = {
        pass: false,
        diffSize,
        imageDimensions,
        diffOutputPath,
        diffRatio,
        diffPixelCount,
        imgSrcString: `data:image/png;base64,${pngBuffer.toString('base64')}`,
      };
    } else if (shouldUpdate({ pass, updateSnapshot, updatePassedSnapshot })) {
      mkdirp.sync(path.dirname(baselineSnapshotPath));
      fs.writeFileSync(baselineSnapshotPath, receivedImageBuffer);
      result = { updated: true };
    } else {
      result = {
        pass,
        diffSize,
        diffRatio,
        diffPixelCount,
        diffOutputPath,
      };
    }
  }
  return result;
}

function runDiffImageToSnapshot(options) {
  options.receivedImageBuffer = options.receivedImageBuffer.toString('base64');

  const serializedInput = JSON.stringify(options);

  let result = {};

  const writeDiffProcess = childProcess.spawnSync(
    process.execPath, [__nccwpck_require__.ab + "diff-process1.js"],
    {
      input: Buffer.from(serializedInput),
      stdio: ['pipe', 'inherit', 'inherit', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    }
  );

  if (writeDiffProcess.status === 0) {
    const output = writeDiffProcess.output[3].toString();
    result = JSON.parse(output);
  } else {
    throw new Error(`Error running image diff: ${(writeDiffProcess.error && writeDiffProcess.error.message) || 'Unknown Error'}`);
  }

  return result;
}

module.exports = {
  diffImageToSnapshot,
  runDiffImageToSnapshot,
};


/***/ }),

/***/ 2014:
/***/ ((module) => {

/*
 * Copyright (c) 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const getMaxImageSize = (images) => {
  let maxWidth = 0;
  let maxHeight = 0;

  images.forEach((image) => {
    if (image.imageWidth > maxWidth) {
      maxWidth = image.imageWidth;
    }

    if (image.imageHeight > maxHeight) {
      maxHeight = image.imageHeight;
    }
  });

  return {
    maxWidth,
    maxHeight,
  };
};

const ImageComposer = function ImageComposer(options = {}) {
  this.direction = options.direction || 'horizontal';
  this.images = [];

  return this;
};

ImageComposer.prototype.addImage = function addImage(imageData, imageWidth, imageHeight) {
  this.images.push({
    imageData,
    imageWidth,
    imageHeight,
  });

  return this;
};

ImageComposer.prototype.getParams = function getParams() {
  const { maxWidth, maxHeight } = getMaxImageSize(this.images);

  const compositeWidth = maxWidth * (this.direction === 'horizontal' ? this.images.length : 1);
  const compositeHeight = maxHeight * (this.direction === 'vertical' ? this.images.length : 1);
  const offsetX = this.direction === 'horizontal' ? maxWidth : 0;
  const offsetY = this.direction === 'vertical' ? maxHeight : 0;

  return {
    direction: this.direction,
    images: this.images,
    imagesCount: this.images.length,
    compositeWidth,
    compositeHeight,
    offsetX,
    offsetY,
  };
};

module.exports = ImageComposer;


/***/ }),

/***/ 3973:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = __nccwpck_require__(5622)
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = __nccwpck_require__(3717)

var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
}

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        var pl = patternListStack.pop()
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close
        if (pl.type === '!') {
          negativeLists.push(pl)
        }
        pl.reEnd = re.length
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length)
    this.debug('setting tail', re, pl)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail, pl, re)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  try {
    var regExp = new RegExp('^' + re + '$', flags)
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}


/***/ }),

/***/ 6186:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var path = __nccwpck_require__(5622);
var fs = __nccwpck_require__(5747);
var _0777 = parseInt('0777', 8);

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                if (path.dirname(p) === p) return cb(er);
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};


/***/ }),

/***/ 1223:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var wrappy = __nccwpck_require__(2940)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),

/***/ 8714:
/***/ ((module) => {

"use strict";


function posix(path) {
	return path.charAt(0) === '/';
}

function win32(path) {
	// https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
	var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
	var result = splitDeviceRe.exec(path);
	var device = result[1] || '';
	var isUnc = Boolean(device && device.charAt(1) !== ':');

	// UNC paths are always absolute
	return Boolean(result[2] || isUnc);
}

module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;


/***/ }),

/***/ 6097:
/***/ ((module) => {

"use strict";


module.exports = pixelmatch;

const defaultOptions = {
    threshold: 0.1,         // matching threshold (0 to 1); smaller is more sensitive
    includeAA: false,       // whether to skip anti-aliasing detection
    alpha: 0.1,             // opacity of original image in diff ouput
    aaColor: [255, 255, 0], // color of anti-aliased pixels in diff output
    diffColor: [255, 0, 0], // color of different pixels in diff output
    diffColorAlt: null,     // whether to detect dark on light differences between img1 and img2 and set an alternative color to differentiate between the two
    diffMask: false         // draw the diff over a transparent background (a mask)
};

function pixelmatch(img1, img2, output, width, height, options) {

    if (!isPixelData(img1) || !isPixelData(img2) || (output && !isPixelData(output)))
        throw new Error('Image data: Uint8Array, Uint8ClampedArray or Buffer expected.');

    if (img1.length !== img2.length || (output && output.length !== img1.length))
        throw new Error('Image sizes do not match.');

    if (img1.length !== width * height * 4) throw new Error('Image data size does not match width/height.');

    options = Object.assign({}, defaultOptions, options);

    // check if images are identical
    const len = width * height;
    const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
    const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
    let identical = true;

    for (let i = 0; i < len; i++) {
        if (a32[i] !== b32[i]) { identical = false; break; }
    }
    if (identical) { // fast path if identical
        if (output && !options.diffMask) {
            for (let i = 0; i < len; i++) drawGrayPixel(img1, 4 * i, options.alpha, output);
        }
        return 0;
    }

    // maximum acceptable square distance between two colors;
    // 35215 is the maximum possible value for the YIQ difference metric
    const maxDelta = 35215 * options.threshold * options.threshold;
    let diff = 0;

    // compare each pixel of one image against the other one
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const pos = (y * width + x) * 4;

            // squared YUV distance between colors at this pixel position, negative if the img2 pixel is darker
            const delta = colorDelta(img1, img2, pos, pos);

            // the color difference is above the threshold
            if (Math.abs(delta) > maxDelta) {
                // check it's a real rendering difference or just anti-aliasing
                if (!options.includeAA && (antialiased(img1, x, y, width, height, img2) ||
                                           antialiased(img2, x, y, width, height, img1))) {
                    // one of the pixels is anti-aliasing; draw as yellow and do not count as difference
                    // note that we do not include such pixels in a mask
                    if (output && !options.diffMask) drawPixel(output, pos, ...options.aaColor);

                } else {
                    // found substantial difference not caused by anti-aliasing; draw it as such
                    if (output) {
                        drawPixel(output, pos, ...(delta < 0 && options.diffColorAlt || options.diffColor));
                    }
                    diff++;
                }

            } else if (output) {
                // pixels are similar; draw background as grayscale image blended with white
                if (!options.diffMask) drawGrayPixel(img1, pos, options.alpha, output);
            }
        }
    }

    // return the number of different pixels
    return diff;
}

function isPixelData(arr) {
    // work around instanceof Uint8Array not working properly in some Jest environments
    return ArrayBuffer.isView(arr) && arr.constructor.BYTES_PER_ELEMENT === 1;
}

// check if a pixel is likely a part of anti-aliasing;
// based on "Anti-aliased Pixel and Intensity Slope Detector" paper by V. Vysniauskas, 2009

function antialiased(img, x1, y1, width, height, img2) {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos = (y1 * width + x1) * 4;
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    let min = 0;
    let max = 0;
    let minX, minY, maxX, maxY;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            // brightness delta between the center pixel and adjacent one
            const delta = colorDelta(img, img, pos, (y * width + x) * 4, true);

            // count the number of equal, darker and brighter adjacent pixels
            if (delta === 0) {
                zeroes++;
                // if found more than 2 equal siblings, it's definitely not anti-aliasing
                if (zeroes > 2) return false;

            // remember the darkest pixel
            } else if (delta < min) {
                min = delta;
                minX = x;
                minY = y;

            // remember the brightest pixel
            } else if (delta > max) {
                max = delta;
                maxX = x;
                maxY = y;
            }
        }
    }

    // if there are no both darker and brighter pixels among siblings, it's not anti-aliasing
    if (min === 0 || max === 0) return false;

    // if either the darkest or the brightest pixel has 3+ equal siblings in both images
    // (definitely not anti-aliased), this pixel is anti-aliased
    return (hasManySiblings(img, minX, minY, width, height) && hasManySiblings(img2, minX, minY, width, height)) ||
           (hasManySiblings(img, maxX, maxY, width, height) && hasManySiblings(img2, maxX, maxY, width, height));
}

// check if a pixel has 3+ adjacent pixels of the same color.
function hasManySiblings(img, x1, y1, width, height) {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos = (y1 * width + x1) * 4;
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            const pos2 = (y * width + x) * 4;
            if (img[pos] === img[pos2] &&
                img[pos + 1] === img[pos2 + 1] &&
                img[pos + 2] === img[pos2 + 2] &&
                img[pos + 3] === img[pos2 + 3]) zeroes++;

            if (zeroes > 2) return true;
        }
    }

    return false;
}

// calculate color difference according to the paper "Measuring perceived color difference
// using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos

function colorDelta(img1, img2, k, m, yOnly) {
    let r1 = img1[k + 0];
    let g1 = img1[k + 1];
    let b1 = img1[k + 2];
    let a1 = img1[k + 3];

    let r2 = img2[m + 0];
    let g2 = img2[m + 1];
    let b2 = img2[m + 2];
    let a2 = img2[m + 3];

    if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0;

    if (a1 < 255) {
        a1 /= 255;
        r1 = blend(r1, a1);
        g1 = blend(g1, a1);
        b1 = blend(b1, a1);
    }

    if (a2 < 255) {
        a2 /= 255;
        r2 = blend(r2, a2);
        g2 = blend(g2, a2);
        b2 = blend(b2, a2);
    }

    const y1 = rgb2y(r1, g1, b1);
    const y2 = rgb2y(r2, g2, b2);
    const y = y1 - y2;

    if (yOnly) return y; // brightness difference only

    const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
    const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);

    const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

    // encode whether the pixel lightens or darkens in the sign
    return y1 > y2 ? -delta : delta;
}

function rgb2y(r, g, b) { return r * 0.29889531 + g * 0.58662247 + b * 0.11448223; }
function rgb2i(r, g, b) { return r * 0.59597799 - g * 0.27417610 - b * 0.32180189; }
function rgb2q(r, g, b) { return r * 0.21147017 - g * 0.52261711 + b * 0.31114694; }

// blend semi-transparent color with white
function blend(c, a) {
    return 255 + (c - 255) * a;
}

function drawPixel(output, pos, r, g, b) {
    output[pos + 0] = r;
    output[pos + 1] = g;
    output[pos + 2] = b;
    output[pos + 3] = 255;
}

function drawGrayPixel(img, i, alpha, output) {
    const r = img[i + 0];
    const g = img[i + 1];
    const b = img[i + 2];
    const val = blend(rgb2y(r, g, b), alpha * img[i + 3] / 255);
    drawPixel(output, i, val, val, val);
}


/***/ }),

/***/ 8054:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


var interlaceUtils = __nccwpck_require__(3365);

var pixelBppMapper = [
  // 0 - dummy entry
  function() {},

  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  function(pxData, data, pxPos, rawPos) {
    if (rawPos === data.length) {
      throw new Error('Ran out of data');
    }

    var pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = 0xff;
  },

  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 1 >= data.length) {
      throw new Error('Ran out of data');
    }

    var pixel = data[rawPos];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = data[rawPos + 1];
  },

  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 2 >= data.length) {
      throw new Error('Ran out of data');
    }

    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = 0xff;
  },

  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  function(pxData, data, pxPos, rawPos) {
    if (rawPos + 3 >= data.length) {
      throw new Error('Ran out of data');
    }

    pxData[pxPos] = data[rawPos];
    pxData[pxPos + 1] = data[rawPos + 1];
    pxData[pxPos + 2] = data[rawPos + 2];
    pxData[pxPos + 3] = data[rawPos + 3];
  }
];

var pixelBppCustomMapper = [
  // 0 - dummy entry
  function() {},

  // 1 - L
  // 0: 0, 1: 0, 2: 0, 3: 0xff
  function(pxData, pixelData, pxPos, maxBit) {
    var pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = maxBit;
  },

  // 2 - LA
  // 0: 0, 1: 0, 2: 0, 3: 1
  function(pxData, pixelData, pxPos) {
    var pixel = pixelData[0];
    pxData[pxPos] = pixel;
    pxData[pxPos + 1] = pixel;
    pxData[pxPos + 2] = pixel;
    pxData[pxPos + 3] = pixelData[1];
  },

  // 3 - RGB
  // 0: 0, 1: 1, 2: 2, 3: 0xff
  function(pxData, pixelData, pxPos, maxBit) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = maxBit;
  },

  // 4 - RGBA
  // 0: 0, 1: 1, 2: 2, 3: 3
  function(pxData, pixelData, pxPos) {
    pxData[pxPos] = pixelData[0];
    pxData[pxPos + 1] = pixelData[1];
    pxData[pxPos + 2] = pixelData[2];
    pxData[pxPos + 3] = pixelData[3];
  }
];

function bitRetriever(data, depth) {

  var leftOver = [];
  var i = 0;

  function split() {
    if (i === data.length) {
      throw new Error('Ran out of data');
    }
    var byte = data[i];
    i++;
    var byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
    switch (depth) {
      default:
        throw new Error('unrecognised depth');
      case 16:
        byte2 = data[i];
        i++;
        leftOver.push(((byte << 8) + byte2));
        break;
      case 4:
        byte2 = byte & 0x0f;
        byte1 = byte >> 4;
        leftOver.push(byte1, byte2);
        break;
      case 2:
        byte4 = byte & 3;
        byte3 = byte >> 2 & 3;
        byte2 = byte >> 4 & 3;
        byte1 = byte >> 6 & 3;
        leftOver.push(byte1, byte2, byte3, byte4);
        break;
      case 1:
        byte8 = byte & 1;
        byte7 = byte >> 1 & 1;
        byte6 = byte >> 2 & 1;
        byte5 = byte >> 3 & 1;
        byte4 = byte >> 4 & 1;
        byte3 = byte >> 5 & 1;
        byte2 = byte >> 6 & 1;
        byte1 = byte >> 7 & 1;
        leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
        break;
    }
  }

  return {
    get: function(count) {
      while (leftOver.length < count) {
        split();
      }
      var returner = leftOver.slice(0, count);
      leftOver = leftOver.slice(count);
      return returner;
    },
    resetAfterLine: function() {
      leftOver.length = 0;
    },
    end: function() {
      if (i !== data.length) {
        throw new Error('extra data found');
      }
    }
  };
}

function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) { // eslint-disable-line max-params
  var imageWidth = image.width;
  var imageHeight = image.height;
  var imagePass = image.index;
  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      var pxPos = getPxPos(x, y, imagePass);
      pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
      rawPos += bpp; //eslint-disable-line no-param-reassign
    }
  }
  return rawPos;
}

function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) { // eslint-disable-line max-params
  var imageWidth = image.width;
  var imageHeight = image.height;
  var imagePass = image.index;
  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < imageWidth; x++) {
      var pixelData = bits.get(bpp);
      var pxPos = getPxPos(x, y, imagePass);
      pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
    }
    bits.resetAfterLine();
  }
}

exports.dataToBitMap = function(data, bitmapInfo) {

  var width = bitmapInfo.width;
  var height = bitmapInfo.height;
  var depth = bitmapInfo.depth;
  var bpp = bitmapInfo.bpp;
  var interlace = bitmapInfo.interlace;

  if (depth !== 8) {
    var bits = bitRetriever(data, depth);
  }
  var pxData;
  if (depth <= 8) {
    pxData = new Buffer(width * height * 4);
  }
  else {
    pxData = new Uint16Array(width * height * 4);
  }
  var maxBit = Math.pow(2, depth) - 1;
  var rawPos = 0;
  var images;
  var getPxPos;

  if (interlace) {
    images = interlaceUtils.getImagePasses(width, height);
    getPxPos = interlaceUtils.getInterlaceIterator(width, height);
  }
  else {
    var nonInterlacedPxPos = 0;
    getPxPos = function() {
      var returner = nonInterlacedPxPos;
      nonInterlacedPxPos += 4;
      return returner;
    };
    images = [{ width: width, height: height }];
  }

  for (var imageIndex = 0; imageIndex < images.length; imageIndex++) {
    if (depth === 8) {
      rawPos = mapImage8Bit(images[imageIndex], pxData, getPxPos, bpp, data, rawPos);
    }
    else {
      mapImageCustomBit(images[imageIndex], pxData, getPxPos, bpp, bits, maxBit);
    }
  }
  if (depth === 8) {
    if (rawPos !== data.length) {
      throw new Error('extra data found');
    }
  }
  else {
    bits.end();
  }

  return pxData;
};


/***/ }),

/***/ 6659:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var constants = __nccwpck_require__(3316);

module.exports = function(dataIn, width, height, options) {
  var outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(options.colorType) !== -1;
  if (options.colorType === options.inputColorType) {
    var bigEndian = (function() {
      var buffer = new ArrayBuffer(2);
      new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
      // Int16Array uses the platform's endianness.
      return new Int16Array(buffer)[0] !== 256;
    })();
    // If no need to convert to grayscale and alpha is present/absent in both, take a fast route
    if (options.bitDepth === 8 || (options.bitDepth === 16 && bigEndian)) {
      return dataIn;
    }
  }

  // map to a UInt16 array if data is 16bit, fix endianness below
  var data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);

  var maxValue = 255;
  var inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
  if (inBpp === 4 && !options.inputHasAlpha) {
    inBpp = 3;
  }
  var outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
  if (options.bitDepth === 16) {
    maxValue = 65535;
    outBpp *= 2;
  }
  var outData = new Buffer(width * height * outBpp);

  var inIndex = 0;
  var outIndex = 0;

  var bgColor = options.bgColor || {};
  if (bgColor.red === undefined) {
    bgColor.red = maxValue;
  }
  if (bgColor.green === undefined) {
    bgColor.green = maxValue;
  }
  if (bgColor.blue === undefined) {
    bgColor.blue = maxValue;
  }

  function getRGBA() {
    var red;
    var green;
    var blue;
    var alpha = maxValue;
    switch (options.inputColorType) {
      case constants.COLORTYPE_COLOR_ALPHA:
        alpha = data[inIndex + 3];
        red = data[inIndex];
        green = data[inIndex + 1];
        blue = data[inIndex + 2];
        break;
      case constants.COLORTYPE_COLOR:
        red = data[inIndex];
        green = data[inIndex + 1];
        blue = data[inIndex + 2];
        break;
      case constants.COLORTYPE_ALPHA:
        alpha = data[inIndex + 1];
        red = data[inIndex];
        green = red;
        blue = red;
        break;
      case constants.COLORTYPE_GRAYSCALE:
        red = data[inIndex];
        green = red;
        blue = red;
        break;
      default:
        throw new Error('input color type:' + options.inputColorType + ' is not supported at present');
    }

    if (options.inputHasAlpha) {
      if (!outHasAlpha) {
        alpha /= maxValue;
        red = Math.min(Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0), maxValue);
        green = Math.min(Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0), maxValue);
        blue = Math.min(Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0), maxValue);
      }
    }
    return { red: red, green: green, blue: blue, alpha: alpha };
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var rgba = getRGBA(data, inIndex);

      switch (options.colorType) {
        case constants.COLORTYPE_COLOR_ALPHA:
        case constants.COLORTYPE_COLOR:
          if (options.bitDepth === 8) {
            outData[outIndex] = rgba.red;
            outData[outIndex + 1] = rgba.green;
            outData[outIndex + 2] = rgba.blue;
            if (outHasAlpha) {
              outData[outIndex + 3] = rgba.alpha;
            }
          }
          else {
            outData.writeUInt16BE(rgba.red, outIndex);
            outData.writeUInt16BE(rgba.green, outIndex + 2);
            outData.writeUInt16BE(rgba.blue, outIndex + 4);
            if (outHasAlpha) {
              outData.writeUInt16BE(rgba.alpha, outIndex + 6);
            }
          }
          break;
        case constants.COLORTYPE_ALPHA:
        case constants.COLORTYPE_GRAYSCALE:
          // Convert to grayscale and alpha
          var grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
          if (options.bitDepth === 8) {
            outData[outIndex] = grayscale;
            if (outHasAlpha) {
              outData[outIndex + 1] = rgba.alpha;
            }
          }
          else {
            outData.writeUInt16BE(grayscale, outIndex);
            if (outHasAlpha) {
              outData.writeUInt16BE(rgba.alpha, outIndex + 2);
            }
          }
          break;
        default:
          throw new Error('unrecognised color Type ' + options.colorType);
      }

      inIndex += inBpp;
      outIndex += outBpp;
    }
  }

  return outData;
};


/***/ }),

/***/ 4036:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";



var util = __nccwpck_require__(1669);
var Stream = __nccwpck_require__(2413);


var ChunkStream = module.exports = function() {
  Stream.call(this);

  this._buffers = [];
  this._buffered = 0;

  this._reads = [];
  this._paused = false;

  this._encoding = 'utf8';
  this.writable = true;
};
util.inherits(ChunkStream, Stream);


ChunkStream.prototype.read = function(length, callback) {

  this._reads.push({
    length: Math.abs(length), // if length < 0 then at most this length
    allowLess: length < 0,
    func: callback
  });

  process.nextTick(function() {
    this._process();

    // its paused and there is not enought data then ask for more
    if (this._paused && this._reads.length > 0) {
      this._paused = false;

      this.emit('drain');
    }
  }.bind(this));
};

ChunkStream.prototype.write = function(data, encoding) {

  if (!this.writable) {
    this.emit('error', new Error('Stream not writable'));
    return false;
  }

  var dataBuffer;
  if (Buffer.isBuffer(data)) {
    dataBuffer = data;
  }
  else {
    dataBuffer = new Buffer(data, encoding || this._encoding);
  }

  this._buffers.push(dataBuffer);
  this._buffered += dataBuffer.length;

  this._process();

  // ok if there are no more read requests
  if (this._reads && this._reads.length === 0) {
    this._paused = true;
  }

  return this.writable && !this._paused;
};

ChunkStream.prototype.end = function(data, encoding) {

  if (data) {
    this.write(data, encoding);
  }

  this.writable = false;

  // already destroyed
  if (!this._buffers) {
    return;
  }

  // enqueue or handle end
  if (this._buffers.length === 0) {
    this._end();
  }
  else {
    this._buffers.push(null);
    this._process();
  }
};

ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;

ChunkStream.prototype._end = function() {

  if (this._reads.length > 0) {
    this.emit('error',
      new Error('Unexpected end of input')
    );
  }

  this.destroy();
};

ChunkStream.prototype.destroy = function() {

  if (!this._buffers) {
    return;
  }

  this.writable = false;
  this._reads = null;
  this._buffers = null;

  this.emit('close');
};

ChunkStream.prototype._processReadAllowingLess = function(read) {
  // ok there is any data so that we can satisfy this request
  this._reads.shift(); // == read

  // first we need to peek into first buffer
  var smallerBuf = this._buffers[0];

  // ok there is more data than we need
  if (smallerBuf.length > read.length) {

    this._buffered -= read.length;
    this._buffers[0] = smallerBuf.slice(read.length);

    read.func.call(this, smallerBuf.slice(0, read.length));

  }
  else {
    // ok this is less than maximum length so use it all
    this._buffered -= smallerBuf.length;
    this._buffers.shift(); // == smallerBuf

    read.func.call(this, smallerBuf);
  }
};

ChunkStream.prototype._processRead = function(read) {
  this._reads.shift(); // == read

  var pos = 0;
  var count = 0;
  var data = new Buffer(read.length);

  // create buffer for all data
  while (pos < read.length) {

    var buf = this._buffers[count++];
    var len = Math.min(buf.length, read.length - pos);

    buf.copy(data, pos, 0, len);
    pos += len;

    // last buffer wasn't used all so just slice it and leave
    if (len !== buf.length) {
      this._buffers[--count] = buf.slice(len);
    }
  }

  // remove all used buffers
  if (count > 0) {
    this._buffers.splice(0, count);
  }

  this._buffered -= read.length;

  read.func.call(this, data);
};

ChunkStream.prototype._process = function() {

  try {
    // as long as there is any data and read requests
    while (this._buffered > 0 && this._reads && this._reads.length > 0) {

      var read = this._reads[0];

      // read any data (but no more than length)
      if (read.allowLess) {
        this._processReadAllowingLess(read);

      }
      else if (this._buffered >= read.length) {
        // ok we can meet some expectations

        this._processRead(read);
      }
      else {
        // not enought data to satisfy first request in queue
        // so we need to wait for more
        break;
      }
    }

    if (this._buffers && !this.writable) {
      this._end();
    }
  }
  catch (ex) {
    this.emit('error', ex);
  }
};


/***/ }),

/***/ 3316:
/***/ ((module) => {

"use strict";



module.exports = {

  PNG_SIGNATURE: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],

  TYPE_IHDR: 0x49484452,
  TYPE_IEND: 0x49454e44,
  TYPE_IDAT: 0x49444154,
  TYPE_PLTE: 0x504c5445,
  TYPE_tRNS: 0x74524e53, // eslint-disable-line camelcase
  TYPE_gAMA: 0x67414d41, // eslint-disable-line camelcase

  // color-type bits
  COLORTYPE_GRAYSCALE: 0,
  COLORTYPE_PALETTE: 1,
  COLORTYPE_COLOR: 2,
  COLORTYPE_ALPHA: 4, // e.g. grayscale and alpha

  // color-type combinations
  COLORTYPE_PALETTE_COLOR: 3,
  COLORTYPE_COLOR_ALPHA: 6,

  COLORTYPE_TO_BPP_MAP: {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4
  },

  GAMMA_DIVISION: 100000
};


/***/ }),

/***/ 5987:
/***/ ((module) => {

"use strict";


var crcTable = [];

(function() {
  for (var i = 0; i < 256; i++) {
    var currentCrc = i;
    for (var j = 0; j < 8; j++) {
      if (currentCrc & 1) {
        currentCrc = 0xedb88320 ^ (currentCrc >>> 1);
      }
      else {
        currentCrc = currentCrc >>> 1;
      }
    }
    crcTable[i] = currentCrc;
  }
}());

var CrcCalculator = module.exports = function() {
  this._crc = -1;
};

CrcCalculator.prototype.write = function(data) {

  for (var i = 0; i < data.length; i++) {
    this._crc = crcTable[(this._crc ^ data[i]) & 0xff] ^ (this._crc >>> 8);
  }
  return true;
};

CrcCalculator.prototype.crc32 = function() {
  return this._crc ^ -1;
};


CrcCalculator.crc32 = function(buf) {

  var crc = -1;
  for (var i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
};


/***/ }),

/***/ 7581:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var paethPredictor = __nccwpck_require__(5252);

function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {

  for (var x = 0; x < byteWidth; x++) {
    rawData[rawPos + x] = pxData[pxPos + x];
  }
}

function filterSumNone(pxData, pxPos, byteWidth) {

  var sum = 0;
  var length = pxPos + byteWidth;

  for (var i = pxPos; i < length; i++) {
    sum += Math.abs(pxData[i]);
  }
  return sum;
}

function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var val = pxData[pxPos + x] - left;

    rawData[rawPos + x] = val;
  }
}

function filterSumSub(pxData, pxPos, byteWidth, bpp) {

  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var val = pxData[pxPos + x] - left;

    sum += Math.abs(val);
  }

  return sum;
}

function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {

  for (var x = 0; x < byteWidth; x++) {

    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - up;

    rawData[rawPos + x] = val;
  }
}

function filterSumUp(pxData, pxPos, byteWidth) {

  var sum = 0;
  var length = pxPos + byteWidth;
  for (var x = pxPos; x < length; x++) {

    var up = pxPos > 0 ? pxData[x - byteWidth] : 0;
    var val = pxData[x] - up;

    sum += Math.abs(val);
  }

  return sum;
}

function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - ((left + up) >> 1);

    rawData[rawPos + x] = val;
  }
}

function filterSumAvg(pxData, pxPos, byteWidth, bpp) {

  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - ((left + up) >> 1);

    sum += Math.abs(val);
  }

  return sum;
}

function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);

    rawData[rawPos + x] = val;
  }
}

function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);

    sum += Math.abs(val);
  }

  return sum;
}

var filters = {
  0: filterNone,
  1: filterSub,
  2: filterUp,
  3: filterAvg,
  4: filterPaeth
};

var filterSums = {
  0: filterSumNone,
  1: filterSumSub,
  2: filterSumUp,
  3: filterSumAvg,
  4: filterSumPaeth
};

module.exports = function(pxData, width, height, options, bpp) {

  var filterTypes;
  if (!('filterType' in options) || options.filterType === -1) {
    filterTypes = [0, 1, 2, 3, 4];
  }
  else if (typeof options.filterType === 'number') {
    filterTypes = [options.filterType];
  }
  else {
    throw new Error('unrecognised filter types');
  }

  if (options.bitDepth === 16) {
    bpp *= 2;
  }
  var byteWidth = width * bpp;
  var rawPos = 0;
  var pxPos = 0;
  var rawData = new Buffer((byteWidth + 1) * height);

  var sel = filterTypes[0];

  for (var y = 0; y < height; y++) {

    if (filterTypes.length > 1) {
      // find best filter for this line (with lowest sum of values)
      var min = Infinity;

      for (var i = 0; i < filterTypes.length; i++) {
        var sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
        if (sum < min) {
          sel = filterTypes[i];
          min = sum;
        }
      }
    }

    rawData[rawPos] = sel;
    rawPos++;
    filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
    rawPos += byteWidth;
    pxPos += byteWidth;
  }
  return rawData;
};


/***/ }),

/***/ 528:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var util = __nccwpck_require__(1669);
var ChunkStream = __nccwpck_require__(4036);
var Filter = __nccwpck_require__(6601);


var FilterAsync = module.exports = function(bitmapInfo) {
  ChunkStream.call(this);

  var buffers = [];
  var that = this;
  this._filter = new Filter(bitmapInfo, {
    read: this.read.bind(this),
    write: function(buffer) {
      buffers.push(buffer);
    },
    complete: function() {
      that.emit('complete', Buffer.concat(buffers));
    }
  });

  this._filter.start();
};
util.inherits(FilterAsync, ChunkStream);


/***/ }),

/***/ 8505:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


var SyncReader = __nccwpck_require__(3652);
var Filter = __nccwpck_require__(6601);


exports.process = function(inBuffer, bitmapInfo) {

  var outBuffers = [];
  var reader = new SyncReader(inBuffer);
  var filter = new Filter(bitmapInfo, {
    read: reader.read.bind(reader),
    write: function(bufferPart) {
      outBuffers.push(bufferPart);
    },
    complete: function() {
    }
  });

  filter.start();
  reader.process();

  return Buffer.concat(outBuffers);
};

/***/ }),

/***/ 6601:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var interlaceUtils = __nccwpck_require__(3365);
var paethPredictor = __nccwpck_require__(5252);

function getByteWidth(width, bpp, depth) {
  var byteWidth = width * bpp;
  if (depth !== 8) {
    byteWidth = Math.ceil(byteWidth / (8 / depth));
  }
  return byteWidth;
}

var Filter = module.exports = function(bitmapInfo, dependencies) {

  var width = bitmapInfo.width;
  var height = bitmapInfo.height;
  var interlace = bitmapInfo.interlace;
  var bpp = bitmapInfo.bpp;
  var depth = bitmapInfo.depth;

  this.read = dependencies.read;
  this.write = dependencies.write;
  this.complete = dependencies.complete;

  this._imageIndex = 0;
  this._images = [];
  if (interlace) {
    var passes = interlaceUtils.getImagePasses(width, height);
    for (var i = 0; i < passes.length; i++) {
      this._images.push({
        byteWidth: getByteWidth(passes[i].width, bpp, depth),
        height: passes[i].height,
        lineIndex: 0
      });
    }
  }
  else {
    this._images.push({
      byteWidth: getByteWidth(width, bpp, depth),
      height: height,
      lineIndex: 0
    });
  }

  // when filtering the line we look at the pixel to the left
  // the spec also says it is done on a byte level regardless of the number of pixels
  // so if the depth is byte compatible (8 or 16) we subtract the bpp in order to compare back
  // a pixel rather than just a different byte part. However if we are sub byte, we ignore.
  if (depth === 8) {
    this._xComparison = bpp;
  }
  else if (depth === 16) {
    this._xComparison = bpp * 2;
  }
  else {
    this._xComparison = 1;
  }
};

Filter.prototype.start = function() {
  this.read(this._images[this._imageIndex].byteWidth + 1, this._reverseFilterLine.bind(this));
};

Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {

  var xComparison = this._xComparison;
  var xBiggerThan = xComparison - 1;

  for (var x = 0; x < byteWidth; x++) {
    var rawByte = rawData[1 + x];
    var f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    unfilteredLine[x] = rawByte + f1Left;
  }
};

Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {

  var lastLine = this._lastLine;

  for (var x = 0; x < byteWidth; x++) {
    var rawByte = rawData[1 + x];
    var f2Up = lastLine ? lastLine[x] : 0;
    unfilteredLine[x] = rawByte + f2Up;
  }
};

Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {

  var xComparison = this._xComparison;
  var xBiggerThan = xComparison - 1;
  var lastLine = this._lastLine;

  for (var x = 0; x < byteWidth; x++) {
    var rawByte = rawData[1 + x];
    var f3Up = lastLine ? lastLine[x] : 0;
    var f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    var f3Add = Math.floor((f3Left + f3Up) / 2);
    unfilteredLine[x] = rawByte + f3Add;
  }
};

Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {

  var xComparison = this._xComparison;
  var xBiggerThan = xComparison - 1;
  var lastLine = this._lastLine;

  for (var x = 0; x < byteWidth; x++) {
    var rawByte = rawData[1 + x];
    var f4Up = lastLine ? lastLine[x] : 0;
    var f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
    var f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
    var f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
    unfilteredLine[x] = rawByte + f4Add;
  }
};

Filter.prototype._reverseFilterLine = function(rawData) {

  var filter = rawData[0];
  var unfilteredLine;
  var currentImage = this._images[this._imageIndex];
  var byteWidth = currentImage.byteWidth;

  if (filter === 0) {
    unfilteredLine = rawData.slice(1, byteWidth + 1);
  }
  else {

    unfilteredLine = new Buffer(byteWidth);

    switch (filter) {
      case 1:
        this._unFilterType1(rawData, unfilteredLine, byteWidth);
        break;
      case 2:
        this._unFilterType2(rawData, unfilteredLine, byteWidth);
        break;
      case 3:
        this._unFilterType3(rawData, unfilteredLine, byteWidth);
        break;
      case 4:
        this._unFilterType4(rawData, unfilteredLine, byteWidth);
        break;
      default:
        throw new Error('Unrecognised filter type - ' + filter);
    }
  }

  this.write(unfilteredLine);

  currentImage.lineIndex++;
  if (currentImage.lineIndex >= currentImage.height) {
    this._lastLine = null;
    this._imageIndex++;
    currentImage = this._images[this._imageIndex];
  }
  else {
    this._lastLine = unfilteredLine;
  }

  if (currentImage) {
    // read, using the byte width that may be from the new current image
    this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
  }
  else {
    this._lastLine = null;
    this.complete();
  }
};


/***/ }),

/***/ 3928:
/***/ ((module) => {

"use strict";


function dePalette(indata, outdata, width, height, palette) {
  var pxPos = 0;
  // use values from palette
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var color = palette[indata[pxPos]];

      if (!color) {
        throw new Error('index ' + indata[pxPos] + ' not in palette');
      }

      for (var i = 0; i < 4; i++) {
        outdata[pxPos + i] = color[i];
      }
      pxPos += 4;
    }
  }
}

function replaceTransparentColor(indata, outdata, width, height, transColor) {
  var pxPos = 0;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var makeTrans = false;

      if (transColor.length === 1) {
        if (transColor[0] === indata[pxPos]) {
          makeTrans = true;
        }
      }
      else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
        makeTrans = true;
      }
      if (makeTrans) {
        for (var i = 0; i < 4; i++) {
          outdata[pxPos + i] = 0;
        }
      }
      pxPos += 4;
    }
  }
}

function scaleDepth(indata, outdata, width, height, depth) {
  var maxOutSample = 255;
  var maxInSample = Math.pow(2, depth) - 1;
  var pxPos = 0;

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      for (var i = 0; i < 4; i++) {
        outdata[pxPos + i] = Math.floor((indata[pxPos + i] * maxOutSample) / maxInSample + 0.5);
      }
      pxPos += 4;
    }
  }
}

module.exports = function(indata, imageData) {

  var depth = imageData.depth;
  var width = imageData.width;
  var height = imageData.height;
  var colorType = imageData.colorType;
  var transColor = imageData.transColor;
  var palette = imageData.palette;

  var outdata = indata; // only different for 16 bits

  if (colorType === 3) { // paletted
    dePalette(indata, outdata, width, height, palette);
  }
  else {
    if (transColor) {
      replaceTransparentColor(indata, outdata, width, height, transColor);
    }
    // if it needs scaling
    if (depth !== 8) {
      // if we need to change the buffer size
      if (depth === 16) {
        outdata = new Buffer(width * height * 4);
      }
      scaleDepth(indata, outdata, width, height, depth);
    }
  }
  return outdata;
};


/***/ }),

/***/ 3365:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


// Adam 7
//   0 1 2 3 4 5 6 7
// 0 x 6 4 6 x 6 4 6
// 1 7 7 7 7 7 7 7 7
// 2 5 6 5 6 5 6 5 6
// 3 7 7 7 7 7 7 7 7
// 4 3 6 4 6 3 6 4 6
// 5 7 7 7 7 7 7 7 7
// 6 5 6 5 6 5 6 5 6
// 7 7 7 7 7 7 7 7 7


var imagePasses = [
  { // pass 1 - 1px
    x: [0],
    y: [0]
  },
  { // pass 2 - 1px
    x: [4],
    y: [0]
  },
  { // pass 3 - 2px
    x: [0, 4],
    y: [4]
  },
  { // pass 4 - 4px
    x: [2, 6],
    y: [0, 4]
  },
  { // pass 5 - 8px
    x: [0, 2, 4, 6],
    y: [2, 6]
  },
  { // pass 6 - 16px
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6]
  },
  { // pass 7 - 32px
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7]
  }
];

exports.getImagePasses = function(width, height) {
  var images = [];
  var xLeftOver = width % 8;
  var yLeftOver = height % 8;
  var xRepeats = (width - xLeftOver) / 8;
  var yRepeats = (height - yLeftOver) / 8;
  for (var i = 0; i < imagePasses.length; i++) {
    var pass = imagePasses[i];
    var passWidth = xRepeats * pass.x.length;
    var passHeight = yRepeats * pass.y.length;
    for (var j = 0; j < pass.x.length; j++) {
      if (pass.x[j] < xLeftOver) {
        passWidth++;
      }
      else {
        break;
      }
    }
    for (j = 0; j < pass.y.length; j++) {
      if (pass.y[j] < yLeftOver) {
        passHeight++;
      }
      else {
        break;
      }
    }
    if (passWidth > 0 && passHeight > 0) {
      images.push({ width: passWidth, height: passHeight, index: i });
    }
  }
  return images;
};

exports.getInterlaceIterator = function(width) {
  return function(x, y, pass) {
    var outerXLeftOver = x % imagePasses[pass].x.length;
    var outerX = (((x - outerXLeftOver) / imagePasses[pass].x.length) * 8) + imagePasses[pass].x[outerXLeftOver];
    var outerYLeftOver = y % imagePasses[pass].y.length;
    var outerY = (((y - outerYLeftOver) / imagePasses[pass].y.length) * 8) + imagePasses[pass].y[outerYLeftOver];
    return (outerX * 4) + (outerY * width * 4);
  };
};

/***/ }),

/***/ 2584:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var util = __nccwpck_require__(1669);
var Stream = __nccwpck_require__(2413);
var constants = __nccwpck_require__(3316);
var Packer = __nccwpck_require__(1710);

var PackerAsync = module.exports = function(opt) {
  Stream.call(this);

  var options = opt || {};

  this._packer = new Packer(options);
  this._deflate = this._packer.createDeflate();

  this.readable = true;
};
util.inherits(PackerAsync, Stream);


PackerAsync.prototype.pack = function(data, width, height, gamma) {
  // Signature
  this.emit('data', new Buffer(constants.PNG_SIGNATURE));
  this.emit('data', this._packer.packIHDR(width, height));

  if (gamma) {
    this.emit('data', this._packer.packGAMA(gamma));
  }

  var filteredData = this._packer.filterData(data, width, height);

  // compress it
  this._deflate.on('error', this.emit.bind(this, 'error'));

  this._deflate.on('data', function(compressedData) {
    this.emit('data', this._packer.packIDAT(compressedData));
  }.bind(this));

  this._deflate.on('end', function() {
    this.emit('data', this._packer.packIEND());
    this.emit('end');
  }.bind(this));

  this._deflate.end(filteredData);
};


/***/ }),

/***/ 7100:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var hasSyncZlib = true;
var zlib = __nccwpck_require__(8761);
if (!zlib.deflateSync) {
  hasSyncZlib = false;
}
var constants = __nccwpck_require__(3316);
var Packer = __nccwpck_require__(1710);

module.exports = function(metaData, opt) {

  if (!hasSyncZlib) {
    throw new Error('To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0');
  }

  var options = opt || {};

  var packer = new Packer(options);

  var chunks = [];

  // Signature
  chunks.push(new Buffer(constants.PNG_SIGNATURE));

  // Header
  chunks.push(packer.packIHDR(metaData.width, metaData.height));

  if (metaData.gamma) {
    chunks.push(packer.packGAMA(metaData.gamma));
  }

  var filteredData = packer.filterData(metaData.data, metaData.width, metaData.height);

  // compress it
  var compressedData = zlib.deflateSync(filteredData, packer.getDeflateOptions());
  filteredData = null;

  if (!compressedData || !compressedData.length) {
    throw new Error('bad png - invalid compressed data response');
  }
  chunks.push(packer.packIDAT(compressedData));

  // End
  chunks.push(packer.packIEND());

  return Buffer.concat(chunks);
};


/***/ }),

/***/ 1710:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var constants = __nccwpck_require__(3316);
var CrcStream = __nccwpck_require__(5987);
var bitPacker = __nccwpck_require__(6659);
var filter = __nccwpck_require__(7581);
var zlib = __nccwpck_require__(8761);

var Packer = module.exports = function(options) {
  this._options = options;

  options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
  options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
  options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
  options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
  options.deflateFactory = options.deflateFactory || zlib.createDeflate;
  options.bitDepth = options.bitDepth || 8;
  // This is outputColorType
  options.colorType = (typeof options.colorType === 'number') ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
  options.inputColorType = (typeof options.inputColorType === 'number') ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;

  if ([
    constants.COLORTYPE_GRAYSCALE,
    constants.COLORTYPE_COLOR,
    constants.COLORTYPE_COLOR_ALPHA,
    constants.COLORTYPE_ALPHA
  ].indexOf(options.colorType) === -1) {
    throw new Error('option color type:' + options.colorType + ' is not supported at present');
  }
  if ([
    constants.COLORTYPE_GRAYSCALE,
    constants.COLORTYPE_COLOR,
    constants.COLORTYPE_COLOR_ALPHA,
    constants.COLORTYPE_ALPHA
  ].indexOf(options.inputColorType) === -1) {
    throw new Error('option input color type:' + options.inputColorType + ' is not supported at present');
  }
  if (options.bitDepth !== 8 && options.bitDepth !== 16) {
    throw new Error('option bit depth:' + options.bitDepth + ' is not supported at present');
  }
};

Packer.prototype.getDeflateOptions = function() {
  return {
    chunkSize: this._options.deflateChunkSize,
    level: this._options.deflateLevel,
    strategy: this._options.deflateStrategy
  };
};

Packer.prototype.createDeflate = function() {
  return this._options.deflateFactory(this.getDeflateOptions());
};

Packer.prototype.filterData = function(data, width, height) {
  // convert to correct format for filtering (e.g. right bpp and bit depth)
  var packedData = bitPacker(data, width, height, this._options);

  // filter pixel data
  var bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
  var filteredData = filter(packedData, width, height, this._options, bpp);
  return filteredData;
};

Packer.prototype._packChunk = function(type, data) {

  var len = (data ? data.length : 0);
  var buf = new Buffer(len + 12);

  buf.writeUInt32BE(len, 0);
  buf.writeUInt32BE(type, 4);

  if (data) {
    data.copy(buf, 8);
  }

  buf.writeInt32BE(CrcStream.crc32(buf.slice(4, buf.length - 4)), buf.length - 4);
  return buf;
};

Packer.prototype.packGAMA = function(gamma) {
  var buf = new Buffer(4);
  buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
  return this._packChunk(constants.TYPE_gAMA, buf);
};

Packer.prototype.packIHDR = function(width, height) {

  var buf = new Buffer(13);
  buf.writeUInt32BE(width, 0);
  buf.writeUInt32BE(height, 4);
  buf[8] = this._options.bitDepth; // Bit depth
  buf[9] = this._options.colorType; // colorType
  buf[10] = 0; // compression
  buf[11] = 0; // filter
  buf[12] = 0; // interlace

  return this._packChunk(constants.TYPE_IHDR, buf);
};

Packer.prototype.packIDAT = function(data) {
  return this._packChunk(constants.TYPE_IDAT, data);
};

Packer.prototype.packIEND = function() {
  return this._packChunk(constants.TYPE_IEND, null);
};


/***/ }),

/***/ 5252:
/***/ ((module) => {

"use strict";


module.exports = function paethPredictor(left, above, upLeft) {

  var paeth = left + above - upLeft;
  var pLeft = Math.abs(paeth - left);
  var pAbove = Math.abs(paeth - above);
  var pUpLeft = Math.abs(paeth - upLeft);

  if (pLeft <= pAbove && pLeft <= pUpLeft) {
    return left;
  }
  if (pAbove <= pUpLeft) {
    return above;
  }
  return upLeft;
};

/***/ }),

/***/ 699:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var util = __nccwpck_require__(1669);
var zlib = __nccwpck_require__(8761);
var ChunkStream = __nccwpck_require__(4036);
var FilterAsync = __nccwpck_require__(528);
var Parser = __nccwpck_require__(2225);
var bitmapper = __nccwpck_require__(8054);
var formatNormaliser = __nccwpck_require__(3928);

var ParserAsync = module.exports = function(options) {
  ChunkStream.call(this);

  this._parser = new Parser(options, {
    read: this.read.bind(this),
    error: this._handleError.bind(this),
    metadata: this._handleMetaData.bind(this),
    gamma: this.emit.bind(this, 'gamma'),
    palette: this._handlePalette.bind(this),
    transColor: this._handleTransColor.bind(this),
    finished: this._finished.bind(this),
    inflateData: this._inflateData.bind(this),
    simpleTransparency: this._simpleTransparency.bind(this),
    headersFinished: this._headersFinished.bind(this)
  });
  this._options = options;
  this.writable = true;

  this._parser.start();
};
util.inherits(ParserAsync, ChunkStream);


ParserAsync.prototype._handleError = function(err) {

  this.emit('error', err);

  this.writable = false;

  this.destroy();

  if (this._inflate && this._inflate.destroy) {
    this._inflate.destroy();
  }

  if (this._filter) {
    this._filter.destroy();
    // For backward compatibility with Node 7 and below.
    // Suppress errors due to _inflate calling write() even after
    // it's destroy()'ed.
    this._filter.on('error', function() {});
  }

  this.errord = true;
};

ParserAsync.prototype._inflateData = function(data) {
  if (!this._inflate) {
    if (this._bitmapInfo.interlace) {
      this._inflate = zlib.createInflate();

      this._inflate.on('error', this.emit.bind(this, 'error'));
      this._filter.on('complete', this._complete.bind(this));

      this._inflate.pipe(this._filter);
    }
    else {
      var rowSize = ((this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7) >> 3) + 1;
      var imageSize = rowSize * this._bitmapInfo.height;
      var chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);

      this._inflate = zlib.createInflate({ chunkSize: chunkSize });
      var leftToInflate = imageSize;

      var emitError = this.emit.bind(this, 'error');
      this._inflate.on('error', function(err) {
        if (!leftToInflate) {
          return;
        }

        emitError(err);
      });
      this._filter.on('complete', this._complete.bind(this));

      var filterWrite = this._filter.write.bind(this._filter);
      this._inflate.on('data', function(chunk) {
        if (!leftToInflate) {
          return;
        }

        if (chunk.length > leftToInflate) {
          chunk = chunk.slice(0, leftToInflate);
        }

        leftToInflate -= chunk.length;

        filterWrite(chunk);
      });

      this._inflate.on('end', this._filter.end.bind(this._filter));
    }
  }
  this._inflate.write(data);
};

ParserAsync.prototype._handleMetaData = function(metaData) {
  this._metaData = metaData;
  this._bitmapInfo = Object.create(metaData);

  this._filter = new FilterAsync(this._bitmapInfo);
};

ParserAsync.prototype._handleTransColor = function(transColor) {
  this._bitmapInfo.transColor = transColor;
};

ParserAsync.prototype._handlePalette = function(palette) {
  this._bitmapInfo.palette = palette;
};

ParserAsync.prototype._simpleTransparency = function() {
  this._metaData.alpha = true;
};

ParserAsync.prototype._headersFinished = function() {
  // Up until this point, we don't know if we have a tRNS chunk (alpha)
  // so we can't emit metadata any earlier
  this.emit('metadata', this._metaData);
};

ParserAsync.prototype._finished = function() {
  if (this.errord) {
    return;
  }

  if (!this._inflate) {
    this.emit('error', 'No Inflate block');
  }
  else {
    // no more data to inflate
    this._inflate.end();
  }
  this.destroySoon();
};

ParserAsync.prototype._complete = function(filteredData) {

  if (this.errord) {
    return;
  }

  try {
    var bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);

    var normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
    bitmapData = null;
  }
  catch (ex) {
    this._handleError(ex);
    return;
  }

  this.emit('parsed', normalisedBitmapData);
};


/***/ }),

/***/ 29:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var hasSyncZlib = true;
var zlib = __nccwpck_require__(8761);
var inflateSync = __nccwpck_require__(5331);
if (!zlib.deflateSync) {
  hasSyncZlib = false;
}
var SyncReader = __nccwpck_require__(3652);
var FilterSync = __nccwpck_require__(8505);
var Parser = __nccwpck_require__(2225);
var bitmapper = __nccwpck_require__(8054);
var formatNormaliser = __nccwpck_require__(3928);


module.exports = function(buffer, options) {

  if (!hasSyncZlib) {
    throw new Error('To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0');
  }

  var err;
  function handleError(_err_) {
    err = _err_;
  }

  var metaData;
  function handleMetaData(_metaData_) {
    metaData = _metaData_;
  }

  function handleTransColor(transColor) {
    metaData.transColor = transColor;
  }

  function handlePalette(palette) {
    metaData.palette = palette;
  }

  function handleSimpleTransparency() {
    metaData.alpha = true;
  }

  var gamma;
  function handleGamma(_gamma_) {
    gamma = _gamma_;
  }

  var inflateDataList = [];
  function handleInflateData(inflatedData) {
    inflateDataList.push(inflatedData);
  }

  var reader = new SyncReader(buffer);

  var parser = new Parser(options, {
    read: reader.read.bind(reader),
    error: handleError,
    metadata: handleMetaData,
    gamma: handleGamma,
    palette: handlePalette,
    transColor: handleTransColor,
    inflateData: handleInflateData,
    simpleTransparency: handleSimpleTransparency
  });

  parser.start();
  reader.process();

  if (err) {
    throw err;
  }

  //join together the inflate datas
  var inflateData = Buffer.concat(inflateDataList);
  inflateDataList.length = 0;

  var inflatedData;
  if (metaData.interlace) {
    inflatedData = zlib.inflateSync(inflateData);
  }
  else {
    var rowSize = ((metaData.width * metaData.bpp * metaData.depth + 7) >> 3) + 1;
    var imageSize = rowSize * metaData.height;
    inflatedData = inflateSync(inflateData, { chunkSize: imageSize, maxLength: imageSize });
  }
  inflateData = null;

  if (!inflatedData || !inflatedData.length) {
    throw new Error('bad png - invalid inflate data response');
  }

  var unfilteredData = FilterSync.process(inflatedData, metaData);
  inflateData = null;

  var bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
  unfilteredData = null;

  var normalisedBitmapData = formatNormaliser(bitmapData, metaData);

  metaData.data = normalisedBitmapData;
  metaData.gamma = gamma || 0;

  return metaData;
};


/***/ }),

/***/ 2225:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var constants = __nccwpck_require__(3316);
var CrcCalculator = __nccwpck_require__(5987);


var Parser = module.exports = function(options, dependencies) {

  this._options = options;
  options.checkCRC = options.checkCRC !== false;

  this._hasIHDR = false;
  this._hasIEND = false;
  this._emittedHeadersFinished = false;

  // input flags/metadata
  this._palette = [];
  this._colorType = 0;

  this._chunks = {};
  this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
  this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
  this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
  this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
  this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
  this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);

  this.read = dependencies.read;
  this.error = dependencies.error;
  this.metadata = dependencies.metadata;
  this.gamma = dependencies.gamma;
  this.transColor = dependencies.transColor;
  this.palette = dependencies.palette;
  this.parsed = dependencies.parsed;
  this.inflateData = dependencies.inflateData;
  this.finished = dependencies.finished;
  this.simpleTransparency = dependencies.simpleTransparency;
  this.headersFinished = dependencies.headersFinished || function() {};
};

Parser.prototype.start = function() {
  this.read(constants.PNG_SIGNATURE.length,
    this._parseSignature.bind(this)
  );
};

Parser.prototype._parseSignature = function(data) {

  var signature = constants.PNG_SIGNATURE;

  for (var i = 0; i < signature.length; i++) {
    if (data[i] !== signature[i]) {
      this.error(new Error('Invalid file signature'));
      return;
    }
  }
  this.read(8, this._parseChunkBegin.bind(this));
};

Parser.prototype._parseChunkBegin = function(data) {

  // chunk content length
  var length = data.readUInt32BE(0);

  // chunk type
  var type = data.readUInt32BE(4);
  var name = '';
  for (var i = 4; i < 8; i++) {
    name += String.fromCharCode(data[i]);
  }

  //console.log('chunk ', name, length);

  // chunk flags
  var ancillary = Boolean(data[4] & 0x20); // or critical
  //    priv = Boolean(data[5] & 0x20), // or public
  //    safeToCopy = Boolean(data[7] & 0x20); // or unsafe

  if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
    this.error(new Error('Expected IHDR on beggining'));
    return;
  }

  this._crc = new CrcCalculator();
  this._crc.write(new Buffer(name));

  if (this._chunks[type]) {
    return this._chunks[type](length);
  }

  if (!ancillary) {
    this.error(new Error('Unsupported critical chunk type ' + name));
    return;
  }

  this.read(length + 4, this._skipChunk.bind(this));
};

Parser.prototype._skipChunk = function(/*data*/) {
  this.read(8, this._parseChunkBegin.bind(this));
};

Parser.prototype._handleChunkEnd = function() {
  this.read(4, this._parseChunkEnd.bind(this));
};

Parser.prototype._parseChunkEnd = function(data) {

  var fileCrc = data.readInt32BE(0);
  var calcCrc = this._crc.crc32();

  // check CRC
  if (this._options.checkCRC && calcCrc !== fileCrc) {
    this.error(new Error('Crc error - ' + fileCrc + ' - ' + calcCrc));
    return;
  }

  if (!this._hasIEND) {
    this.read(8, this._parseChunkBegin.bind(this));
  }
};

Parser.prototype._handleIHDR = function(length) {
  this.read(length, this._parseIHDR.bind(this));
};
Parser.prototype._parseIHDR = function(data) {

  this._crc.write(data);

  var width = data.readUInt32BE(0);
  var height = data.readUInt32BE(4);
  var depth = data[8];
  var colorType = data[9]; // bits: 1 palette, 2 color, 4 alpha
  var compr = data[10];
  var filter = data[11];
  var interlace = data[12];

  // console.log('    width', width, 'height', height,
  //     'depth', depth, 'colorType', colorType,
  //     'compr', compr, 'filter', filter, 'interlace', interlace
  // );

  if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
    this.error(new Error('Unsupported bit depth ' + depth));
    return;
  }
  if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
    this.error(new Error('Unsupported color type'));
    return;
  }
  if (compr !== 0) {
    this.error(new Error('Unsupported compression method'));
    return;
  }
  if (filter !== 0) {
    this.error(new Error('Unsupported filter method'));
    return;
  }
  if (interlace !== 0 && interlace !== 1) {
    this.error(new Error('Unsupported interlace method'));
    return;
  }

  this._colorType = colorType;

  var bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];

  this._hasIHDR = true;

  this.metadata({
    width: width,
    height: height,
    depth: depth,
    interlace: Boolean(interlace),
    palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
    color: Boolean(colorType & constants.COLORTYPE_COLOR),
    alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
    bpp: bpp,
    colorType: colorType
  });

  this._handleChunkEnd();
};


Parser.prototype._handlePLTE = function(length) {
  this.read(length, this._parsePLTE.bind(this));
};
Parser.prototype._parsePLTE = function(data) {

  this._crc.write(data);

  var entries = Math.floor(data.length / 3);
  // console.log('Palette:', entries);

  for (var i = 0; i < entries; i++) {
    this._palette.push([
      data[i * 3],
      data[i * 3 + 1],
      data[i * 3 + 2],
      0xff
    ]);
  }

  this.palette(this._palette);

  this._handleChunkEnd();
};

Parser.prototype._handleTRNS = function(length) {
  this.simpleTransparency();
  this.read(length, this._parseTRNS.bind(this));
};
Parser.prototype._parseTRNS = function(data) {

  this._crc.write(data);

  // palette
  if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
    if (this._palette.length === 0) {
      this.error(new Error('Transparency chunk must be after palette'));
      return;
    }
    if (data.length > this._palette.length) {
      this.error(new Error('More transparent colors than palette size'));
      return;
    }
    for (var i = 0; i < data.length; i++) {
      this._palette[i][3] = data[i];
    }
    this.palette(this._palette);
  }

  // for colorType 0 (grayscale) and 2 (rgb)
  // there might be one gray/color defined as transparent
  if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
    // grey, 2 bytes
    this.transColor([data.readUInt16BE(0)]);
  }
  if (this._colorType === constants.COLORTYPE_COLOR) {
    this.transColor([data.readUInt16BE(0), data.readUInt16BE(2), data.readUInt16BE(4)]);
  }

  this._handleChunkEnd();
};

Parser.prototype._handleGAMA = function(length) {
  this.read(length, this._parseGAMA.bind(this));
};
Parser.prototype._parseGAMA = function(data) {

  this._crc.write(data);
  this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);

  this._handleChunkEnd();
};

Parser.prototype._handleIDAT = function(length) {
  if (!this._emittedHeadersFinished) {
    this._emittedHeadersFinished = true;
    this.headersFinished();
  }
  this.read(-length, this._parseIDAT.bind(this, length));
};
Parser.prototype._parseIDAT = function(length, data) {

  this._crc.write(data);

  if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
    throw new Error('Expected palette not found');
  }

  this.inflateData(data);
  var leftOverLength = length - data.length;

  if (leftOverLength > 0) {
    this._handleIDAT(leftOverLength);
  }
  else {
    this._handleChunkEnd();
  }
};

Parser.prototype._handleIEND = function(length) {
  this.read(length, this._parseIEND.bind(this));
};
Parser.prototype._parseIEND = function(data) {

  this._crc.write(data);

  this._hasIEND = true;
  this._handleChunkEnd();

  if (this.finished) {
    this.finished();
  }
};


/***/ }),

/***/ 1436:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";



var parse = __nccwpck_require__(29);
var pack = __nccwpck_require__(7100);


exports.read = function(buffer, options) {

  return parse(buffer, options || {});
};

exports.write = function(png, options) {

  return pack(png, options);
};


/***/ }),

/***/ 6413:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


var util = __nccwpck_require__(1669);
var Stream = __nccwpck_require__(2413);
var Parser = __nccwpck_require__(699);
var Packer = __nccwpck_require__(2584);
var PNGSync = __nccwpck_require__(1436);


var PNG = exports.PNG = function(options) {
  Stream.call(this);

  options = options || {}; // eslint-disable-line no-param-reassign

  // coerce pixel dimensions to integers (also coerces undefined -> 0):
  this.width = options.width | 0;
  this.height = options.height | 0;

  this.data = this.width > 0 && this.height > 0 ?
    new Buffer(4 * this.width * this.height) : null;

  if (options.fill && this.data) {
    this.data.fill(0);
  }

  this.gamma = 0;
  this.readable = this.writable = true;

  this._parser = new Parser(options);

  this._parser.on('error', this.emit.bind(this, 'error'));
  this._parser.on('close', this._handleClose.bind(this));
  this._parser.on('metadata', this._metadata.bind(this));
  this._parser.on('gamma', this._gamma.bind(this));
  this._parser.on('parsed', function(data) {
    this.data = data;
    this.emit('parsed', data);
  }.bind(this));

  this._packer = new Packer(options);
  this._packer.on('data', this.emit.bind(this, 'data'));
  this._packer.on('end', this.emit.bind(this, 'end'));
  this._parser.on('close', this._handleClose.bind(this));
  this._packer.on('error', this.emit.bind(this, 'error'));

};
util.inherits(PNG, Stream);

PNG.sync = PNGSync;

PNG.prototype.pack = function() {

  if (!this.data || !this.data.length) {
    this.emit('error', 'No data provided');
    return this;
  }

  process.nextTick(function() {
    this._packer.pack(this.data, this.width, this.height, this.gamma);
  }.bind(this));

  return this;
};


PNG.prototype.parse = function(data, callback) {

  if (callback) {
    var onParsed, onError;

    onParsed = function(parsedData) {
      this.removeListener('error', onError);

      this.data = parsedData;
      callback(null, this);
    }.bind(this);

    onError = function(err) {
      this.removeListener('parsed', onParsed);

      callback(err, null);
    }.bind(this);

    this.once('parsed', onParsed);
    this.once('error', onError);
  }

  this.end(data);
  return this;
};

PNG.prototype.write = function(data) {
  this._parser.write(data);
  return true;
};

PNG.prototype.end = function(data) {
  this._parser.end(data);
};

PNG.prototype._metadata = function(metadata) {
  this.width = metadata.width;
  this.height = metadata.height;

  this.emit('metadata', metadata);
};

PNG.prototype._gamma = function(gamma) {
  this.gamma = gamma;
};

PNG.prototype._handleClose = function() {
  if (!this._parser.writable && !this._packer.readable) {
    this.emit('close');
  }
};


PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) { // eslint-disable-line max-params
  // coerce pixel dimensions to integers (also coerces undefined -> 0):
  /* eslint-disable no-param-reassign */
  srcX |= 0;
  srcY |= 0;
  width |= 0;
  height |= 0;
  deltaX |= 0;
  deltaY |= 0;
  /* eslint-enable no-param-reassign */

  if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
    throw new Error('bitblt reading outside image');
  }

  if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
    throw new Error('bitblt writing outside image');
  }

  for (var y = 0; y < height; y++) {
    src.data.copy(dst.data,
      ((deltaY + y) * dst.width + deltaX) << 2,
      ((srcY + y) * src.width + srcX) << 2,
      ((srcY + y) * src.width + srcX + width) << 2
    );
  }
};


PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) { // eslint-disable-line max-params

  PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
  return this;
};

PNG.adjustGamma = function(src) {
  if (src.gamma) {
    for (var y = 0; y < src.height; y++) {
      for (var x = 0; x < src.width; x++) {
        var idx = (src.width * y + x) << 2;

        for (var i = 0; i < 3; i++) {
          var sample = src.data[idx + i] / 255;
          sample = Math.pow(sample, 1 / 2.2 / src.gamma);
          src.data[idx + i] = Math.round(sample * 255);
        }
      }
    }
    src.gamma = 0;
  }
};

PNG.prototype.adjustGamma = function() {
  PNG.adjustGamma(this);
};


/***/ }),

/***/ 5331:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";


var assert = __nccwpck_require__(2357).ok;
var zlib = __nccwpck_require__(8761);
var util = __nccwpck_require__(1669);

var kMaxLength = __nccwpck_require__(4293).kMaxLength;

function Inflate(opts) {
  if (!(this instanceof Inflate)) {
    return new Inflate(opts);
  }

  if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
    opts.chunkSize = zlib.Z_MIN_CHUNK;
  }

  zlib.Inflate.call(this, opts);

  // Node 8 --> 9 compatibility check
  this._offset = this._offset === undefined ? this._outOffset : this._offset;
  this._buffer = this._buffer || this._outBuffer;

  if (opts && opts.maxLength != null) {
    this._maxLength = opts.maxLength;
  }
}

function createInflate(opts) {
  return new Inflate(opts);
}

function _close(engine, callback) {
  if (callback) {
    process.nextTick(callback);
  }

  // Caller may invoke .close after a zlib error (which will null _handle).
  if (!engine._handle) {
    return;
  }

  engine._handle.close();
  engine._handle = null;
}

Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
  if (typeof asyncCb === 'function') {
    return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
  }

  var self = this;

  var availInBefore = chunk && chunk.length;
  var availOutBefore = this._chunkSize - this._offset;
  var leftToInflate = this._maxLength;
  var inOff = 0;

  var buffers = [];
  var nread = 0;

  var error;
  this.on('error', function(err) {
    error = err;
  });

  function handleChunk(availInAfter, availOutAfter) {
    if (self._hadError) {
      return;
    }

    var have = availOutBefore - availOutAfter;
    assert(have >= 0, 'have should not go down');

    if (have > 0) {
      var out = self._buffer.slice(self._offset, self._offset + have);
      self._offset += have;

      if (out.length > leftToInflate) {
        out = out.slice(0, leftToInflate);
      }

      buffers.push(out);
      nread += out.length;
      leftToInflate -= out.length;

      if (leftToInflate === 0) {
        return false;
      }
    }

    if (availOutAfter === 0 || self._offset >= self._chunkSize) {
      availOutBefore = self._chunkSize;
      self._offset = 0;
      self._buffer = Buffer.allocUnsafe(self._chunkSize);
    }

    if (availOutAfter === 0) {
      inOff += (availInBefore - availInAfter);
      availInBefore = availInAfter;

      return true;
    }

    return false;
  }

  assert(this._handle, 'zlib binding closed');
  do {
    var res = this._handle.writeSync(flushFlag,
      chunk, // in
      inOff, // in_off
      availInBefore, // in_len
      this._buffer, // out
      this._offset, //out_off
      availOutBefore); // out_len
    // Node 8 --> 9 compatibility check
    res = res || this._writeState;
  } while (!this._hadError && handleChunk(res[0], res[1]));

  if (this._hadError) {
    throw error;
  }

  if (nread >= kMaxLength) {
    _close(this);
    throw new RangeError('Cannot create final Buffer. It would be larger than 0x' + kMaxLength.toString(16) + ' bytes');
  }

  var buf = Buffer.concat(buffers, nread);
  _close(this);

  return buf;
};

util.inherits(Inflate, zlib.Inflate);

function zlibBufferSync(engine, buffer) {
  if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer);
  }
  if (!(buffer instanceof Buffer)) {
    throw new TypeError('Not a string or buffer');
  }

  var flushFlag = engine._finishFlushFlag;
  if (flushFlag == null) {
    flushFlag = zlib.Z_FINISH;
  }

  return engine._processChunk(buffer, flushFlag);
}

function inflateSync(buffer, opts) {
  return zlibBufferSync(new Inflate(opts), buffer);
}

module.exports = exports = inflateSync;
exports.Inflate = Inflate;
exports.createInflate = createInflate;
exports.inflateSync = inflateSync;


/***/ }),

/***/ 3652:
/***/ ((module) => {

"use strict";


var SyncReader = module.exports = function(buffer) {

  this._buffer = buffer;
  this._reads = [];
};

SyncReader.prototype.read = function(length, callback) {

  this._reads.push({
    length: Math.abs(length), // if length < 0 then at most this length
    allowLess: length < 0,
    func: callback
  });
};

SyncReader.prototype.process = function() {

  // as long as there is any data and read requests
  while (this._reads.length > 0 && this._buffer.length) {

    var read = this._reads[0];

    if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {

      // ok there is any data so that we can satisfy this request
      this._reads.shift(); // == read

      var buf = this._buffer;

      this._buffer = buf.slice(read.length);

      read.func.call(this, buf.slice(0, read.length));

    }
    else {
      break;
    }

  }

  if (this._reads.length > 0) {
    return new Error('There are some read requests waitng on finished stream');
  }

  if (this._buffer.length > 0) {
    return new Error('unrecognised content at end of stream');
  }

};


/***/ }),

/***/ 2021:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bezkrovnySsim = void 0;
/**
 * Implements Bezkrovny's ssim-specific logic.
 *
 * Refactor of the TypeScript SSIM implementation by Bezkrovny, modified to match the api of ssim.js
 * and reduce duplication.
 *
 * The original work is available at: https://github.com/igor-bezkrovny/image-quantization which is
 * itself a port of the Java SSIM implementation available at https://github.com/rhys-e/structural-similarity
 * both under MIT license
 *
 * @namespace bezkrovnySsim
 */
var math_1 = __nccwpck_require__(2321);
var matlab_1 = __nccwpck_require__(1514);
/**
 * Generates a SSIM map based on two input image matrices.
 *
 * Images must be a 2-Dimensional grayscale image
 *
 * This method produces a simliar output to `assets/ssim.m` (~1%) when running on Matlab. It's based
 * of Igor Bezkrovny's TypeScript implementation
 *
 * @method bezkrovnySsim
 * @param {Matrix} pixels1 - The reference matrix
 * @param {Matrix} pixels2 - The second matrix to compare against
 * @param {Options} options - The input options parameter
 * @returns {Matrix} ssim_map - A matrix containing the map of computed SSIMs
 * @public
 * @memberOf bezkrovnySsim
 */
function bezkrovnySsim(pixels1, pixels2, options) {
    var windowSize = options.windowSize;
    var width = Math.ceil(pixels1.width / windowSize);
    var height = Math.ceil(pixels1.height / windowSize);
    var data = new Array(width * height);
    var counter = 0;
    for (var y = 0; y < pixels1.height; y += windowSize) {
        for (var x = 0; x < pixels1.width; x += windowSize) {
            var windowWidth = Math.min(windowSize, pixels1.width - x);
            var windowHeight = Math.min(windowSize, pixels1.height - y);
            var values1 = matlab_1.sub(pixels1, x, windowHeight, y, windowWidth);
            var values2 = matlab_1.sub(pixels2, x, windowHeight, y, windowWidth);
            data[counter++] = windowSsim(values1, values2, options);
        }
    }
    return { data: data, width: width, height: height };
}
exports.bezkrovnySsim = bezkrovnySsim;
/**
 * Generates the per-window ssim value
 *
 * @method windowSsim
 * @param {Matrix} values1 - The matrix of the ssim window to compute for image 1
 * @param {Matrix} values2 - The matrix of the ssim window to compute for image 2
 * @param {Options} options - The input options parameter
 * @returns {Number} ssim - The ssim value at the current window
 * @private
 * @memberOf bezkrovnySsim
 */
function windowSsim(_a, _b, _c) {
    var values1 = _a.data;
    var values2 = _b.data;
    var bitDepth = _c.bitDepth, k1 = _c.k1, k2 = _c.k2;
    var L = Math.pow(2, bitDepth) - 1;
    var c1 = Math.pow((k1 * L), 2);
    var c2 = Math.pow((k2 * L), 2);
    var average1 = math_1.average(values1);
    var average2 = math_1.average(values2);
    var σSqx = math_1.variance(values1, average1);
    var σSqy = math_1.variance(values2, average2);
    var σxy = math_1.covariance(values1, values2, average1, average2);
    var numerator = (2 * average1 * average2 + c1) * (2 * σxy + c2);
    var denom1 = Math.pow(average1, 2) + Math.pow(average2, 2) + c1;
    var denom2 = σSqx + σSqy + c2;
    return numerator / (denom1 * denom2);
}
//# sourceMappingURL=bezkrovnySsim.js.map

/***/ }),

/***/ 6430:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.defaults = void 0;
exports.defaults = {
    windowSize: 11,
    k1: 0.01,
    k2: 0.03,
    bitDepth: 8,
    downsample: 'original',
    ssim: 'weber',
    maxSize: 256,
    rgb2grayVersion: 'integer',
};
//# sourceMappingURL=defaults.js.map

/***/ }),

/***/ 8451:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.downsample = void 0;
/**
 * Implements downsampling logic
 *
 * @namespace downsample
 */
var math_1 = __nccwpck_require__(2321);
var matlab_1 = __nccwpck_require__(1514);
/**
 * For a given 2D filter `filter`, downsize image `pixels` by a factor of `f`.
 *
 * @method imageDownsample
 * @param {Matrix} pixels - The matrix to downsample
 * @param {Matrix} filter - The filter to convolve the image with
 * @param {number} f - The downsampling factor (`image size / f`)
 * @returns {Matrix} imdown - The downsampled, filtered image
 * @private
 * @memberOf downsample
 */
function imageDownsample(pixels, filter, f) {
    var imdown = matlab_1.imfilter(pixels, filter, 'symmetric', 'same');
    return matlab_1.skip2d(imdown, [0, f, imdown.height], [0, f, imdown.width]);
}
/**
 * Downsamples images greater than `maxSize` pixels on the smallest direction. If neither image
 * exceeds these dimensions they are returned as they are.
 *
 * It replicates the same logic than the original matlab scripts
 *
 * @method originalDownsample
 * @param {Matrix} pixels1 - The first matrix to downsample
 * @param {Matrix} pixels2 - The second matrix to downsample
 * @param {number} [maxSize=256] - The maximum size on the smallest dimension
 * @returns {[Matrix, Matrix]} ssim_map - A matrix containing the map of computed SSIMs
 * @private
 * @memberOf downsample
 */
function originalDownsample(pixels1, pixels2, maxSize) {
    if (maxSize === void 0) { maxSize = 256; }
    var factor = Math.min(pixels1.width, pixels2.height) / maxSize;
    var f = Math.round(factor);
    if (f > 1) {
        var lpf = matlab_1.ones(f);
        lpf = math_1.divide2d(lpf, math_1.sum2d(lpf));
        pixels1 = imageDownsample(pixels1, lpf, f);
        pixels2 = imageDownsample(pixels2, lpf, f);
    }
    return [pixels1, pixels2];
}
/**
 * Determines the downsizing algorithm to implement (if any) to the reference and target images
 *
 * @method downsample
 * @param {[Matrix, Matrix]} pixels - The first and second matrices to downsample
 * @param {Object} options - The inputs options object
 * @returns {[Matrix, Matrix]} pixels - An array containing the 2 downsized images
 * @public
 * @memberOf downsample
 */
function downsample(pixels, options) {
    if (options.downsample === 'original') {
        return originalDownsample(pixels[0], pixels[1], options.maxSize);
    }
    // else if options.downsample === 'fast' -> the image is downsampled when read (readpixels.js)
    // else do not downsample
    return pixels;
}
exports.downsample = downsample;
//# sourceMappingURL=downsample.js.map

/***/ }),

/***/ 3555:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ssim = exports.getOptions = void 0;
/**
 * SSIM External API
 *
 * @module main
 */
var matlab_1 = __nccwpck_require__(1514);
var math_1 = __nccwpck_require__(2321);
var ssim_1 = __nccwpck_require__(6401);
var originalSsim_1 = __nccwpck_require__(1755);
var bezkrovnySsim_1 = __nccwpck_require__(2021);
var downsample_1 = __nccwpck_require__(8451);
var defaults_1 = __nccwpck_require__(6430);
var weberSsim_1 = __nccwpck_require__(426);
var ssimTargets = {
    fast: ssim_1.ssim,
    original: originalSsim_1.originalSsim,
    bezkrovny: bezkrovnySsim_1.bezkrovnySsim,
    weber: weberSsim_1.weberSsim,
};
function validateOptions(options) {
    Object.keys(options).forEach(function (option) {
        if (!(option in defaults_1.defaults)) {
            throw new Error("\"" + option + "\" is not a valid option");
        }
    });
    if ('k1' in options && (typeof options.k1 !== 'number' || options.k1 < 0)) {
        throw new Error("Invalid k1 value. Default is " + defaults_1.defaults.k1);
    }
    if ('k2' in options && (typeof options.k2 !== 'number' || options.k2 < 0)) {
        throw new Error("Invalid k2 value. Default is " + defaults_1.defaults.k2);
    }
    if (!(options.ssim in ssimTargets)) {
        throw new Error("Invalid ssim option (use: " + Object.keys(ssimTargets).join(', ') + ")");
    }
}
function getOptions(userOptions) {
    var options = __assign(__assign({}, defaults_1.defaults), userOptions);
    validateOptions(options);
    return options;
}
exports.getOptions = getOptions;
function validateDimensions(_a) {
    var pixels1 = _a[0], pixels2 = _a[1], options = _a[2];
    if (pixels1.width !== pixels2.width || pixels1.height !== pixels2.height) {
        throw new Error('Image dimensions do not match');
    }
    return [pixels1, pixels2, options];
}
function toGrayScale(_a) {
    var pixels1 = _a[0], pixels2 = _a[1], options = _a[2];
    if (options.rgb2grayVersion === 'original') {
        return [matlab_1.rgb2gray(pixels1), matlab_1.rgb2gray(pixels2), options];
    }
    else {
        return [matlab_1.rgb2grayInteger(pixels1), matlab_1.rgb2grayInteger(pixels2), options];
    }
}
function toResize(_a) {
    var pixels1 = _a[0], pixels2 = _a[1], options = _a[2];
    var pixels = downsample_1.downsample([pixels1, pixels2], options);
    return [pixels[0], pixels[1], options];
}
function comparison(_a) {
    var pixels1 = _a[0], pixels2 = _a[1], options = _a[2];
    return ssimTargets[options.ssim](pixels1, pixels2, options);
}
/**
 * @method ssim - The ssim method. You can call the package directly or through the `ssim` property.
 * @public
 * @example import mod = from 'ssim.js';
 * mod(imgBuffer1, imgBuffer2);
 * mod.ssim(imgBuffer1, imgBuffer2);
 */
function ssim(image1, image2, userOptions) {
    var start = new Date().getTime();
    var options = getOptions(userOptions);
    var ssimMap = comparison(toResize(toGrayScale(validateDimensions([image1, image2, options]))));
    var mssim = ssimMap.mssim !== undefined
        ? ssimMap.mssim
        : math_1.mean2d(ssimMap);
    return {
        mssim: mssim,
        ssim_map: ssimMap,
        performance: new Date().getTime() - start,
    };
}
exports.ssim = ssim;
exports.default = ssim;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 2321:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.covariance = exports.variance = exports.mean2d = exports.square2d = exports.multiply2d = exports.divide2d = exports.subtract2d = exports.add2d = exports.sum2d = exports.floor = exports.sum = exports.average = void 0;
/**
 * Computes the mean value of a given array. It is the sum of a list of numbers divided by the
 * number of numbers in the list.
 *
 * @method average
 * @param {Number[]} xn - The target array
 * @returns {Number} average - The mean value of all elements within the array
 * @public
 * @memberOf math
 * @since 0.0.1
 */
function average(xn) {
    return sum(xn) / xn.length;
}
exports.average = average;
/**
 * Computes the sum of a given array. It adds all values within the array and returns the total
 *
 * @method sum
 * @param {Number[]} xn - The target array
 * @returns {Number} sum - The total value
 * @private
 * @memberOf math
 * @since 0.0.1
 */
function sum(xn) {
    var out = 0;
    for (var x = 0; x < xn.length; x++) {
        out += xn[x];
    }
    return out;
}
exports.sum = sum;
/**
 * Computes the largest integer less than or equal to a given number for each member of a given
 * array.
 *
 * @method floor
 * @param {Number[]} xn - The target array
 * @returns {Number[]} floorArr - An array with the Math.floor value for each element of the target
 * array
 * @private
 * @memberOf math
 * @since 0.0.1
 */
function floor(xn) {
    var out = new Array(xn.length);
    for (var x = 0; x < xn.length; x++) {
        out[x] = Math.floor(xn[x]);
    }
    return out;
}
exports.floor = floor;
/**
 * Computes the sum of all elements within a matrix
 *
 * @method sum2d
 * @param {Matrix} A - The input matrix
 * @returns {Number} sum - The total value of adding each cell
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function sum2d(_a) {
    var data = _a.data;
    var out = 0;
    for (var x = 0; x < data.length; x++) {
        out += data[x];
    }
    return out;
}
exports.sum2d = sum2d;
/**
 * Adds values of two matrices of the same size
 *
 * @method add2dMx
 * @param {Matrix} A - The first input matrix
 * @param {Matrix} B - The second input matrix
 * @returns {Matrix} out - A matrix with a cell-by-cell sum of `A` and `B`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function add2dMx(_a, _b) {
    var ref1 = _a.data, width = _a.width, height = _a.height;
    var ref2 = _b.data;
    var data = new Array(ref1.length);
    for (var x = 0; x < height; x++) {
        var offset = x * width;
        for (var y = 0; y < width; y++) {
            data[offset + y] = ref1[offset + y] + ref2[offset + y];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Subtracts values of second matrix from the first one. It assumes both matrices are of the same
 * size
 *
 * @method subtract2dMx
 * @param {Matrix} A - The first input matrix
 * @param {Matrix} B - The second input matrix
 * @returns {Matrix} out - A matrix with a cell-by-cell subtraction of `A` minus `B`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function subtract2dMx(_a, _b) {
    var ref1 = _a.data, width = _a.width, height = _a.height;
    var ref2 = _b.data;
    var data = new Array(ref1.length);
    for (var x = 0; x < height; x++) {
        var offset = x * width;
        for (var y = 0; y < width; y++) {
            data[offset + y] = ref1[offset + y] - ref2[offset + y];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Adds a constant value two each matrix cell
 *
 * @method add2dScalar
 * @param {Matrix} A - The first input matrix
 * @param {Number} increase - The value to add
 * @returns {Matrix} B - The cell-by-cell matrix sum of `A` and `increase`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function add2dScalar(_a, increase) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < ref.length; x++) {
        data[x] = ref[x] + increase;
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Adds values of two matrices of the same size or a matrix and a constant
 *
 * @method add2d
 * @param {Matrix} A - The first input matrix
 * @param {Matrix|Number} increase - The second input matrix or the constant value
 * @returns {Matrix} B - A matrix with a cell-by-cell sum of the first and second parameters
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function add2d(A, increase) {
    if (typeof increase === 'number') {
        return add2dScalar(A, increase);
    }
    return add2dMx(A, increase);
}
exports.add2d = add2d;
/**
 * Subtracts values of two matrices of the same size or a matrix and a constant
 *
 * @method subtract2d
 * @param {Matrix} A - The first input matrix
 * @param {Matrix|Number} decrease - The second input matrix or the constant value
 * @returns {Matrix} B - A matrix with a cell-by-cell subtraction of the first parameter minus the
 * second one
 * @public
 * @memberOf math
 */
function subtract2d(A, decrease) {
    if (typeof decrease === 'number') {
        return add2dScalar(A, -decrease);
    }
    return subtract2dMx(A, decrease);
}
exports.subtract2d = subtract2d;
/**
 * Divides each matrix cell by a constant value
 *
 * @method divide2dScalar
 * @param {Matrix} A - The first input matrix
 * @param {Number} divisor - The value to divide by
 * @returns {Matrix} B - The cell-by-cell matrix divison of `A` and `divisor`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function divide2dScalar(_a, divisor) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < ref.length; x++) {
        data[x] = ref[x] / divisor;
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Divides, cell-by-cell, values of two matrices of the same size
 *
 * @method divide2dMx
 * @param {Matrix} A - The first input matrix
 * @param {Matrix} B - The second input matrix
 * @returns {Matrix} out - A matrix with a cell-by-cell division of `A`/`B`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function divide2dMx(_a, _b) {
    var ref1 = _a.data, width = _a.width, height = _a.height;
    var ref2 = _b.data;
    var data = new Array(ref1.length);
    for (var x = 0; x < ref1.length; x++) {
        data[x] = ref1[x] / ref2[x];
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Divides values of two matrices of the same size or between a matrix and a constant
 *
 * @method divide2d
 * @param {Matrix} A - The first input matrix
 * @param {Matrix|Number} divisor - The second input matrix or the constant value
 * @returns {Matrix} B - A matrix with the cell-by-cell division of the first and second parameters
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function divide2d(A, divisor) {
    if (typeof divisor === 'number') {
        return divide2dScalar(A, divisor);
    }
    return divide2dMx(A, divisor);
}
exports.divide2d = divide2d;
/**
 * Multiplies each matrix cell by a constant value
 *
 * @method multiply2dScalar
 * @param {Matrix} A - The first input matrix
 * @param {Number} multiplier - The value to multiply each cell with
 * @returns {Matrix} B - The cell-by-cell matrix multiplication of `A` and `multiplier`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function multiply2dScalar(_a, multiplier) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < ref.length; x++) {
        data[x] = ref[x] * multiplier;
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Multiplies, cell-by-cell, values of two matrices of the same size
 *
 * @method multiply2dMx
 * @param {Matrix} A - The first input matrix
 * @param {Matrix} B - The second input matrix
 * @returns {Matrix} out - A matrix with a cell-by-cell multiplication of `A` * `B`
 * @private
 * @memberOf math
 * @since 0.0.2
 */
function multiply2dMx(_a, _b) {
    var ref1 = _a.data, width = _a.width, height = _a.height;
    var ref2 = _b.data;
    var data = new Array(ref1.length);
    for (var x = 0; x < ref1.length; x++) {
        data[x] = ref1[x] * ref2[x];
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Multiplies values of two matrices of the same size or between a matrix and a constant
 *
 * @method multiply2d
 * @param {Matrix} A - The first input matrix
 * @param {Matrix|Number} multiplier - The second input matrix or the constant value
 * @returns {Matrix} out - A matrix with the cell-by-cell multiplication of the first and second
 * parameters
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function multiply2d(A, multiplier) {
    if (typeof multiplier === 'number') {
        return multiply2dScalar(A, multiplier);
    }
    return multiply2dMx(A, multiplier);
}
exports.multiply2d = multiply2d;
/**
 * Generates the cell-by-cell square value of a target matrix
 *
 * @method square2d
 * @param {Matrix} A - The target matrix
 * @returns {Matrix} B - A matrix with squared value of each cell
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function square2d(A) {
    return multiply2d(A, A);
}
exports.square2d = square2d;
/**
 * Calculates the total mean value for a given matrix
 *
 * @method mean2d
 * @param {Matrix} A - The target matrix
 * @returns {Number} mean - The total mean of each cell
 * @public
 * @memberOf math
 * @since 0.0.2
 */
function mean2d(A) {
    return sum2d(A) / A.data.length;
}
exports.mean2d = mean2d;
/**
 * Computes the variance for a given array
 *
 * @method variance
 * @param {Array<Number>} values - The target array
 * @param {Number} [avg=average(values)] - If specified, it will use this values as the average of
 * the array values. If not, it will compute the actual average
 * @returns {Number} varx - The resulting variance value
 * @public
 * @memberOf math
 */
function variance(values, avg) {
    if (avg === void 0) { avg = average(values); }
    var varx = 0;
    var i = values.length;
    while (i--) {
        varx += Math.pow((values[i] - avg), 2);
    }
    return varx / values.length;
}
exports.variance = variance;
/**
 * Computes the covariance between 2 arrays
 *
 * @method covariance
 * @param {Array<Number>} values1 - The first target array
 * @param {Array<Number>} values2 - The second target array
 * @param {Number} [average1=average(values)] - If specified, it will use this values as the average
 * of the first array. If not, it will compute the actual average
 * @param {Number} [average2=average(values)] - If specified, it will use this values as the average
 * of the second array. If not, it will compute the actual average
 * @returns {Number} cov - The resulting covariance
 * @public
 * @memberOf math
 */
function covariance(values1, values2, average1, average2) {
    if (average1 === void 0) { average1 = average(values1); }
    if (average2 === void 0) { average2 = average(values2); }
    var cov = 0;
    var i = values1.length;
    while (i--) {
        cov += (values1[i] - average1) * (values2[i] - average2);
    }
    return cov / values1.length;
}
exports.covariance = covariance;
//# sourceMappingURL=math.js.map

/***/ }),

/***/ 4138:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.conv2 = void 0;
var math_1 = __nccwpck_require__(2321);
var ones_1 = __nccwpck_require__(9612);
var sub_1 = __nccwpck_require__(4488);
var zeros_1 = __nccwpck_require__(2963);
/**
 * `C = conv2(a,b)` computes the two-dimensional convolution of matrices `a` and `b`. If one of
 * these matrices describes a two-dimensional finite impulse response (FIR) filter, the other matrix
 * is filtered in two dimensions. The size of `c` is determined as follows:
 *
 * ```
 * if [ma,na] = size(a), [mb,nb] = size(b), and [mc,nc] = size(c), then
 * mc = max([ma+mb-1,ma,mb]) and nc = max([na+nb-1,na,nb]).
 * ```
 *
 * `shape` returns a subsection of the two-dimensional convolution, based on one of these values for
 * the parameter:
 *
 * - **full**: Returns the full two-dimensional convolution (default).
 * - **same**: Returns the central part of the convolution of the same size as `a`.
 * - **valid**: Returns only those parts of the convolution that are computed without the
 *   zero-padded edges. Using this option, `size(c) === max([ma-max(0,mb-1),na-max(0,nb-1)],0)`
 *
 * @method mxConv2
 * @param {Matrix} a - The first matrix
 * @param {Matrix} b - The second matrix
 * @param {String} [shape='full'] - One of 'full' / 'same' / 'valid'
 * @returns {Matrix} c - Returns the convolution filtered by `shape`
 * @private
 * @memberOf matlab
 */
function mxConv2(_a, b, shape) {
    var ref = _a.data, refWidth = _a.width, refHeight = _a.height;
    if (shape === void 0) { shape = 'full'; }
    var cWidth = refWidth + b.width - 1;
    var cHeight = refHeight + b.height - 1;
    var data = zeros_1.zeros(cHeight, cWidth).data;
    /**
     * Computing the convolution is the most computentionally intensive task for SSIM and we do it
     * several times.
     *
     * This section has been optimized for performance and readability suffers.
     */
    for (var r1 = 0; r1 < b.height; r1++) {
        for (var c1 = 0; c1 < b.width; c1++) {
            var br1c1 = b.data[r1 * b.width + c1];
            if (br1c1) {
                for (var i = 0; i < refHeight; i++) {
                    for (var j = 0; j < refWidth; j++) {
                        data[(i + r1) * cWidth + j + c1] += ref[i * refWidth + j] * br1c1;
                    }
                }
            }
        }
    }
    var c = {
        data: data,
        width: cWidth,
        height: cHeight,
    };
    return reshape(c, shape, refHeight, b.height, refWidth, b.width);
}
/**
 * `C = boxConv(a,b)` computes the two-dimensional convolution of a matrix `a` and box kernel `b`.
 *
 * The `shape` parameter returns a subsection of the two-dimensional convolution as defined by
 * mxConv2.
 *
 * @method boxConv
 * @param {Matrix} a - The first matrix
 * @param {Matrix} b - The box kernel
 * @param {String} [shape='full'] - One of 'full' / 'same' / 'valid'
 * @returns {Matrix} c - Returns the convolution filtered by `shape`
 * @private
 * @memberOf matlab
 */
function boxConv(a, _a, shape) {
    var data = _a.data, width = _a.width, height = _a.height;
    if (shape === void 0) { shape = 'full'; }
    var b1 = ones_1.ones(height, 1);
    var b2 = ones_1.ones(1, width);
    var out = convn(a, b1, b2, shape);
    return math_1.multiply2d(out, data[0]);
}
/**
 * Determines whether all values in an array are the same so that the kernel can be treated as a box
 * kernel
 *
 * @method isBoxKernel
 * @param {Matrix} a - The input matrix
 * @returns {Boolean} boxKernel - Returns true if all values in the matrix are the same, false
 * otherwise
 * @private
 * @memberOf matlab
 */
function isBoxKernel(_a) {
    var data = _a.data;
    var expected = data[0];
    for (var i = 1; i < data.length; i++) {
        if (data[i] !== expected) {
            return false;
        }
    }
    return true;
}
/**
 * `C = convn(a,b1, b2)` computes the two-dimensional convolution of matrices `a.*b1.*b2`.
 *
 * The size of `c` is determined as follows:
 *
 * ```
 * if [ma,na] = size(a), [mb] = size(b1), [nb] = size(b2) and [mc,nc] = size(c), then
 * mc = max([ma+mb-1,ma,mb]) and nc = max([na+nb-1,na,nb]).
 * ```
 *
 * `shape` returns a section of the two-dimensional convolution, based on one of these values for
 * the parameter:
 *
 * - **full**: Returns the full two-dimensional convolution (default).
 * - **same**: Returns the central part of the convolution of the same size as `a`.
 * - **valid**: Returns only those parts of the convolution that are computed without the
 *   zero-padded edges. Using this option, `size(c) === max([ma-max(0,mb-1),na-max(0,nb-1)],0)`
 *
 * This method mimics Matlab's `convn` method but limited to 2 1 dimensional kernels.
 *
 * @method convn
 * @param {Matrix} a - The first matrix
 * @param {Matrix} b1 - The first 1-D kernel
 * @param {Matrix} b2 - The second 1-D kernel
 * @param {String} [shape='full'] - One of 'full' / 'same' / 'valid'
 * @returns {Matrix} c - Returns the convolution filtered by `shape`
 * @private
 * @memberOf matlab
 */
function convn(a, b1, b2, shape) {
    if (shape === void 0) { shape = 'full'; }
    var mb = Math.max(b1.height, b1.width);
    var nb = Math.max(b2.height, b2.width);
    var temp = mxConv2(a, b1, 'full');
    var c = mxConv2(temp, b2, 'full');
    return reshape(c, shape, a.height, mb, a.width, nb);
}
/**
 * `reshape` crops the resulting convolution matrix to match the values specified in `shape`.
 *
 * - **full**: Returns the input
 * - **same**: Returns the central part of the convolution of the same size as `a`.
 * - **valid**: Returns only those parts of the convolution that are computed without the
 *   zero-padded edges
 *
 * @method reshape
 * @param {Matrix} c - The output matrix
 * @param {String} shape - One of 'full' / 'same' / 'valid'
 * @param {Number} ma - The number of rows of the input matrix
 * @param {Number} mb - The number of rows of the input filter
 * @param {Number} na - The number of columns of the input matrix
 * @param {Number} nb - The number of columns of the input filter
 * @returns {Matrix} c - Returns the input convolution filtered by `shape`
 * @private
 * @memberOf matlab
 */
function reshape(c, shape, ma, mb, na, nb) {
    if (shape === 'full') {
        return c;
    }
    else if (shape === 'same') {
        var rowStart = Math.ceil((c.height - ma) / 2);
        var colStart = Math.ceil((c.width - na) / 2);
        return sub_1.sub(c, rowStart, ma, colStart, na);
    }
    return sub_1.sub(c, mb - 1, ma - mb + 1, nb - 1, na - nb + 1);
}
/**
 * `C = conv2(a,b)` computes the two-dimensional convolution of matrices `a` and `b`. If one of
 * these matrices describes a two-dimensional finite impulse response (FIR) filter, the other matrix
 * is filtered in two dimensions.
 *
 * The size of `c` is determined as follows:
 *
 * ```
 * if [ma,na] = size(a), [mb,nb] = size(b), and [mc,nc] = size(c), then
 * mc = max([ma+mb-1,ma,mb]) and nc = max([na+nb-1,na,nb]).
 * ```
 *
 * `shape` returns a subsection of the two-dimensional convolution, based on one of these values for
 * the parameter:
 *
 * - **full**: Returns the full two-dimensional convolution (default).
 * - **same**: Returns the central part of the convolution of the same size as `a`.
 * - **valid**: Returns only those parts of the convolution that are computed without the
 *   zero-padded edges. Using this option, `size(c) === max([ma-max(0,mb-1),na-max(0,nb-1)],0)`
 *
 * Alternatively, 2 1-D filters may be provided as parameters, following the format:
 * `conv2(a, b1, b2, shape)`. This is similar to Matlab's implementation allowing any number of 1-D
 * filters to be applied but limited to 2
 *
 * This method mimics Matlab's `conv2` method.
 *
 * Given:
 * const A = rand(3);
 * const B = rand(4);
 *
 * @example conv2(A,B); // output is 6-by-6
 * {
 *   data: [
 *     0.1838, 0.2374, 0.9727, 1.2644, 0.7890, 0.3750,
 *     0.6929, 1.2019, 1.5499, 2.1733, 1.3325, 0.3096,
 *     0.5627, 1.5150, 2.3576, 3.1553, 2.5373, 1.0602,
 *     0.9986, 2.3811, 3.4302, 3.5128, 2.4489, 0.8462,
 *     0.3089, 1.1419, 1.8229, 2.1561, 1.6364, 0.6841,
 *     0.3287, 0.9347, 1.6464, 1.7928, 1.2422, 0.5423
 *   ],
 *   width: 6,
 *   height: 6
 * }
 *
 * @example conv2(A,B,'same') => // output is the same size as A: 3-by-3
 * {
 *   data: [
 *     2.3576, 3.1553, 2.5373,
 *     3.4302, 3.5128, 2.4489,
 *     1.8229, 2.1561, 1.6364
 *   ],
 *   width: 3,
 *   height: 3
 * }
 *
 * @method conv2
 * @param {Array} args - The list of arguments, see `mxConv2` and `convn` for the exact parameters
 * @returns {Matrix} c - Returns the convolution filtered by `shape`
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function conv2() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (args[2] && args[2].data) {
        return convn.apply(void 0, args);
    }
    else if (isBoxKernel(args[1])) {
        return boxConv.apply(void 0, args);
    }
    return mxConv2.apply(void 0, args);
}
exports.conv2 = conv2;
//# sourceMappingURL=conv2.js.map

/***/ }),

/***/ 2183:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.filter2 = void 0;
var conv2_1 = __nccwpck_require__(4138);
/**
 * Rotates a matrix 180deg.
 *
 * @example
 * 1 2 3 4  becomes:  8 7 6 5
 * 5 6 7 8            4 3 2 1
 *
 * @method rotate1802d
 * @param {Matrix} mx - The input matrix
 * @returns {Matrix} out - The rotated matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function rotate1802d(_a) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            data[i * width + j] = ref[(height - 1 - i) * width + width - 1 - j];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Given a matrix X and a two-dimensional FIR filter h, filter2 rotates your filter matrix 180
 * degrees to create a convolution kernel. It then calls conv2, the two-dimensional convolution
 * function, to implement the filtering operation.
 *
 * This method mimics Matlab's `filter2` method
 *
 * @method filter2
 * @param {Matrix} h - The FIR filter
 * @param {Matrix} X - The input matrix
 * @param string [shape='same'] - The convolution shape
 * @returns {Matrix} conv - The 2D convolution of X with h
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function filter2(h, X, shape) {
    if (shape === void 0) { shape = 'same'; }
    return conv2_1.conv2(X, rotate1802d(h), shape);
}
exports.filter2 = filter2;
//# sourceMappingURL=filter2.js.map

/***/ }),

/***/ 1143:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fspecial = void 0;
var math_1 = __nccwpck_require__(2321);
/**
 * Creates a matrix of lenght `2 * length + 1` with values being the sum of the square of the
 * distance for each component from the center. E.g:
 *
 * For a length of 5 it results in a matrix size of 11. Looking at [0, 0] (distance: [-5, -5] from
 * the center), the value at that position becomes `-5^2 + -5^2 = 50`
 *
 * @method rangeSquare2d
 * @param {Number} length - The maxium distance from the matrix center
 * @returns {Matrix} mx - The generated matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function rangeSquare2d(length) {
    var size = length * 2 + 1;
    var data = new Array(Math.pow(size, 2));
    for (var x = 0; x < size; x++) {
        for (var y = 0; y < size; y++) {
            data[x * size + y] = Math.pow((x - length), 2) + Math.pow((y - length), 2);
        }
    }
    return {
        data: data,
        width: size,
        height: size,
    };
}
/**
 * Applies a gaussian filter of sigma to a given matrix
 *
 * @method gaussianFilter2d
 * @param {Matrix} A - The input matrix
 * @param {Number} σ - The sigma value
 * @returns {Matrix} B - The matrix with the gaussian filter applied
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function gaussianFilter2d(_a, σ) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < ref.length; x++) {
        data[x] = Math.exp(-ref[x] / (2 * Math.pow(σ, 2)));
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Create predefined 2-D filter
 *
 * `h = fspecial(type, parameters)` accepts the filter specified by type plus additional modifying
 * parameters particular to the type of filter chosen. If you omit these arguments, fspecial uses
 * default values for the parameters.
 *
 * This method mimics Matlab's `fspecial2` method with `type = 'gaussian'`. `hsize` cannot be a
 * vector (unlike Matlab's implementation), only a Number is accepted.
 *
 * `h = fspecial('gaussian', hsize, sigma)` returns a rotationally symmetric Gaussian lowpass filter
 * of size `hsize` with standard deviation sigma (positive). In this implementation `hsize` will
 * always be a scalar, which will result in `h` being a square matrix.
 *
 * The gaussian logic follows: hg(hsize) = e^(-2*hsize^2 / 2σ^2)
 *
 * @example
 *   fspecial('gaussian', 3, 1.5) === {
 *     data: [
 *       0.094742, 0.118318, 0.094742,
 *       0.118318, 0.147761, 0.118318,
 *       0.094742, 0.118318, 0.094742
 *     ],
 *     width: 3,
 *     height: 3
 *   };
 *
 * @method fspecial
 * @param {String} [type='gaussian'] - The type of 2D filter to create (coerced to 'gaussian')
 * @param {Number} [hsize=3] - The length of the filter
 * @param {Number} [σ=1.5] - The filter sigma value
 * @returns {Matrix} c - Returns the central part of the convolution of the same
 * size as `a`.
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function fspecial(_type, hsize, σ) {
    if (hsize === void 0) { hsize = 3; }
    if (σ === void 0) { σ = 1.5; }
    hsize = (hsize - 1) / 2;
    var pos = rangeSquare2d(hsize);
    var gauss = gaussianFilter2d(pos, σ);
    var total = math_1.sum2d(gauss);
    return math_1.divide2d(gauss, total);
}
exports.fspecial = fspecial;
//# sourceMappingURL=fspecial.js.map

/***/ }),

/***/ 1777:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.imfilter = void 0;
var mod_1 = __nccwpck_require__(1188);
var padarray_1 = __nccwpck_require__(6133);
var math_1 = __nccwpck_require__(2321);
var filter2_1 = __nccwpck_require__(2183);
/**
 * Adds padding to input matrix A
 *
 * @method padMatrix
 * @param {Matrix} A - The target matrix
 * @param {Number} frows - The number of rows in the filter
 * @param {Number} fcols - The number of columns in the filter
 * @param {String} pad - The type of padding to apply
 * @param {Matrix} B - The padded input matrix
 * @private
 * @memberOf matlab
 */
function padMatrix(A, frows, fcols, pad) {
    A = padarray_1.padarray(A, math_1.floor([frows / 2, fcols / 2]), pad);
    if (mod_1.mod(frows, 2) === 0) {
        // remove the last row
        A.data = A.data.slice(0, -A.width);
        A.height--;
    }
    if (mod_1.mod(fcols, 2) === 0) {
        // remove the last column
        var data = [];
        for (var x = 0; x < A.data.length; x++) {
            if ((x + 1) % A.width !== 0) {
                data.push(A.data[x]);
            }
        }
        A.data = data;
        A.width--;
    }
    return A;
}
/**
 * Gets the `shape` parameter for `conv2` based on the `resSize` parameter for `imfilter`. In most
 * cases they are equivalent except for when `resSize` equals "same" which is converted to "valid".
 *
 * @method getConv2Size
 * @param {String} resSize - The format to use for the `imfilter` call
 * @returns {String} shape - The shape value to use for `conv2`
 * @private
 * @memberOf matlab
 */
function getConv2Size(resSize) {
    if (resSize === 'same') {
        resSize = 'valid';
    }
    return resSize;
}
/**
 * `B = imfilter(A,f)` filters a 2-dimensional array `A` with the 2-dimensional filter `f`. The
 * result `B` has the same size as `A`.
 *
 * `imfilter` computes each element of the output, `B`. If `A` is an integer, `imfilter` will not
 * truncate the output elements that exceed the range, and it will not round fractional values.
 *
 * This method mimics Matlab's `imfilter` method with `padval = 'symmetric'` without integer
 * rounding. No other options have been implemented and, if set, they will be ignored.
 *
 * @method imfilter
 * @param {Matrix} A - The target matrix
 * @param {Matrix} f - The filter to apply
 * @param {String} [pad="symmetric"] - The type of padding. Only "symmetric" is implemented
 * @param {String} [resSize="same"] - The format to use for the filter size. Valid values are:
 * "same", "valid" and "full"
 * @returns {Matrix} B - The filtered array
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function imfilter(A, f, pad, resSize) {
    if (pad === void 0) { pad = 'symmetric'; }
    if (resSize === void 0) { resSize = 'same'; }
    A = padMatrix(A, f.width, f.height, pad);
    resSize = getConv2Size(resSize);
    return filter2_1.filter2(f, A, resSize);
}
exports.imfilter = imfilter;
//# sourceMappingURL=imfilter.js.map

/***/ }),

/***/ 1514:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Implements Matlab functions or functionality.
 *
 * The goal here is not a perfect reproduction of matlab logic but just a minimal implementation
 * needed to correctly reproduce the SSIM matlab script.
 *
 * That means that functionality used will be implemented but additional / unused parameters will
 * not.
 *
 * @namespace matlab
 */
__exportStar(__nccwpck_require__(4138), exports);
__exportStar(__nccwpck_require__(2183), exports);
__exportStar(__nccwpck_require__(1143), exports);
__exportStar(__nccwpck_require__(1777), exports);
__exportStar(__nccwpck_require__(479), exports);
__exportStar(__nccwpck_require__(9612), exports);
__exportStar(__nccwpck_require__(6133), exports);
__exportStar(__nccwpck_require__(3505), exports);
__exportStar(__nccwpck_require__(1756), exports);
__exportStar(__nccwpck_require__(4488), exports);
__exportStar(__nccwpck_require__(8187), exports);
__exportStar(__nccwpck_require__(2963), exports);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 38:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.numbers = void 0;
/**
 * Create a matrix with each cell with the value of `num`
 *
 * @method numbers
 * @param {Number} height - The number of rows
 * @param {Number} width - The number of columns
 * @param {Number} num - The value to set on each cell
 * @returns {Matrix} B - An n-by-m matrix of `num`
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function numbers(height, width, num) {
    var size = width * height;
    var data = new Array(size);
    for (var x = 0; x < size; x++) {
        data[x] = num;
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
exports.numbers = numbers;
//# sourceMappingURL=numbers.js.map

/***/ }),

/***/ 1188:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.mod = void 0;
/**
 * `M = mod(X,Y)` returns the remainder `X - Y.*floor(X./Y)` for nonzero `Y`, and returns `X`
 * otherwise. `mod(X,Y)` always differs from `X` by a multiple of `Y`.
 *
 * So long as operands `X` and `Y` are of the same sign, the function `mod(X,Y)` returns the same
 * result as does `rem(X,Y)`. However, for positive `X` and `Y`, `mod(-x,y) = rem(-x,y)+y`.
 *
 * The mod function is useful for congruence relationships: x and y are congruent (mod m) if and
 * only if mod(x,m) == mod(y,m).
 *
 * This method mimics Matlab's `mod` method
 *
 * @method mod
 * @param {Number} x - The dividend
 * @param {Numvwe} y - The divisor
 * @returns {Number} M - Returns the signed remainder after division.
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function mod(x, y) {
    return x - y * Math.floor(x / y);
}
exports.mod = mod;
//# sourceMappingURL=mod.js.map

/***/ }),

/***/ 479:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.normpdf = void 0;
/**
 * `Y = normpdf(X,μ,σ)` computes the pdf at each of the values in `X` using the normal
 * distribution with mean `μ` and standard deviation `σ`. `X`, `μ`, and `σ` can be vectors,
 * matrices, or multidimensional arrays that all have the same size. A scalar input is expanded to a
 * constant array with the same dimensions as the other inputs. The parameters in `σ` must be
 * positive.
 *
 * The normal pdf is: `y = f(x|μ,σ) = (1 / (σ√(2π))) * e^(-(x-μ)^2/2σ^2)`
 *
 * The likelihood function is the pdf viewed as a function of the parameters. Maximum likelihood
 * estimators (MLEs) are the values of the parameters that maximize the likelihood function for a
 * fixed value of `x`.
 *
 * The standard normal distribution has `µ = 0` and `σ = 1`.
 * If x is standard normal, then `xσ + µ` is also normal with mean `µ` and standard deviation `σ`.
 * Conversely, if `y` is normal with mean `µ` and standard deviation `σ`, then `x = (y – µ) / σ` is
 * standard normal.
 *
 * `Y = normpdf(X)` uses the standard normal distribution (`µ = 0`, `σ = 1`).
 * `Y = normpdf(X,µ)` uses the normal distribution with unit standard deviation (`σ = 1`).
 *
 * @example normpdf({ data: [2, 1, 0, 1, 2], width: 5, height: 1 }, 0, 1.5) =>
 *   { data: [ 0.10934, 0.21297, 0.26596, 0.21297, 0.10934], width: 5, height: 1 }
 *
 * @method normpdf
 * @param {Matrix} X - The input matrix
 * @param {Number} [µ=0] - The length of the filter
 * @param {Number} [σ=1] - The filter sigma value
 * @returns {Matrix} Y - Returns the central part of the convolution of the same
 * size as `a`.
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function normpdf(_a, µ, σ) {
    var ref = _a.data, width = _a.width, height = _a.height;
    if (µ === void 0) { µ = 0; }
    if (σ === void 0) { σ = 1; }
    // data = ((2 * pi)^(-1 / 2)) * exp(-((x - µ) / σ)^2 / 2) / σ;
    var SQ2PI = 2.506628274631000502415765284811;
    var data = new Array(ref.length);
    for (var i = 0; i < ref.length; i++) {
        var z = (ref[i] - µ) / σ;
        data[i] = Math.exp(-(Math.pow(z, 2)) / 2) / (σ * SQ2PI);
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
exports.normpdf = normpdf;
//# sourceMappingURL=normpdf.js.map

/***/ }),

/***/ 9612:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ones = void 0;
var numbers_1 = __nccwpck_require__(38);
/**
 * Create a matrix of all ones
 *
 * This method mimics Matlab's `ones` method
 *
 * @method ones
 * @param {Number} height - The height of the matrix (rows)
 * @param {Number} [width=height] - The width of the matrix (columns)
 * @returns {Matrix} B - An n-by-m matrix of ones
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function ones(height, width) {
    if (width === void 0) { width = height; }
    return numbers_1.numbers(height, width, 1);
}
exports.ones = ones;
//# sourceMappingURL=ones.js.map

/***/ }),

/***/ 6133:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.padarray = void 0;
var mod_1 = __nccwpck_require__(1188);
/**
 * Mirrors a matrix horizontally.
 *
 * @example
 * 1 2 3 4  becomes:  4 3 2 1
 * 5 6 7 8            8 7 6 5
 *
 * @method mirrorHorizonal
 * @param {Matrix} A - The input matrix
 * @returns {Matrix} B - The rotated matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function mirrorHorizonal(_a) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < height; x++) {
        for (var y = 0; y < width; y++) {
            data[x * width + y] = ref[x * width + width - 1 - y];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Mirrors a matrix vertically.
 *
 * @example
 * 1 2 3 4  becomes:  9 0 F E
 * 5 6 7 8            5 6 7 8
 * 9 0 F E            1 2 3 4
 *
 * @method mirrorVertical
 * @param {Matrix} A - The input matrix
 * @returns {Matrix} B - The rotated matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function mirrorVertical(_a) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(ref.length);
    for (var x = 0; x < height; x++) {
        for (var y = 0; y < width; y++) {
            data[x * width + y] = ref[(height - 1 - x) * width + y];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * Concatenates 2 matrices of the same height horizontally.
 *
 * @example
 * 1 2   3 4  becomes:  1 2 3 4
 * 5 6   7 8            5 6 7 8
 *
 * @method concatHorizontal
 * @param {Matrix} A - The first matrix
 * @param {Matrix} B - The second matrix
 * @returns {Matrix} out - The combined matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function concatHorizontal(A, B) {
    var width = A.width + B.width;
    var data = new Array(A.height * width);
    for (var x = 0; x < A.height; x++) {
        for (var y = 0; y < A.width; y++) {
            data[x * width + y] = A.data[x * A.width + y];
        }
        for (var y = 0; y < B.width; y++) {
            data[x * width + y + A.width] = B.data[x * B.width + y];
        }
    }
    return {
        data: data,
        width: width,
        height: A.height,
    };
}
/**
 * Concatenates 2 matrices of the same height vertically.
 *
 * @example
 * 1 2   3 4  becomes:  1 2
 * 5 6   7 8            5 6
 *                      3 4
 *                      7 8
 *
 * @method concatVertical
 * @param {Matrix} A - The first matrix
 * @param {Matrix} B - The second matrix
 * @returns {Matrix} out - The combined matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function concatVertical(A, B) {
    return {
        data: A.data.concat(B.data),
        height: A.height + B.height,
        width: A.width,
    };
}
/**
 * Adds 2 * `pad` cells to a matrix horizontally. The values used are mirrored from the input
 * matrix.
 *
 * @example
 * with padding 1:
 * 1 2 3 4   becomes:  1 1 2 3 4 4
 * 5 6 7 8             5 5 6 7 8 8
 *
 * With padding 2:
 * 1 2 3 4   becomes:  2 1 1 2 3 4 4 3
 * 5 6 7 8             6 5 5 6 7 8 8 7
 *
 * @method padHorizontal
 * @param {Matrix} A - The input matrix
 * @param {Number} pad - The nummber of cells to add to each side (left / right)
 * @returns {Matrix} B - The padded matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function padHorizontal(A, pad) {
    var width = A.width + 2 * pad;
    var data = new Array(width * A.height);
    var mirrored = concatHorizontal(A, mirrorHorizonal(A));
    for (var x = 0; x < A.height; x++) {
        for (var y = -pad; y < A.width + pad; y++) {
            data[x * width + y + pad] =
                mirrored.data[x * mirrored.width + mod_1.mod(y, mirrored.width)];
        }
    }
    return {
        data: data,
        width: width,
        height: A.height,
    };
}
/**
 * Adds 2 * `pad` cells to a matrix vertically. The values used are mirrored from the input
 * matrix.
 *
 * @example
 * with padding 1:
 * 1 2 3 4   becomes:  1 2 3 4
 * 5 6 7 8             1 2 3 4
 *                     5 6 7 8
 *                     5 6 7 8
 * With padding 2:
 * 1 2 3 4   becomes:  5 6 7 8
 * 5 6 7 8             1 2 3 4
 *                     1 2 3 4
 *                     5 6 7 8
 *                     5 6 7 8
 *                     1 2 3 4
 *
 * @method padVertical
 * @param {Matrix} A - The input matrix
 * @param {Number} pad - The nummber of cells to add to each side (top / bottom)
 * @returns {Matrix} B - The padded matrix
 * @private
 * @memberOf matlab
 * @since 0.0.2
 */
function padVertical(A, pad) {
    var mirrored = concatVertical(A, mirrorVertical(A));
    var height = A.height + pad * 2;
    var data = new Array(A.width * height);
    for (var x = -pad; x < A.height + pad; x++) {
        for (var y = 0; y < A.width; y++) {
            data[(x + pad) * A.width + y] =
                mirrored.data[mod_1.mod(x, mirrored.height) * A.width + y];
        }
    }
    return {
        data: data,
        width: A.width,
        height: height,
    };
}
/**
 * Implements `padarray` matching Matlab only for the case where:
 *
 * `padHeight <= A.height && padWidth <= A.width`
 *
 * For an input Matrix `E`, we add padding A, B, C, D, F, G, H and I of size `padHeight` and
 * `padWidth` where appropriate. For instance, given E:
 *
 * 1 2 3
 * 4 5 6
 *
 * Placed in a padding matrix like this:
 *
 * | A | B | C |
 * |---|---|---|
 * | D | E | F |
 * |---|---|---|
 * | G | H | I |
 *
 * with padding [1, 1] it becomes:
 *
 * | 1 | 1 2 3 | 3 |
 * |---|-------|---|
 * | 1 | 1 2 3 | 3 |
 * | 4 | 4 5 6 | 6 |
 * |---|-------|---|
 * | 4 | 4 5 6 | 6 |
 *
 * with padding [2, 3] it becomes:
 *
 * | 6 5 4 | 4 5 6 | 6 5 4 |
 * | 3 2 1 | 1 2 3 | 3 2 1 |
 * |-------|-------|-------|
 * | 3 2 1 | 1 2 3 | 3 2 1 |
 * | 6 5 4 | 4 5 6 | 6 5 4 |
 * |-------|-------|-------|
 * | 6 5 4 | 4 5 6 | 6 5 4 |
 * | 3 2 1 | 1 2 3 | 3 2 1 |
 *
 * @method fastPadding
 * @param {Matrix} A - The input matrix
 * @param {Array<number>} padding - An array where the first element is the padding to apply to each
 * side on each row and the second one is the vertical padding for each side of each column
 * @returns {Matrix} B - The padded matrix
 * @private
 * @memberOf matlab
 * @since 0.0.4
 */
function fastPadding(A, _a) {
    var padHeight = _a[0], padWidth = _a[1];
    var width = A.width + padWidth * 2;
    var height = A.height + padHeight * 2;
    var data = new Array(width * height);
    for (var x = -padHeight; x < 0; x++) {
        // A
        for (var y = -padWidth; y < 0; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(Math.abs(x) - 1) * A.width + Math.abs(y) - 1];
        }
        // B
        for (var y = 0; y < A.width; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(Math.abs(x) - 1) * A.width + y];
        }
        // C
        for (var y = A.width; y < A.width + padWidth; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(Math.abs(x) - 1) * A.width + 2 * A.width - y - 1];
        }
    }
    for (var x = 0; x < A.height; x++) {
        // D
        for (var y = -padWidth; y < 0; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[x * A.width + Math.abs(y) - 1];
        }
        // E
        for (var y = 0; y < A.width; y++) {
            data[(x + padHeight) * width + y + padWidth] = A.data[x * A.width + y];
        }
        // F
        for (var y = A.width; y < A.width + padWidth; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[x * A.width + 2 * A.width - y - 1];
        }
    }
    for (var x = A.height; x < A.height + padHeight; x++) {
        // G
        for (var y = -padWidth; y < 0; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(2 * A.height - x - 1) * A.width + Math.abs(y) - 1];
        }
        // H
        for (var y = 0; y < A.width; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(2 * A.height - x - 1) * A.width + y];
        }
        // I
        for (var y = A.width; y < A.width + padWidth; y++) {
            data[(x + padHeight) * width + y + padWidth] =
                A.data[(2 * A.height - x - 1) * A.width + 2 * A.width - y - 1];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
/**
 * `B = padarray(A,padsize)` pads array `A`. padsize is a vector of nonnegative integers that
 * specifies both, the amount of padding to add and the dimension along which to add it. The value
 * of an element in the vector specifies the amount of padding to add. The order of the element in
 * the vector specifies the dimension along which to add the padding.
 *
 * For example, a padsize value of `[2 3]` means add 2 elements of padding along the first dimension
 * and 3 elements of padding along the second dimension.
 *
 * By default, paddarray adds padding before the first element and after the last element along the
 * specified dimension.
 *
 * `B = padarray(A,padsize,padval)` pads array `A` where `padval` specifies the value to use as the
 * pad value. `padval` can only be 'symmetric' for this implementation of `padarray` which will pad
 * the array with mirror reflections of itself.
 *
 * This method mimics Matlab's `padarray` method with `padval = 'symmetric'` and
 * `direction = 'both'`. No other options have been implemented and, if set, they will be ignored.
 *
 * This method has been unfolded for performance and switched to simple for loops. Readability
 * suffers.
 *
 * @method padarray
 * @param {Matrix} A - The target matrix
 * @param {Array<number>} padding - An array where the first element is the padding to apply to
 * each side on each row and the second one is the vertical padding for each side of each column
 * @param {String} [padval='symmetric'] - The type of padding to apply (coerced to 'symmetric')
 * @param {String} [direction='both'] - The direction to which apply padding (coerced to 'both')
 * @returns {Matrix} c - An array with padding added on each side.
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function padarray(A, _a, _padval, _direction) {
    var padHeight = _a[0], padWidth = _a[1];
    // If the padding to mirror is not greater than `A` dimensions, we can use `fastPadding`,
    // otherwise we fall back to a slower implementation that mimics Matlab behavior for longer
    // matrices
    if (A.height >= padHeight && A.width >= padWidth) {
        return fastPadding(A, [padHeight, padWidth]);
    }
    return padVertical(padHorizontal(A, padWidth), padHeight);
}
exports.padarray = padarray;
//# sourceMappingURL=padarray.js.map

/***/ }),

/***/ 3505:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.rgb2grayInteger = exports.rgb2gray = void 0;
/**
 * Converts an imageData object of { width, height, data } into a 2d matrix [row, column]
 * where the value is the grayscale equivalent of the rgb input.
 *
 * This method mimics Matlab's `rgb2gray` method
 *
 * @method rgb2gray
 * @param {Matrix | ImageData} imageData - The input imageData
 * @returns {Object} grayscale - A grayscale representation of the input image
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function rgb2gray(_a) {
    var d = _a.data, width = _a.width, height = _a.height;
    var uint8Array = new Uint8Array(width * height);
    for (var i = 0; i < d.length; i += 4) {
        var grayIndex = i / 4;
        /**
         * These values are not derived from ITU's recommendation of: [0.2126,
         * 0.7152, 0.0722] for [r, g, b] but on Matlab's implementation of [0.2989,
         * 0.5870, 0.1140]
         *
         * Note that values are rounded to ensure an exact match with the original
         * results. Rounding them would NOT lead to higher accuracy since the exact
         * values for RGB to grayscale conversion are somewhat arbitrary (as shown
         * by the differences between ITU and Matlab).
         *
         * ± 0.5 pixel differences won't be perceptible for the human eye and will
         * have a small impact on SSIM. Based on some sample data changes were of
         * the order of 10^-3.
         */
        uint8Array[grayIndex] =
            0.29894 * d[i] + 0.58704 * d[i + 1] + 0.11402 * d[i + 2] + 0.5;
    }
    return {
        data: Array.from(uint8Array),
        width: width,
        height: height,
    };
}
exports.rgb2gray = rgb2gray;
function rgb2grayInteger(_a) {
    var d = _a.data, width = _a.width, height = _a.height;
    var array = new Array(width * height);
    for (var i = 0; i < d.length; i += 4) {
        var grayIndex = i / 4;
        array[grayIndex] = (77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2] + 128) >> 8;
    }
    return {
        data: array,
        width: width,
        height: height,
    };
}
exports.rgb2grayInteger = rgb2grayInteger;
//# sourceMappingURL=rgb2gray.js.map

/***/ }),

/***/ 1756:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.skip2d = void 0;
/**
 * Generates a matrix based on input `mx` but excluding items based on their modulo and their
 * position in the original matrix.
 *
 * It's a crude implementation of Matlab's `A(1:f:end,1:f:end)` syntax where the first parameter
 * is the matrix, the next one is an array describing the rows to skip [start position, every `f`
 * elements an end position] and the last one follows the same syntax for columns.
 *
 * @example
 * ```
 * img1(1:f:end,1:f:end)
 *
 * ```
 *
 * becomes:
 *
 * ```
 * skip2d(img1, [0, f, img1.length], [0, f, img1[0].length])
 * ```
 *
 * Note that the start index is 0 since, unlike Matlab's, arrays start at 0. Also, unlike in Matlab,
 * `f` must be an integer greater than or equal to 1.
 *
 * @method skip2d
 * @param {Matrix} A - The input matrix
 * @param {Array<number>} - start row, every row, end row
 * @param {Array<number>} - start col, every col, end col
 * @returns {Matrix} B - The downsized matrix
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function skip2d(A, _a, _b) {
    var startRow = _a[0], everyRow = _a[1], endRow = _a[2];
    var startCol = _b[0], everyCol = _b[1], endCol = _b[2];
    var width = Math.ceil((endCol - startCol) / everyCol);
    var height = Math.ceil((endRow - startRow) / everyRow);
    var data = new Array(width * height);
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            var Ai = startRow + i * everyRow;
            var Aj = startCol + j * everyCol;
            data[i * width + j] = A.data[Ai * A.width + Aj];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
exports.skip2d = skip2d;
//# sourceMappingURL=skip2d.js.map

/***/ }),

/***/ 4488:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sub = void 0;
/**
 * Crops the matrix and returns a window at position `[x,y]` of size `[xlen, ylen]` from the input
 * matrix
 *
 * @method sub
 * @param {Matrix} A - The input matrix
 * @param {Number} x - The starting x offset
 * @param {Number} height - The vertical size of the window
 * @param {Number} y - The starting y offset
 * @param {Number} width - The horizontal size of the window
 * @returns {Matrix} B - The generated subwindow from matrix `c`
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function sub(_a, x, height, y, width) {
    var ref = _a.data, refWidth = _a.width;
    var data = new Array(width * height);
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            data[i * width + j] = ref[(y + i) * refWidth + x + j];
        }
    }
    return {
        data: data,
        width: width,
        height: height,
    };
}
exports.sub = sub;
//# sourceMappingURL=sub.js.map

/***/ }),

/***/ 8187:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.transpose = void 0;
/**
 * Transposes a vector or a matrix
 *
 * This method mimics Matlab's `transpose` method (which equals to the `A.'` syntax)
 *
 * `B = A.'` returns the nonconjugate transpose of A, that is, interchanges the row and column index
 * for each element.
 *
 * This method does not handle complex or imaginary numbers
 *
 * @method transpose
 * @param {Matrix} A - The matrix to transpose
 * @returns {Matrix} B - The transposed matrix
 * @public
 * @memberOf matlab
 */
function transpose(_a) {
    var ref = _a.data, width = _a.width, height = _a.height;
    var data = new Array(width * height);
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            data[j * height + i] = ref[i * width + j];
        }
    }
    return {
        data: data,
        height: width,
        width: height,
    };
}
exports.transpose = transpose;
//# sourceMappingURL=transpose.js.map

/***/ }),

/***/ 2963:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.zeros = void 0;
var numbers_1 = __nccwpck_require__(38);
/**
 * Create a matrix of all zeros
 *
 * This method mimics Matlab's `zeros` method
 *
 * @method zeros
 * @param {Number} height - The height of the matrix (rows)
 * @param {Number} [width=height] - The width of the matrix (columns)
 * @returns {Matrix} B - An n-by-m matrix of zeros
 * @public
 * @memberOf matlab
 * @since 0.0.2
 */
function zeros(height, width) {
    if (width === void 0) { width = height; }
    return numbers_1.numbers(height, width, 0);
}
exports.zeros = zeros;
//# sourceMappingURL=zeros.js.map

/***/ }),

/***/ 1755:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.originalSsim = void 0;
/* eslint-disable max-statements */
// Exceeding max-statements to preserve the structure of the original Matlab script
var math_1 = __nccwpck_require__(2321);
var matlab_1 = __nccwpck_require__(1514);
/**
 * Generates a SSIM map based on two input image matrices. For images greater than 512 pixels, it
 * will downsample them.
 *
 * Images must be a 2-Dimensional grayscale image
 *
 * This method is a line-by-line port of `assets/ssim.m`. Some operations are more verbose here
 * since more logic is needed in JS to manipulate matrices than in Matlab
 *
 * Note that setting `options1.k1` and `options.k2` to 0 will generate the UQI (Universal Quality
 * Index), since it's a special case of SSIM. In general that's undesierable since `k1` and `k2`
 * contribute to the stabilization coeficients `c1` and `c2`.
 *
 * For a mathematically equivalent and more efficient implementation check `./ssim.js`.
 *
 * @method originalSsim
 * @param {Matrix} pixels1 - The reference matrix
 * @param {Matrix} pixels2 - The second matrix to compare against
 * @param {Object} options - The input options parameter
 * @returns {Matrix} ssim_map - A matrix containing the map of computed SSIMs
 * @public
 * @memberOf ssim
 * @since 0.0.2
 */
function originalSsim(pixels1, pixels2, options) {
    var w = matlab_1.fspecial('gaussian', options.windowSize, 1.5);
    var L = Math.pow(2, options.bitDepth) - 1;
    var c1 = Math.pow((options.k1 * L), 2);
    var c2 = Math.pow((options.k2 * L), 2);
    w = math_1.divide2d(w, math_1.sum2d(w));
    var μ1 = matlab_1.filter2(w, pixels1, 'valid');
    var μ2 = matlab_1.filter2(w, pixels2, 'valid');
    var μ1Sq = math_1.square2d(μ1);
    var μ2Sq = math_1.square2d(μ2);
    var μ12 = math_1.multiply2d(μ1, μ2);
    var pixels1Sq = math_1.square2d(pixels1);
    var pixels2Sq = math_1.square2d(pixels2);
    var σ1Sq = math_1.subtract2d(matlab_1.filter2(w, pixels1Sq, 'valid'), μ1Sq);
    var σ2Sq = math_1.subtract2d(matlab_1.filter2(w, pixels2Sq, 'valid'), μ2Sq);
    var σ12 = math_1.subtract2d(matlab_1.filter2(w, math_1.multiply2d(pixels1, pixels2), 'valid'), μ12);
    if (c1 > 0 && c2 > 0) {
        var num1 = math_1.add2d(math_1.multiply2d(μ12, 2), c1);
        var num2 = math_1.add2d(math_1.multiply2d(σ12, 2), c2);
        var denom1 = math_1.add2d(math_1.add2d(μ1Sq, μ2Sq), c1);
        var denom2 = math_1.add2d(math_1.add2d(σ1Sq, σ2Sq), c2);
        return math_1.divide2d(math_1.multiply2d(num1, num2), math_1.multiply2d(denom1, denom2));
    }
    var numerator1 = math_1.multiply2d(μ12, 2);
    var numerator2 = math_1.multiply2d(σ12, 2);
    var denominator1 = math_1.add2d(μ1Sq, μ2Sq);
    var denominator2 = math_1.add2d(σ1Sq, σ2Sq);
    return math_1.divide2d(math_1.multiply2d(numerator1, numerator2), math_1.multiply2d(denominator1, denominator2));
}
exports.originalSsim = originalSsim;
//# sourceMappingURL=originalSsim.js.map

/***/ }),

/***/ 6401:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ssim = void 0;
/**
 * Implements all ssim-specific logic.
 *
 * Reproduces the original SSIM matlab scripts. For a direct comparison you may want to check the
 * scripts contained within `/assets`
 *
 * @namespace ssim
 */
var math_1 = __nccwpck_require__(2321);
var matlab_1 = __nccwpck_require__(1514);
/**
 * Generates a SSIM map based on two input image matrices. For images greater than 512 pixels, it
 * will downsample by default (unless `options.downsample` is set to falsy).
 *
 * Images must be a 2-Dimensional grayscale image
 *
 * This method produces the same exact output than `assets/ssim.m` when running on Matlab. It's
 * mathematically equivalent but it is not a line-by-line port. If you want a line-by-line port
 * check `originalSsim`. Several performance optimizations have been made here to achieve greater
 * performance.
 *
 * @method ssim
 * @param {Matrix} pixels1 - The reference matrix
 * @param {Matrix} pixels2 - The second matrix to compare against
 * @param {Options} options - The input options parameter
 * @returns {Matrix} ssim_map - A matrix containing the map of computed SSIMs
 * @public
 * @memberOf ssim
 */
function ssim(pixels1, pixels2, options) {
    var w = matlab_1.normpdf(getRange(options.windowSize), 0, 1.5);
    var L = Math.pow(2, options.bitDepth) - 1;
    var c1 = Math.pow((options.k1 * L), 2);
    var c2 = Math.pow((options.k2 * L), 2);
    w = math_1.divide2d(w, math_1.sum2d(w));
    var wt = matlab_1.transpose(w);
    var μ1 = matlab_1.conv2(pixels1, w, wt, 'valid');
    var μ2 = matlab_1.conv2(pixels2, w, wt, 'valid');
    var μ1Sq = math_1.square2d(μ1);
    var μ2Sq = math_1.square2d(μ2);
    var μ12 = math_1.multiply2d(μ1, μ2);
    var pixels1Sq = math_1.square2d(pixels1);
    var pixels2Sq = math_1.square2d(pixels2);
    var σ1Sq = math_1.subtract2d(matlab_1.conv2(pixels1Sq, w, wt, 'valid'), μ1Sq);
    var σ2Sq = math_1.subtract2d(matlab_1.conv2(pixels2Sq, w, wt, 'valid'), μ2Sq);
    var σ12 = math_1.subtract2d(matlab_1.conv2(math_1.multiply2d(pixels1, pixels2), w, wt, 'valid'), μ12);
    if (c1 > 0 && c2 > 0) {
        return genSSIM(μ12, σ12, μ1Sq, μ2Sq, σ1Sq, σ2Sq, c1, c2);
    }
    return genUQI(μ12, σ12, μ1Sq, μ2Sq, σ1Sq, σ2Sq);
}
exports.ssim = ssim;
/**
 * Generates a range of distances of size `2n+1` with increments of 1 and centered at 0.
 *
 * @example `getRange(2) => [2 1 0 1 2]
 * @method getRange
 * @param {Number} size - The maximum distance from the center
 * @returns {Matrix} out - The generated vector
 * @private
 * @memberOf ssim
 */
function getRange(size) {
    var offset = Math.floor(size / 2);
    var data = new Array(offset * 2 + 1);
    for (var x = -offset; x <= offset; x++) {
        data[x + offset] = Math.abs(x);
    }
    return {
        data: data,
        width: data.length,
        height: 1,
    };
}
/**
 * Generates the ssim_map based on the intermediate values of the convolutions of the input with the
 * gaussian filter.
 *
 * These methods apply when K1 or K2 are not 0 (non UQI)
 *
 * @method genSSIM
 * @param {Matrix} μ12 - The cell-by cell multiplication of both images convolved
 * with the gaussian filter
 * @param {Matrix} σ12 - The convolution of cell-by cell multiplication of both
 * images minus μ12
 * @param {Matrix} μ1Sq - The convolution of image1 with the gaussian filter squared
 * @param {Matrix} μ2Sq - The convolution of image2 with the gaussian filter squared
 * @param {Matrix} σ1Sq - The convolution of image1^2, minus μ1Sq
 * @param {Matrix} σ2Sq - The convolution of image2^2, minus μ2Sq
 * @param {Number} c1 - The first stability constant
 * @param {Number} c2 - The second stability constant
 * @returns {Matrix} ssim_map - The generated map of SSIM values at each window
 * @private
 * @memberOf ssim
 */
function genSSIM(μ12, σ12, μ1Sq, μ2Sq, σ1Sq, σ2Sq, c1, c2) {
    var num1 = math_1.add2d(math_1.multiply2d(μ12, 2), c1);
    var num2 = math_1.add2d(math_1.multiply2d(σ12, 2), c2);
    var denom1 = math_1.add2d(math_1.add2d(μ1Sq, μ2Sq), c1);
    var denom2 = math_1.add2d(math_1.add2d(σ1Sq, σ2Sq), c2);
    return math_1.divide2d(math_1.multiply2d(num1, num2), math_1.multiply2d(denom1, denom2));
}
/**
 * Generates the Universal Quality Index (UQI) ssim_map based on the intermediate values of the
 * convolutions of the input with the gaussian filter.
 *
 * These methods apply when K1 or K2 are 0 (UQI)
 *
 * @method genUQI
 * @param {Matrix} μ12 - The cell-by cell multiplication of both images convolved
 * with the gaussian filter
 * @param {Matrix} σ12 - The convolution of cell-by cell multiplication of both
 * images minus μ12
 * @param {Matrix} μ1Sq - The convolution of image1 with the gaussian filter squared
 * @param {Matrix} μ2Sq - The convolution of image2 with the gaussian filter squared
 * @param {Matrix} σ1Sq - The convolution of image1^2, minus μ1Sq
 * @param {Matrix} σ2Sq - The convolution of image2^2, minus μ2Sq
 * @returns {Matrix} ssim_map - The generated map of SSIM values at each window
 * @private
 * @memberOf ssim
 */
function genUQI(μ12, σ12, μ1Sq, μ2Sq, σ1Sq, σ2Sq) {
    var numerator1 = math_1.multiply2d(μ12, 2);
    var numerator2 = math_1.multiply2d(σ12, 2);
    var denominator1 = math_1.add2d(μ1Sq, μ2Sq);
    var denominator2 = math_1.add2d(σ1Sq, σ2Sq);
    return math_1.divide2d(math_1.multiply2d(numerator1, numerator2), math_1.multiply2d(denominator1, denominator2));
}
//# sourceMappingURL=ssim.js.map

/***/ }),

/***/ 426:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.weberSsim = exports.windowCovariance = exports.windowVariance = exports.windowSums = exports.windowMatrix = exports.partialSumMatrix2 = exports.partialSumMatrix1 = void 0;
function edgeHandler(w, h, sumArray, matrixWidth) {
    var rightEdge = sumArray[h * matrixWidth + w + 1];
    var bottomEdge = sumArray[(h + 1) * matrixWidth + w];
    var bottomRightEdge = sumArray[(h + 1) * matrixWidth + w + 1];
    return { rightEdge: rightEdge, bottomEdge: bottomEdge, bottomRightEdge: bottomRightEdge };
}
function partialSumMatrix1(pixels, f) {
    var width = pixels.width, height = pixels.height, data = pixels.data;
    var matrixWidth = width + 1;
    var matrixHeight = height + 1;
    var sumArray = new Int32Array(matrixWidth * matrixHeight);
    for (var h = height - 1; h >= 0; --h) {
        for (var w = width - 1; w >= 0; --w) {
            var _a = edgeHandler(w, h, sumArray, matrixWidth), rightEdge = _a.rightEdge, bottomEdge = _a.bottomEdge, bottomRightEdge = _a.bottomRightEdge;
            sumArray[h * matrixWidth + w] =
                f(data[h * width + w], w, h) + rightEdge + bottomEdge - bottomRightEdge;
        }
    }
    return { data: sumArray, height: matrixHeight, width: matrixWidth };
}
exports.partialSumMatrix1 = partialSumMatrix1;
function partialSumMatrix2(pixels1, pixels2, f) {
    var width = pixels1.width, height = pixels1.height, data1 = pixels1.data;
    var data2 = pixels2.data;
    var matrixWidth = width + 1;
    var matrixHeight = height + 1;
    var sumArray = new Int32Array(matrixWidth * matrixHeight);
    for (var h = height - 1; h >= 0; --h) {
        for (var w = width - 1; w >= 0; --w) {
            var _a = edgeHandler(w, h, sumArray, matrixWidth), rightEdge = _a.rightEdge, bottomEdge = _a.bottomEdge, bottomRightEdge = _a.bottomRightEdge;
            var offset = h * width + w;
            sumArray[h * matrixWidth + w] =
                f(data1[offset], data2[offset], w, h) +
                    rightEdge +
                    bottomEdge -
                    bottomRightEdge;
        }
    }
    return { data: sumArray, height: matrixHeight, width: matrixWidth };
}
exports.partialSumMatrix2 = partialSumMatrix2;
function windowMatrix(sumMatrix, windowSize, divisor) {
    var matrixWidth = sumMatrix.width, matrixHeight = sumMatrix.height, sumArray = sumMatrix.data;
    var imageWidth = matrixWidth - 1;
    var imageHeight = matrixHeight - 1;
    var windowWidth = imageWidth - windowSize + 1;
    var windowHeight = imageHeight - windowSize + 1;
    var windows = new Int32Array(windowWidth * windowHeight);
    for (var h = 0; h < imageHeight; ++h) {
        for (var w = 0; w < imageWidth; ++w) {
            if (w < windowWidth && h < windowHeight) {
                var sum = 
                // value at (w,h)
                sumArray[matrixWidth * h + w] -
                    // value at (w+windowSize,h) == right side
                    sumArray[matrixWidth * h + w + windowSize] -
                    // value at (w,h+windowSize) == bottom side
                    sumArray[matrixWidth * (h + windowSize) + w] +
                    // value at (w+windowSize, h+windowSize) == bottomRight corner
                    sumArray[matrixWidth * (h + windowSize) + w + windowSize];
                windows[h * windowWidth + w] = sum / divisor;
            }
        }
    }
    return { height: windowHeight, width: windowWidth, data: windows };
}
exports.windowMatrix = windowMatrix;
function windowSums(pixels, windowSize) {
    return windowMatrix(partialSumMatrix1(pixels, function (a) { return a; }), windowSize, 1);
}
exports.windowSums = windowSums;
function windowVariance(pixels, sums, windowSize) {
    var varianceCalculation = function (v) { return v * v; };
    var windowSquared = windowSize * windowSize;
    var varX = windowMatrix(partialSumMatrix1(pixels, varianceCalculation), windowSize, 1);
    for (var i = 0; i < sums.data.length; ++i) {
        var mean = sums.data[i] / windowSquared;
        var sumSquares = varX.data[i] / windowSquared;
        var squareMeans = mean * mean;
        varX.data[i] = 1024 * (sumSquares - squareMeans);
    }
    return varX;
}
exports.windowVariance = windowVariance;
function windowCovariance(pixels1, pixels2, sums1, sums2, windowSize) {
    var covarianceCalculation = function (a, b) { return a * b; };
    var windowSquared = windowSize * windowSize;
    var covXY = windowMatrix(partialSumMatrix2(pixels1, pixels2, covarianceCalculation), windowSize, 1);
    for (var i = 0; i < sums1.data.length; ++i) {
        covXY.data[i] =
            1024 *
                (covXY.data[i] / windowSquared -
                    (sums1.data[i] / windowSquared) * (sums2.data[i] / windowSquared));
    }
    return covXY;
}
exports.windowCovariance = windowCovariance;
/**
 * Generates a SSIM map based on two input image matrices.
 * Weber SSIM is an SSIM algorithm that operates in linear time by building
 * partial sum arrays of values, variances, and covariances, making each lookup
 * performable in constant time and each variance calculation, only performed
 * once.
 *
 * Images must be a 2-Dimensional grayscale image.
 *
 * @method weberSsim
 * @param {ImageMatrix} pixels1 - The reference matrix
 * @param {ImageMatrix} pixels2 - The second matrix to compare against
 * @param {Options} options - The input options parameter
 * @returns {ImageMatrix} ssim_map - A matrix containing the map of computed
 * SSIMs
 * @public
 * @memberOf weberSsim
 */
function weberSsim(pixels1, pixels2, options) {
    var bitDepth = options.bitDepth, k1 = options.k1, k2 = options.k2, windowSize = options.windowSize;
    var L = Math.pow(2, bitDepth) - 1;
    var c1 = k1 * L * (k1 * L);
    var c2 = k2 * L * (k2 * L);
    var windowSquared = windowSize * windowSize;
    var pixels1Rounded = __assign(__assign({}, pixels1), { data: Int32Array.from(pixels1.data, function (v) { return v + 0.5; }) });
    var pixels2Rounded = __assign(__assign({}, pixels2), { data: Int32Array.from(pixels2.data, function (v) { return v + 0.5; }) });
    var sums1 = windowSums(pixels1Rounded, windowSize);
    var variance1 = windowVariance(pixels1Rounded, sums1, windowSize);
    var sums2 = windowSums(pixels2Rounded, windowSize);
    var variance2 = windowVariance(pixels2Rounded, sums2, windowSize);
    var covariance = windowCovariance(pixels1Rounded, pixels2Rounded, sums1, sums2, windowSize);
    var size = sums1.data.length;
    var mssim = 0;
    var ssims = new Array(size);
    for (var i = 0; i < size; ++i) {
        var meanx = sums1.data[i] / windowSquared;
        var meany = sums2.data[i] / windowSquared;
        var varx = variance1.data[i] / 1024;
        var vary = variance2.data[i] / 1024;
        var cov = covariance.data[i] / 1024;
        var na = 2 * meanx * meany + c1;
        var nb = 2 * cov + c2;
        var da = meanx * meanx + meany * meany + c1;
        var db = varx + vary + c2;
        var ssim = (na * nb) / da / db;
        ssims[i] = ssim;
        if (i == 0) {
            mssim = ssim;
        }
        else {
            mssim = mssim + (ssim - mssim) / (i + 1);
        }
    }
    return { data: ssims, width: sums1.width, height: sums1.height, mssim: mssim };
}
exports.weberSsim = weberSsim;
//# sourceMappingURL=weberSsim.js.map

/***/ }),

/***/ 2940:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 2357:
/***/ ((module) => {

"use strict";
module.exports = require("assert");;

/***/ }),

/***/ 4293:
/***/ ((module) => {

"use strict";
module.exports = require("buffer");;

/***/ }),

/***/ 3129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");;

/***/ }),

/***/ 8614:
/***/ ((module) => {

"use strict";
module.exports = require("events");;

/***/ }),

/***/ 5747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 5622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 2413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ }),

/***/ 1669:
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ }),

/***/ 8761:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(6816);
/******/ })()
;
//# sourceMappingURL=diff-process.js.map