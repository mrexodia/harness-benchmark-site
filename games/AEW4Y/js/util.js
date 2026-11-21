/* Small drawing utilities for the 320x180 pixel canvas. */
(function (global) {
  'use strict';

  // Draw a string-art sprite. '.' denotes transparent.
  // rows may be ragged; they are padded automatically.
  function sprite(ctx, rows, x, y, scale, colors, flipX) {
    scale = scale || 1;
    var w = 0;
    for (var i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    for (var ry = 0; ry < rows.length; ry++) {
      var row = rows[ry];
      for (var rx = 0; rx < row.length; rx++) {
        var ch = row[rx];
        if (ch === '.' || ch === ' ') continue;
        var col = colors[ch];
        if (!col) continue;
        var px = flipX ? (w - 1 - rx) : rx;
        ctx.fillStyle = col;
        ctx.fillRect(x + px * scale, y + ry * scale, scale, scale);
      }
    }
    return { w: w * scale, h: rows.length * scale };
  }

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  // Deterministic pseudo random in [0,1) from an integer seed.
  function hash01(n) {
    var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Linear interpolation.
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Parse "#rrggbb" into [r,g,b].
  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function rgb(r, g, b) { return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  function mix(c1, c2, t) {
    var a = hex(c1), b = hex(c2);
    return rgb(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  }

  // Horizontal band gradient between y0,y1 across n steps of colors.
  function bandGradient(ctx, x, y, w, h, colors) {
    var n = colors.length - 1;
    for (var i = 0; i < h; i++) {
      var t = h <= 1 ? 0 : i / (h - 1);
      var seg = Math.min(n - 1, Math.floor(t * n));
      var lt = (t - seg / n) * n;
      ctx.fillStyle = mix(colors[seg], colors[seg + 1], lt);
      ctx.fillRect(x, y + i, w, 1);
    }
  }

  // If a value is a function, call it, else return it. Used for animatable values.
  function val(v, t) { return typeof v === 'function' ? v(t) : v; }

  global.PX = {
    sprite: sprite,
    rect: rect,
    hash01: hash01,
    lerp: lerp,
    mix: mix,
    hex: hex,
    rgb: rgb,
    bandGradient: bandGradient,
    val: val
  };
})(window);
