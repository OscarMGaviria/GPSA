const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { execSync } = require('child_process');

// We will just read the xml directly by unzipping.
try {
  execSync('powershell -Command "Expand-Archive -Force -Path \'d:\\OMARQUEZG\\My Documents\\Aplicativos\\SIMEVA-GOB\\SIMEVA-FRONTEND\\Errores\\2026-06-30-SIMEVA-FRONTEND-issues-report (1).xlsx\' -DestinationPath ./temp_excel"');
  const shared = fs.readFileSync('./temp_excel/xl/sharedStrings.xml', 'utf8');
  const sheet = fs.readFileSync('./temp_excel/xl/worksheets/sheet1.xml', 'utf8');
  
  const strings = [];
  const strRegex = /<t[^>]*>(.*?)<\/t>/g;
  let match;
  while ((match = strRegex.exec(shared)) !== null) {
    strings.push(match[1]);
  }
  
  const rowRegex = /<row[^>]*>(.*?)<\/row>/g;
  const cRegex = /<c r="([A-Z]+)(\d+)"[^>]*t="(s)?"[^>]*><v>(.*?)<\/v><\/c>/g;
  
  let rowMatch;
  while ((rowMatch = rowRegex.exec(sheet)) !== null) {
    const rowContent = rowMatch[1];
    const cells = [];
    let cMatch;
    while ((cMatch = cRegex.exec(rowContent)) !== null) {
      const isString = cMatch[3] === 's';
      const val = cMatch[4];
      cells.push(isString ? strings[parseInt(val)] : val);
    }
    if (cells.some(c => c && (c.includes('S5852') || c.includes('S5843')))) {
      console.log(cells.join(' | '));
    }
  }
} catch(e) {
  console.error(e);
}
