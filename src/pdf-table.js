// based on
// https://github.com/florpor/pdf-table-extractor

Image = function(){ };

// import pdfjs
PDFJS = require('pdf.js-extract/lib/pdfjs/pdf');
PDFJS.workerSrc = 'pdf.js-extract/lib/pdfjs/pdf.worker.js'
PDFJS.cMapUrl = 'pdf.js-extract/lib/cmaps/';
PDFJS.cMapPacked = true;

// HACK few hacks to let PDF.js be loaded not as a module in global space.
function xmlEncode(s){
  var i = 0, ch;
  s = String(s);
  while (i < s.length && (ch = s[i]) !== '&' && ch !== '<' &&
         ch !== '\"' && ch !== '\n' && ch !== '\r' && ch !== '\t') {
    i++;
  }
  if (i >= s.length) {
    return s;
  }
  var buf = s.substring(0, i);
  while (i < s.length) {
    ch = s[i++];
    switch (ch) {
      case '&':
        buf += '&amp;';
        break;
      case '<':
        buf += '&lt;';
        break;
      case '\"':
        buf += '&quot;';
        break;
      case '\n':
        buf += '&#xA;';
        break;
      case '\r':
        buf += '&#xD;';
        break;
      case '\t':
        buf += '&#x9;';
        break;
      default:
        buf += ch;
        break;
    }
  }
  return buf;
}

global.btoa = function btoa(chars) {
  var digits =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var buffer = '';
    var i, n;
    for (i = 0, n = chars.length; i < n; i += 3) {
      var b1 = chars.charCodeAt(i) & 0xFF;
      var b2 = chars.charCodeAt(i + 1) & 0xFF;
      var b3 = chars.charCodeAt(i + 2) & 0xFF;
      var d1 = b1 >> 2, d2 = ((b1 & 3) << 4) | (b2 >> 4);
      var d3 = i + 1 < n ? ((b2 & 0xF) << 2) | (b3 >> 6) : 64;
      var d4 = i + 2 < n ? (b3 & 0x3F) : 64;
      buffer += (digits.charAt(d1) + digits.charAt(d2) +
      digits.charAt(d3) + digits.charAt(d4));
    }
  return buffer;
};

function DOMElement(name) {
  this.nodeName = name;
  this.childNodes = [];
  this.attributes = {};
  this.textContent = '';

  if (name === 'style') {
    this.sheet = {
      cssRules: [],
      insertRule: function (rule) {
        this.cssRules.push(rule);
      },
    };
  }
}

DOMElement.prototype = {

  setAttributeNS: function DOMElement_setAttributeNS(NS, name, value) {
    value = value || '';
    value = xmlEncode(value);
    this.attributes[name] = value;
  },

  appendChild: function DOMElement_appendChild(element) {
    if (this.childNodes.indexOf(element) === -1) {
      this.childNodes.push(element);
      element.parentNode = this;
    }
  },

  toString: function DOMElement_toString() {
    var attrList = [];
    for (i in this.attributes) {
      attrList.push(i + '="' + xmlEncode(this.attributes[i]) + '"');
    }

    if (this.nodeName === 'svg:tspan' || this.nodeName === 'svg:style') {
      var encText = xmlEncode(this.textContent);
      return '<' + this.nodeName + ' ' + attrList.join(' ') + '>' +
             encText + '</' + this.nodeName + '>';
    } else if (this.nodeName === 'svg:svg') {
      var ns = 'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
               'xmlns:svg="http://www.w3.org/2000/svg"'
      return '<' + this.nodeName + ' ' + ns + ' ' + attrList.join(' ') + '>' +
             this.childNodes.join('') + '</' + this.nodeName + '>';
    } else {
      return '<' + this.nodeName + ' ' + attrList.join(' ') + '>' +
             this.childNodes.join('') + '</' + this.nodeName + '>';
    }
  },

  cloneNode: function DOMElement_cloneNode() {
    var newNode = new DOMElement(this.nodeName);
    newNode.childNodes = this.childNodes;
    newNode.attributes = this.attributes;
    newNode.textContent = this.textContent;
    return newNode;
  },

  remove: function DOMElement_remove() {
    if (this.parentNode) {
      return this.parentNode.removeChild(this);
    }
  },

  removeChild: function DOMElement_removeChild(element) {
    const index = this.childNodes.indexOf(element);

    if (index > -1) {
      this.childNodes = this.childNodes.splice(index, 1);
    }
  },
}

