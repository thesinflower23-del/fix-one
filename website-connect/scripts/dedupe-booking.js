const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/Users/Administrator/Downloads/website-connect/js/booking.js');
const backupPath = filePath + '.bak.' + Date.now();

const names = [
  'ensurePackagesLoaded',
  'restoreBookingFormData',
  'assignFairGroomer',
  'adjustSlotCount',
  'selectGroomingCut',
  'submitBooking'
];

function findFunctionStartIndices(src, name) {
  const re = new RegExp('\\bfunction\\s+' + name + '\\s*\\(', 'g');
  const indices = [];
  let m;
  while ((m = re.exec(src)) !== null) indices.push(m.index);
  return indices;
}

function findBlockEnd(src, startIdx) {
  const openIdx = src.indexOf('{', startIdx);
  if (openIdx === -1) return -1;
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

try {
  const src = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(backupPath, src, 'utf8');
  console.log('Backup created at', backupPath);

  let out = src;
  for (const name of names) {
    const re = new RegExp('\\bfunction\\s+' + name + '\\s*\\(', 'g');
    let match;
    const starts = [];
    while ((match = re.exec(out)) !== null) starts.push(match.index);
    if (starts.length <= 1) continue;

    // keep first occurrence, remove subsequent ones
    let kept = false;
    let i = 0;
    let newOut = '';
    while (i < out.length) {
      const fnRe = new RegExp('\\bfunction\\s+(' + names.join('|') + ')\\s*\\(', 'y');
      fnRe.lastIndex = i;
      const m = fnRe.exec(out);
      if (!m) {
        newOut += out[i++];
        continue;
      }
      const fnName = m[1];
      const fnStart = m.index;
      const fnEnd = findBlockEnd(out, fnStart);
      if (fnEnd === -1) { newOut += out.slice(i); break; }
      if (!kept && fnName === name) {
        newOut += out.slice(i, fnEnd);
        i = fnEnd;
        kept = true;
      } else {
        i = fnEnd; // remove duplicate
      }
    }
    out = newOut;
  }

  fs.writeFileSync(filePath, out, 'utf8');
  console.log('Deduplication complete. File updated:', filePath);
} catch (err) {
  console.error('dedupe failed', err);
  process.exit(1);
}