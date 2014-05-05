var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Writer = require('broccoli-writer');
var helpers = require('broccoli-kitchen-sink-helpers');

module.exports = Rev;

function Rev(inputTree, options) {
  if (!(this instanceof Rev))
    return new Rev(inputTree, options);

  options = options || {};

  this.hashLength = options.hashLength || 8;
  this.manifestFile = options.manifestFile || 'rev-manifest.json';
  this.inputTree = inputTree;
}

Rev.prototype = Object.create(Writer.prototype);
Rev.prototype.constructor = Rev;

Rev.prototype.write = function (readTree, destDir) {
  var hashLength = this.hashLength;
  var manifestFile = this.manifestFile;
  var inputTree = this.inputTree;

  return readTree(inputTree).then(function (srcDir) {
    var inputFiles = helpers.multiGlob([ '**' ], { cwd: srcDir });
    var manifestMap = {};

    inputFiles.forEach(function (file) {
      var srcFile = path.join(srcDir, file);
      var srcStat = fs.lstatSync(srcFile);

      var hash;
      if (srcStat.isFile()) {
        hash = makeHash(fs.readFileSync(srcFile));
      } else if (srcStat.isSymbolicLink()) {
        hash = makeHash(fs.readlinkSync(srcFile));
      } else {
        return;
      }

      // Append "-hash" to the file name, just before the extension.
      var hashedFile = addSuffixBeforeExt(file, '-' + hash.substring(0, hashLength));

      var destFile = path.join(destDir, hashedFile);

      mkdirp.sync(path.dirname(destFile));
      helpers.copyPreserveSync(srcFile, destFile, srcStat);

      // Record the hashed file name in the manifest.
      manifestMap[file] = hashedFile;
    });

    var manifestJson = JSON.stringify(manifestMap, null, 2);

    // Put the manifest file in destDir by default.
    if (isRelativePath(manifestFile))
      manifestFile = path.join(destDir, manifestFile);

    fs.writeFileSync(manifestFile, manifestJson);
  });
};

function addSuffixBeforeExt(fileName, suffix) {
  var ext = path.extname(fileName);
  return path.join(path.dirname(fileName), path.basename(fileName, ext) + suffix + ext);
}

var crypto = require('crypto');

function makeHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function isRelativePath(p) {
  return typeof p === 'string' && p.charAt(0) !== path.sep;
}
