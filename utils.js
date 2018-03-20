
var fs = require('fs');
var path = require('path');
var urlutil = require('url');
var crypto = require('crypto');

var jsonfile = require('jsonfile');
var mkdirp = require('mkdirp');

/* Environment Variables */

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/* Arguments & Options */

function parseOptions(opts) {
  opts = opts || {};
  var argv = [];
  var options = {};
  var process_argv = process.argv;
  for (var i = 2; i < process_argv.length; i++) {
    if (process_argv[i].indexOf('--') == 0) {
      var arg = process_argv[i];
      if (arg.indexOf("=") > 0) {
        var arg_kv = arg.split('=');
        arg = arg_kv[0];
        arg = arg.replace('--','');
        arg = replaceAll(arg, '-', '_');
        options[arg] = arg_kv[1];
        if (typeof opts[arg] == 'string') {
          if (opts[arg] == 'int' || opts[arg] == 'integer') {
            options[arg] = parseInt(options[arg]);
          } else if (opts[arg] == 'float') {
            options[arg] = parseFloat(options[arg]);
          }
        } else if (typeof opts[arg] == 'object') {
          if (opts[arg].type == 'array') {
            var sep = opts[arg].separator || opts[arg].sep || ',';
            options[arg] = options[arg].split(sep);
          }
        }
      } else {
        arg = arg.replace('--','');
        arg = replaceAll(arg, '-', '_');
        options[arg] = true;
      }
    } else {
      argv.push(process_argv[i]);
    }
  }
  options.argv = argv;
  return options;
}

/* Files & Folders */

function fileExists(file_path) {
  try {
    var stats = fs.statSync(file_path);
    if (stats.isFile()) {
      return true;
    }
  } catch (e) {
  }
  return false;
}

function directoryExists(directory) {
  try {
    var stats = fs.statSync(directory);
    if (stats.isDirectory()) {
      return true;
    }
  } catch (e) {
  }
  return false;
}

function ensureDirectoryExists(directory, options) {
  try {
    var stats = fs.statSync(directory);
  } catch (e) {
    if (e.code == 'ENOENT') {
      mkdirp.sync(directory);
      if (options && options.verbose) {
        console.log('Directory created: ' + directory);  
      }
    }
  }
}

function getStat(file_path) {
  var stats = undefined;
  try {
    stats = fs.lstatSync(file_path);
  } catch(e) {
    console.log(e);
  }
  return stats;
}

/* JSON file */

var loadFromJsonFile = function(file) {
  var info = {};
  try {
    var stats = fs.statSync(file);
    if (stats.isFile()) {
      info = jsonfile.readFileSync(file);
    }
  } catch (e) {
    console.log(e);
  }
  return info;
}

// opts: {
//   backup: Boolean // create .bak file
// }
var saveToJsonFile = function(info, file, opts) {
  if (typeof opts == 'boolean') { // old arugment backup
    opts = {backup: opts};
  }
  opts = opts || {};
  var err = null;
  try {
    ensureDirectoryExists(path.dirname(file));
    if (opts.backup && fileExists(file)) {
      fs.renameSync(file, file + '.bak');
    }
    jsonfile.writeFileSync(file, info, { spaces: 2 });
  } catch (e) {
    err = e;
  }
  return err;
}

/* Text file */

function saveFileSync(output_file, text, encoding) {
  var output_dir = path.dirname(output_file);
  ensureDirectoryExists(output_dir);

  fs.writeFileSync(output_file, text, encoding || 'utf8');
}

function loadFileSync(input_file, encoding) {
  if (!fileExists(input_file)) return '';

  return fs.readFileSync(input_file, encoding || 'utf8');
}

function removeFileSync(local_file) {
  try {
    fs.unlinkSync(local_file);
  } catch(e) {
    // console.log(e);
  }
}

/* URL */

function isHttpUrl(string) {
  var pattern = /^((http|https):\/\/)/;
  return pattern.test(string);
}

function urlGetHost(_url) {
  if (!_url || _url == '') return '';
  var host_url = '';
  var url_obj = urlutil.parse(_url);
  if (url_obj.slashes) {
    host_url = url_obj.protocol + '//' + url_obj.host;
  } else {
    host_url = url_obj.protocol + url_obj.host;
  }
  return host_url;
}

function urlGetHostname(_url) {
  if (!_url || _url == '') return '';
  var host_url = '';
  var url_obj = urlutil.parse(_url);
  return url_obj.hostname;
}

/* String Manipulation */

var lastChar = function(str) {
  return str.substring(str.length-1);
}

var removeLastChar = function(str) {
  return str.substring(0, str.length-1);
}