global.document = {
  childNodes : [],

  get currentScript() {
    return { src: '' };
  },

  get documentElement() {
    return this;
  },

  createElementNS: function (NS, element) {
    var elObject = new DOMElement(element);
    return elObject;
  },

  createElement: function (element) {
    return this.createElementNS('', element);
  },

  getElementsByTagName: function (element) {
    if (element === 'head') {
      return [this.head || (this.head = new DOMElement('head'))];
    }
    return [];
  }
};

pdfTableExtractorParse = function(doc, options) {
  var numPages = doc.numPages;
  var result = {};
  result.pageTables = [];
  result.numPages = numPages;
  result.currentPages = 0;

  var transform_fn = function(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  };

  var applyTransform_fn = function(p, m) {
    var xt = p[0] * m[0] + p[1] * m[2] + m[4];
    var yt = p[0] * m[1] + p[1] * m[3] + m[5];
    return [xt, yt];
  };


  var lastPromise = Promise.resolve(); // will be used to chain promises
  var loadPage = function (pageNum) {
    return doc.getPage(pageNum).then(function (page) {
      var verticles = [];
      var horizons = [];
      var merges = {};
      var merge_alias = {};
      var transformMatrix = [1,0,0,1,0,0];;
      var transformStack = [];

      return page.getOperatorList().then(function (opList) {
              // Get rectangle first
              var showed = {};
              var REVOPS = [];
              for (var op in PDFJS.OPS) {
                  REVOPS[PDFJS.OPS[op]] = op;
              }

              var strokeRGBColor = null;
              var fillRGBColor = null;
              var current_x, current_y;
              var edges = [];
              var line_max_width = 2;

              const maxEdgesPerPage = options.maxEdgesPerPage || Number.MAX_VALUE;

              while (opList.fnArray.length) {
                  var fn = opList.fnArray.shift();
                  var args = opList.argsArray.shift();
                  if (PDFJS.OPS.constructPath == fn) {
                      while (args[0].length) {
                          op = args[0].shift();
                          if (op == PDFJS.OPS.rectangle) {
                              x = args[1].shift();
                              y = args[1].shift();
                              width = args[1].shift();
                              height = args[1].shift();
                              if (Math.min(width, height) < line_max_width) {
                                  edges.push({y:y, x:x, width:width, height:height, transform: transformMatrix});

                                  if (edges.length > maxEdgesPerPage) {
                                      // return no table
                                      return {};
                                  }
                              }
                          } else if (op == PDFJS.OPS.moveTo) {
                              current_x = args[1].shift();
                              current_y = args[1].shift();
                          } else if (op == PDFJS.OPS.lineTo) {
                              x = args[1].shift();
                              y = args[1].shift();
                              if (current_x == x) {
                                  edges.push({y: Math.min(y, current_y), x: x - lineWidth / 2, width: lineWidth, height: Math.abs(y - current_y), transform: transformMatrix});
                              } else if (current_y == y) {
                                  edges.push({x: Math.min(x, current_x), y: y - lineWidth / 2, height: lineWidth, width: Math.abs(x - current_x), transform: transformMatrix});
                              }
                              current_x = x;
                              current_y = y;

                              if (edges.length > maxEdgesPerPage) {
                                  // return no table
                                  return {};
                              }
                          } else {
                              // throw ('constructPath ' + op);
                          }
                      }
                  } else if (PDFJS.OPS.save == fn) {
                      transformStack.push(transformMatrix);
                  } else if (PDFJS.OPS.restore == fn ){
                      transformMatrix = transformStack.pop();
                  } else if (PDFJS.OPS.transform == fn) {
                      transformMatrix = transform_fn(transformMatrix, args);
                  } else if (PDFJS.OPS.setStrokeRGBColor == fn) {
                      strokeRGBColor = args;
                  } else if (PDFJS.OPS.setFillRGBColor == fn) {
                      fillRGBColor = args;
                  } else if (PDFJS.OPS.setLineWidth == fn) {
                      lineWidth = args[0];
                  } else if (['eoFill'].indexOf(REVOPS[fn]) >= 0) {
                  } else if ('undefined' === typeof(showed[fn])) {
                      showed[fn] = REVOPS[fn];
                  } else {
                  }
              }

              edges = edges.map(function(edge){
                      var point1 = applyTransform_fn([edge.x, edge.y], edge.transform);
                      var point2 = applyTransform_fn([edge.x + edge.width, edge.y + edge.height], edge.transform);
                      return {
                        x: Math.min(point1[0], point2[0]),
                        y: Math.min(point1[1], point2[1]),
                        width: Math.abs(point1[0] - point2[0]),
                        height: Math.abs(point1[1] - point2[1]),
                      };
              });
              // merge rectangle to verticle lines and horizon lines
              edges1 = JSON.parse(JSON.stringify(edges));
              edges1.sort(function(a, b){ return (a.x - b.x) || (a.y - b.y); });
              edges2 = JSON.parse(JSON.stringify(edges));
              edges2.sort(function(a, b){ return (a.y - b.y) || (a.x - b.x); });

              // get verticle lines
              var current_x = null;
              var current_y = null;
              var current_height = 0;
              var lines = [];
              var lines_add_verticle = function(lines, top, bottom){
                  var hit = false;
                  for (var i = 0; i < lines.length; i ++) {
                      if (lines[i].bottom < top || lines[i].top > bottom) {
                          continue;
                      }
                      hit = true;

                      top = Math.min(lines[i].top, top);
                      bottom = Math.max(lines[i].bottom, bottom);
                      new_lines = [];
                      if (i > 1) {
                          news_lines = lines.slice(0, i - 1);
                      }
                      new_lines = new_lines.concat(lines.slice(i + 1));
                      lines = new_lines;
                      return lines_add_verticle(lines, top, bottom);
                  }
                  if (!hit) {
                      lines.push({top: top, bottom: bottom});
                  }
                  return lines;
              };

              while (edge = edges1.shift()) {
                  // skip horizon lines
                  if (edge.width > line_max_width) {
                      continue;
                  }

                  // new verticle lines
                  if (null === current_x || edge.x - current_x > line_max_width) {
                      if (current_height > line_max_width) {
                          lines = lines_add_verticle(lines, current_y, current_y + current_height);
                      }
                      if (null !== current_x && lines.length) {
                          verticles.push({x: current_x, lines: lines});
                      }
                      current_x = edge.x;
                      current_y = edge.y;
                      current_height = 0;
                      lines = [];
                  }

                  if (Math.abs(current_y + current_height - edge.y) < 10) {
                      current_height = edge.height + edge.y - current_y;
                  } else {
                      if (current_height > line_max_width) {
                          lines = lines_add_verticle(lines, current_y, current_y + current_height);
                      }
                      current_y = edge.y;
                      current_height = edge.height;
                  }
              }
              if (current_height > line_max_width) {
                  lines = lines_add_verticle(lines, current_y, current_y + current_height);
              }

              // no table
              if (current_x === null || lines.length == 0) {
                  return {};
              }
              verticles.push({x: current_x, lines: lines});

              // Get horizon lines
              current_x = null;
              current_y = null;
              var current_width = 0;
              var lines_add_horizon = function(lines, left, right){
                  var hit = false;
                  for (var i = 0; i < lines.length; i ++) {
                      if (lines[i].right < left || lines[i].left > right) {
                          continue;
                      }
                      hit = true;

                      left = Math.min(lines[i].left, left);
                      right = Math.max(lines[i].right, right);
                      new_lines = [];
                      if (i > 1) {
                          news_lines = lines.slice(0, i - 1);
                      }
                      new_lines = new_lines.concat(lines.slice(i + 1));
                      lines = new_lines;
                      return lines_add_horizon(lines, left, right);
                  }
                  if (!hit) {
                      lines.push({left: left, right: right});
                  }
                  return lines;
              };

              while (edge = edges2.shift()) {
                  if (edge.height > line_max_width) {
                      continue;
                  }
                  if (null === current_y || edge.y - current_y > line_max_width) {
                      if (current_width > line_max_width) {
                          lines = lines_add_horizon(lines, current_x, current_x + current_width);
                      }
                      if (null !== current_y && lines.length) {
                          horizons.push({y: current_y, lines: lines});
                      }
                      current_x = edge.x;
                      current_y = edge.y;
                      current_width = 0;
                      lines = [];
                  }

                  if (Math.abs(current_x + current_width - edge.x) < 10) {
                      current_width = edge.width + edge.x - current_x;
                  } else {
                      if (current_width > line_max_width) {
                          lines = lines_add_horizon(lines, current_x, current_x + current_width);
                      }
                      current_x = edge.x;
                      current_width = edge.width;
                  }
              }
              if (current_width > line_max_width) {
                  lines = lines_add_horizon(lines, current_x, current_x + current_width);
              }
              // no table
              if (current_y === null || lines.length == 0) {
                  return {};
              }
              horizons.push({y: current_y, lines: lines});

              var search_index = function(v, list) {
                  for (var i = 0; i < list.length; i ++) {
                      if (Math.abs(list[i] - v) < 5) {
                          return i;
                      }
                  }
                  return -1;
              };

              // handle merge cells
              x_list = verticles.map(function(a){ return a.x; });

              // check top_out and bottom_out
              var y_list = horizons.map(function(a){ return a.y; }).sort(function(a, b) { return b - a; });
              var y_max = verticles
                  .map(function(verticle) { return verticle.lines[0].bottom; })
                  .sort().reverse()[0];
              var y_min = verticles
                  .map(function(verticle) { return verticle.lines[verticle.lines.length - 1].top; })
                  .sort()[0];
              var top_out = search_index(y_min, y_list) == -1 ? 1 : 0;
              var bottom_out = search_index(y_max, y_list) == -1 ? 1 : 0;

              var verticle_merges = {};
              // skip the 1st lines and final lines
              for (var r = 0; r < horizons.length - 2 + top_out + bottom_out; r ++) {
                  hor = horizons[bottom_out + horizons.length - r - 2];
                  lines = hor.lines.slice(0);
                  col = search_index(lines[0].left, x_list);
                  if (col != 0) {
                      for (var c = 0; c < col; c ++) {
                          verticle_merges[[r, c].join('-')] = {row: r, col: c, width: 1, height: 2};
                      }
                  }
                  while (line = lines.shift()) {
                      left_col = search_index(line.left, x_list);
                      right_col = search_index(line.right, x_list);
                      if (left_col != col) {
                          for (var c = col; c < left_col; c ++) {
                              verticle_merges[[r, c].join('-')] = {row: r, col: c, width: 1, height: 2};
                          }
                      }
                      col = right_col;
                  }
                  if (col != verticles.length - 1 + top_out) {
                      for (var c = col; c < verticles.length - 1 + top_out; c ++) {
                          verticle_merges[[r, c].join('-')] = {row: r, col: c, width: 1, height: 2};
                      }
                  }
              }

              while (true) {
                  var merged = false;
                  for (var r_c in verticle_merges) {
                      var m = verticle_merges[r_c];
                      var curr_final_id = `${m.row + m.height - 1}-${m.col + m.width - 1}`;
                      while (undefined !== verticle_merges[curr_final_id]) {
                          m.height += verticle_merges[curr_final_id].height - 1;
                          delete(verticle_merges[curr_final_id]);
                          merged = true;
                          curr_final_id = `${m.row + m.height - 1}-${m.col + m.width - 1}`;
                      }

                      if (merged)
                          break;
                  }
                  if (!merged) {
                      break;
                  }
              }

              var horizon_merges = {};

              for (var c = 0; c < verticles.length - 2; c ++) {
                  ver = verticles[c + 1];
                  lines = ver.lines.slice(0);
                  row = search_index(lines[0].bottom, y_list) + bottom_out;
                  if (row != 0) {
                      for (var r = 0; r < row; r ++) {
                          horizon_merges[[r, c].join('-')] = {row: r, col: c, width: 2, height: 1};
                      }
                  }
                  while (line = lines.shift()) {
                      top_row = search_index(line.top, y_list);
                      if (top_row == -1) {
                          top_row = y_list.length + bottom_out;
                      } else {
                          top_row += bottom_out;
                      }
                      bottom_row = search_index(line.bottom, y_list) + bottom_out;
                      if (bottom_row != row) {
                          for (var r = bottom_row; r < row; r ++) {
                              horizon_merges[[r, c].join('-')] = {row: r, col: c, width: 2, height: 1};
                          }
                      }
                      row = top_row;
                  }
                  if (row != horizons.length - 1 + bottom_out + top_out) {
                      for (var r = row; r < horizons.length - 1 + bottom_out + top_out; r ++) {
                          horizon_merges[[r, c].join('-')] = {row: r, col: c, width: 2, height: 1};
                      }
                  }
              }
              if (top_out) {
                  horizons.unshift({y: y_min, lines: []});
              }
              if (bottom_out) {
                  horizons.push({y:y_max, lines:[]});
              }

              while (true) {
                  var merged = false;
                  for (var r_c in horizon_merges) {
                      var m = horizon_merges[r_c];
                      var curr_final_id = `${m.row + m.height - 1}-${m.col + m.width - 1}`;
                      while (undefined !== horizon_merges[curr_final_id]) {
                          m.width += horizon_merges[curr_final_id].width - 1;
                          delete(horizon_merges[curr_final_id]);
                          merged = true;
                          curr_final_id = `${m.row + m.height - 1}-${m.col + m.width - 1}`;
                      }

                      if (merged)
                          break;
                  }
                  if (!merged) {
                      break;
                  }
              }
              merges = verticle_merges;
              for (var id in horizon_merges) {
                  if ('undefined' !== typeof(merges[id])) {
                      merges[id].width = horizon_merges[id].width;
                  } else {
                      merges[id] = horizon_merges[id];
                  }
              }
              for (var id in merges) {
                      for (var c = 0; c < merges[id].width; c ++) {
                          for (var r = 0; r < merges[id].height; r ++) {
                              if (c == 0 && r == 0) {
                                  continue;
                              }
                              delete(merges[[r + merges[id].row, c + merges[id].col].join('-')]);
                          }
                      }
              }

              merge_alias = {};
              for (var id in merges) {
                  for (var c = 0; c < merges[id].width; c ++) {
                      for (var r = 0; r < merges[id].height; r ++) {
                          if (r == 0 && c == 0) {
                              continue;
                          }
                          merge_alias[[merges[id].row + r, merges[id].col + c].join('-')] = [merges[id].row, merges[id].col].join('-');
                      }
                  }
              }
      }).then(function(){
          return page.getTextContent().then(function (content) {
                tables = [];
                table_pos = [];
                for (var i = 0; i < horizons.length - 1; i ++) {
                    tables[i] = [];
                    table_pos[i] = [];
                    for (var j = 0; j < verticles.length - 1; j ++) {
                        tables[i][j] = '';
                        table_pos[i][j] = null;
                    }
                }
                while (item = content.items.shift()) {
                    x = item.transform[4];
                    y = item.transform[5];

                      var col = -1;
                      for (var i = 0; i < verticles.length - 1 ; i ++)  {
                          if (x >= verticles[i].x && x < verticles[i + 1].x) {
                              col = i;
                              break;
                          }
                      }
                      if (col == -1) {
                          continue;
                      }
                      var row = -1;
                      for (var i = 0; i < horizons.length - 1 ; i ++)  {
                          if (y >= horizons[i].y && y < horizons[i + 1].y) {
                              row = horizons.length - i - 2;
                              break;
                          }
                      }
                      if (row == -1) {
                          continue;
                      }

                      if ('undefined' !== typeof(merge_alias[row + '-' + col])) {
                          id = merge_alias[row + '-' + col];
                          row = id.split('-')[0];
                          col = id.split('-')[1];
                      }
                      if (null !== table_pos[row][col] && Math.abs(table_pos[row][col] - y) > 5) {
                          tables[row][col] += "\n";
                      }
                      table_pos[row][col] = y;
                      tables[row][col] += item.str;
                  }
                if (tables.length) {
                    result.pageTables.push({
                            page: pageNum,
                            tables: tables,
                            merges: merges,
                            merge_alias: merge_alias,
                            width: verticles.length - 1,
                            height: horizons.length - 1,
                    });
                }
                result.currentPages ++;
                if (options.progressFunc && 'function' === typeof(options.progressFunc)) {
                    options.progressFunc(result);
                }
          });
      });
    });
  };

  for (var i = 1; i <= numPages; i++) {
    lastPromise = lastPromise.then(loadPage.bind(null, i));
  }
  return lastPromise.then(function(){
          return result;
  });
};

pdfTableExtractor = async function(buffer, options={}) {
    const pdfLoadingTask = PDFJS.getDocument(buffer);

    // destroy the PDFDocumentLoadingTask before returning the result
    // to release memory which is otherwise not released
    return pdfLoadingTask.promise
        .then((doc) => pdfTableExtractorParse(doc, options))
        .then((tables) => pdfLoadingTask.destroy()
            .then(() => tables)
        );
};

module.exports = pdfTableExtractor;