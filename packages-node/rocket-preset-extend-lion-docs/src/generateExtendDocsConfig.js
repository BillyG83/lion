import fs from 'fs';
import path from 'path';
// @ts-ignore
import { init, parse } from 'es-module-lexer/dist/lexer.js';

/**
 * @param {string} value
 * @returns {boolean}
 */
function isComment(value) {
  return value.startsWith('//') || value.startsWith('/*') || value.startsWith('*/');
}

/**
 * @param {string} src
 * @returns
 */
function getImportNames(src) {
  const [imports] = parse(src);

  /** @type {string[]} */
  const names = [];
  for (const importObj of imports) {
    const full = src.substring(importObj.ss, importObj.se);
    if (full.includes('{')) {
      const namesString = full.substring(full.indexOf('{') + 1, full.indexOf('}'));
      namesString.split('\n').forEach(nameLine => {
        nameLine.split(',').forEach(name => {
          const trimmedNamed = name.trim();
          if (trimmedNamed && !isComment(trimmedNamed)) {
            names.push(name.trim());
          }
        });
      });
    }
  }
  return names;
}

/**
 * @param {object} opts
 * @param {string} opts.className
 * @param {string} opts.pkgName
 * @param {string} opts.classPrefix
 * @param {string} opts.classBareImport
 * @param {string} [opts.sourceClassPrefix]
 * @param {string} [opts.sourceBareImport]
 * @returns
 */
function generateVariableChange({
  className,
  pkgName,

  classPrefix,
  classBareImport,
  sourceClassPrefix = 'Lion',
  sourceBareImport = '@lion/',
}) {
  let _sourceClassPrefix = sourceClassPrefix;
  let _classPrefix = classPrefix;
  let pureClassName = className;
  const purePkgName = pkgName.replace(sourceBareImport, '');

  if (className.startsWith(sourceClassPrefix)) {
    pureClassName = className.replace(sourceClassPrefix, '');
  } else {
    _sourceClassPrefix = '';
    _classPrefix = '';
  }

  return {
    name: `${pkgName} - ${className}`,
    variable: {
      from: `${_sourceClassPrefix}${pureClassName}`,
      to: `${_classPrefix}${pureClassName}`,
      paths: [
        {
          from: `${sourceBareImport}${purePkgName}`,
          to: `${classBareImport}${purePkgName}`,
        },
      ],
    },
  };
}

/**
 * @param {object} opts
 * @param {string} opts.tagName
 * @param {string} opts.pkgName
 * @param {string} opts.definePath
 * @param {string} opts.tagPrefix
 * @param {string} opts.tagBareImport
 * @param {string} [opts.sourceTagPrefix]
 * @param {string} [opts.sourceBareImport]
 * @returns
 */
function generateTagChange({
  tagName,
  pkgName,
  definePath,

  tagPrefix,
  tagBareImport,
  sourceTagPrefix = 'lion-',
  sourceBareImport = '@lion/',
}) {
  const pureTagName = tagName.replace(sourceTagPrefix, '');
  const purePkgName = pkgName.replace(sourceBareImport, '');

  return {
    name: `${pkgName}${definePath}`,
    tag: {
      from: `${sourceTagPrefix}${pureTagName}`,
      to: `${tagPrefix}${pureTagName}`,
      paths: [
        {
          from: `${sourceBareImport}${purePkgName}${definePath}`,
          to: `${tagBareImport}${purePkgName}${definePath}`,
        },
      ],
    },
  };
}

/**
 * @param {object} opts
 * @param {string} [opts.nodeModulesDir]
 * @param {string} [opts.npmScope]
 * @param {string} opts.classPrefix
 * @param {string} opts.classBareImport
 * @param {string} opts.tagPrefix
 * @param {string} opts.tagBareImport
 * @param {string} [opts.exportsMapJsonFileName]
 * @returns
 */
export async function generateExtendDocsConfig({
  nodeModulesDir,
  npmScope = '@lion',
  classPrefix,
  classBareImport,
  tagPrefix,
  tagBareImport,
  exportsMapJsonFileName = 'package.json',
}) {
  const _nodeModulesDir = nodeModulesDir || path.resolve('./node_modules');
  await init;
  const options = { classPrefix, classBareImport, tagPrefix, tagBareImport };

  const folderToCheck = npmScope ? path.join(_nodeModulesDir, npmScope) : _nodeModulesDir;
  const packages = fs
    .readdirSync(folderToCheck)
    .filter(dir => fs.statSync(path.join(folderToCheck, dir)).isDirectory())
    .map(dir => (npmScope ? `${npmScope}/${dir}` : dir));

  const changes = [];
  for (const pkgName of packages) {
    const pkgPath = path.join(_nodeModulesDir, ...pkgName.split('/'));
    const pkgJsonPath = path.join(pkgPath, exportsMapJsonFileName);
    const pkgJsonString = await fs.promises.readFile(pkgJsonPath, 'utf8');
    const pkgJson = JSON.parse(pkgJsonString);
    const pkgExports = pkgJson.exports;

    for (const pkgExportName of Object.keys(pkgExports)) {
      const pkgExportPath = pkgExports[pkgExportName];
      const entryPointFilePath = path.join(pkgPath, pkgExportPath);

      if (pkgExportName === '.') {
        const src = await fs.promises.readFile(entryPointFilePath, 'utf8');
        const importNames = getImportNames(src);

        for (const importName of importNames) {
          changes.push(generateVariableChange({ className: importName, pkgName, ...options }));
        }
      }
      if (pkgExportName.startsWith('./define')) {
        const src = await fs.promises.readFile(entryPointFilePath, 'utf8');
        const definePath = `/${pkgExportName.substr(2)}`;
        if (src.includes('.define(')) {
          const matches = src.match(/define\(['"](.*)['"]/);
          if (matches && matches[1]) {
            const tagName = matches[1];
            changes.push(generateTagChange({ tagName, pkgName, definePath, ...options }));
          }
        } else {
          changes.push(
            generateTagChange({ tagName: 'xxx-workaround-xxx', pkgName, definePath, ...options }),
          );
        }
      }
    }
  }

  return changes;
}