var escapeRegExp = function(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

var replaceAll = function(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function trimText(input, max_length) {
  if (!input || input == '') return '';
  max_length = max_length || 60;
  var output = input.trim();
  if (output.length > max_length) {
    output = output.substring(0, max_length) + '...';
  }
  return output;
}

function trimLeft(string) {
  if (!string || string == '') return '';
  var tmp = string;
  while(tmp.charAt(0) == ' ') {
    tmp = tmp.substring(1);
  }
  return tmp;
}

// http://stackoverflow.com/questions/2998784/
function numberPad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length-size);
}

function padRight(string, length, padchar) {
  var str = string || '';
  padchar = padchar || ' ';
  if (str == '') {
    for (var i = 0; i<length; i++) str += padchar;
  } else if (str.length < length) {
    for (var i = str.length; i<length; i++) str += padchar;
  }
  return str;
}

function padLeft(string, length, padchar) {
  var str = string || '';
  padchar = padchar || ' ';
  if (str == '') {
    for (var i = 0; i<length; i++) str += padchar;
  } else if (str.length < length) {
    for (var i = str.length; i<length; i++) str = padchar + str;
  }
  return str;
}

function extractSubstring(original, prefix, suffix) {
  if (!original) return '';
  var tmp = original.substring(original.indexOf(prefix) + prefix.length);
  tmp = tmp.substring(0, tmp.indexOf(suffix));
  return tmp;
}

function ellipsisMiddle(str, max_length, first_part, last_part) {
  if (!max_length) max_length = 65;
  if (!first_part) first_part = 40;
  if (!last_part) last_part = 20;
  if (str.length > max_length) {
    return str.substr(0, first_part) + '...' + str.substr(str.length-last_part, str.length);
  }
  return str;
}

var bit_units = {

  /* bits */

  'kb': 1000, // 1000b (1000)

  'Kb': 1000, // 1000b (1000)
  'Mb': 1000000, // 1000kb (1000^2)
  'Gb': 1000000000, // 1000Mb (1000^3)
  'Tb': 1.0e12, // 1000Gb (1000^4)
  'Pb': 1.0e15, // 1000Tb (1000^5)
  'Eb': 1.0e18, // 1000Pb (1000^6)
  'Zb': 2.0e70, // 1000Eb (1000^7)
  'Yb': 2.0e80, // 1000Zb (1000^8)

  'Kibit': 1024, // 1024bit (2^10)
  'Mibit': 1048576, // 1024Kibit (2^20)
  'Gibit': 1073741824, // 1024Mibit (2^30)
  'Tibit': 2.0e40, // 1024Gibit (2^40)
  'Pibit': 2.0e50, // 1024Tibit (2^50)
  'Eibit': 2.0e60, // 1024Pibit (2^60)
  'Zibit': 2.0e70, // 1024Eibit (2^70)
  'Yibit': 2.0e80, // 1024Zibit (2^80)

  'b': 1,
  'bit': 1,
};

var base_2_byte_units = { // base 2

  /* Bytes */

  'kB': 1024, // 1024B (2^10)
  // 'mB': 1048576, // 1024kB (2^20)
  // 'gB': 1073741824, // 1024mB (2^30)
  // 'tB': 2.0e40, // 1024gB (2^40)
  // 'pB': 2.0e50, // 1024tB (2^50)
  // 'eB': 2.0e60, // 1024pB (2^60)
  // 'zB': 2.0e70, // 1024eB (2^70)
  // 'yB': 2.0e80, // 1024zB (2^80)

  'KB': 1024, // 1024B (2^10)
  'MB': 1048576, // 1024KB (2^20)
  'GB': 1073741824, // 1024MB (2^30)
  'TB': 2.0e40, // 1024GB (2^40)
  'PB': 2.0e50, // 1024TB (2^50)
  'EB': 2.0e60, // 1024PB (2^60)
  'ZB': 2.0e70, // 1024EB (2^70)
  'YB': 2.0e80, // 1024ZB (2^80)

  'KiB': 1024, // (2^10)
  'MiB': 1048576, // 1024KiB (2^20)
  'GiB': 1073741824, // 1024MiB (2^30)
  'TiB': 2.0e40, // 1024GiB (2^40)
  'PiB': 2.0e50, // 1024TiB (2^50)
  'EiB': 2.0e60, // 1024PiB (2^60)
  'ZiB': 2.0e70, // 1024EiB (2^70)
  'YiB': 2.0e80, // 1024ZiB (2^80)

  'B': 1,
  'K': 1024, // 1024B (2^10)
  'M': 1048576, // 1024K (2^20)
  'G': 1073741824, // 1024M (2^30)
  'T': 2.0e40, // 1024G (2^40)
  'P': 2.0e50, // 1024T (2^50)
  'E': 2.0e60, // 1024P (2^60)
  'Z': 2.0e70, // 1024E (2^70)
  'Y': 2.0e80, // 1024Z (2^80)
};

var base_10_byte_units = { // base 10

  /* Bytes */

  'kB': 1000, // 1000B (1000)
  // 'mB': 1000000, // 1000kB (1000^2)
  // 'gB': 1000000000, // 1000mB
  // 'tB': 1.0e12, // 1000gB (1000^4)
  // 'pB': 1.0e15, // 1000tB (1000^5)
  // 'eB': 1.0e18, // 1000pB (1000^6)
  // 'zB': 1.0e21, // 1000eB (1000^7)
  // 'yB': 1.0e24, // 1000zB (1000^8)

  'KB': 1000, // 1000B (1000)
  'MB': 1000000, // 1000KB (1000^2)
  'GB': 1000000000, // 1000MB (1000^3)
  'TB': 1.0e12, // 1000GB (1000^4)
  'PB': 1.0e15, // 1000TB (1000^5)
  'EB': 1.0e18, // 1000PB (1000^6)
  'ZB': 1.0e21, // 1000EB (1000^7)
  'YB': 1.0e24, // 1000ZB (1000^8)

  'B': 1,
  'K': 1000, // 1000B (1000)
  'M': 1000000, // 1000K (1000^2)
  'G': 1000000000, // 1000M (1000^3)
  'T': 1.0e12, // 1000G (1000^4)
  'P': 1.0e15, // 1000T (1000^5)
  'E': 1.0e18, // 1000P (1000^6)
  'Z': 1.0e21, // 1000E (1000^7)
  'Y': 1.0e24, // 1000Z (1000^8)
};

var parseSize = function(string, opts) {
  opts = opts || {};
  if (!string || string == '') return NaN;
  var file_size = NaN;
  var size_units = (opts.base == 10) ? base_10_byte_units : base_2_byte_units;
  if (opts.bits) size_units = bit_units;
  for (var unit in size_units) {
    var unit_idx = string.indexOf(unit);
    if (unit_idx>0) {
      var size = string.substring(0,unit_idx).trim();
      if (size.indexOf('.')) {
        size = parseFloat(size);
      } else {
        size = parseInt(size);
      }
      if (isNaN(size)) { // invalid size
        return size;
      }
      file_size = Math.round(size*size_units[unit]);
      break;
    }
  }
  return file_size;
}

function containText(str, str_array) {
  if (!str || str == '' || !str_array || str_array.length ==0) return false;
  var contained = false;
  for (var i = 0; i < str_array.length; i++) {
    if (str.indexOf(str_array[i]) != -1) {
      contained = true;
      break;
    }
  }
  return contained;
}

/* Crypto */

function md5Hash(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

function sha512Hash(string, salt) {
  var hash = crypto.createHmac('sha512', salt);
  hash.update(string);
  return hash.digest('hex');
}

/* Object Manipulation */

// http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
function isObjEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return JSON.stringify(obj) === JSON.stringify({});
}

function updateObject(original, update, verbose) {
  if (typeof original == 'object' && typeof update == 'object') {
    for (var prop in update) {
      if (verbose) {
        console.log('Update prop "' + prop + '":', 
          ' (' + typeof original[prop] + ' --> ' + typeof update[prop] + ')');
      }
      if (typeof original[prop] == 'object' && typeof update[prop] == 'object') {
        updateObject(original[prop], update[prop], verbose);
      } else {
        original[prop] = update[prop];
      }
    }
  } else {
    original = update;
  }
}

module.exports = {
  // Environment Variables
  getUserHome: getUserHome,

  // Arguments
  parseOptions: parseOptions,
  parseArgv: parseOptions,

  // Files & Folders
  fileExists: fileExists,
  directoryExists: directoryExists,
  ensureDirectoryExists: ensureDirectoryExists,
  getStat: getStat,
  
  // JSON file
  loadFromJsonFile: loadFromJsonFile,
  saveToJsonFile: saveToJsonFile,
  
  // Text file
  saveFileSync: saveFileSync,
  loadFileSync: loadFileSync,
  removeFileSync: removeFileSync,

  // URL
  isHttpUrl: isHttpUrl,
  urlGetHost: urlGetHost,
  urlGetHostname: urlGetHostname,

  // String Manipulation
  lastChar: lastChar,
  removeLastChar: removeLastChar,

  escapeRegExp: escapeRegExp,
  replaceAll: replaceAll,
  trimText: trimText,
  trimLeft: trimLeft,
  ellipsisMiddle: ellipsisMiddle,
  numberPad: numberPad,
  padRight: padRight,
  padLeft: padLeft,
  extractSubstring: extractSubstring,

  parseSize: parseSize,
  toBytes: parseSize,

  containText: containText,

  // Crypto
  md5Hash: md5Hash,
  sha512Hash: sha512Hash,

  // Object Manipulation
  isObjEmpty: isObjEmpty,
  updateObject: updateObject
}
