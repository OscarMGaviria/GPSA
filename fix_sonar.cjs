const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat?.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.vue')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src`);
// Include old_reporte.js if it exists in the root
const rootFiles = [String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\old_reporte.js`];
rootFiles.forEach(f => {
  if (fs.existsSync(f)) files.push(f);
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Prefer Number.parseFloat over parseFloat
  // Using word boundary, avoiding cases where it's already Number.parseFloat
  content = content.replaceAll(/(?<!Number\.)\bparseFloat\b/g, 'Number.parseFloat');
  
  // Prefer Number.parseInt over parseInt
  content = content.replaceAll(/(?<!Number\.)\bparseInt\b/g, 'Number.parseInt');
  
  // Prefer Number.isNaN over isNaN
  content = content.replaceAll(/(?<!Number\.)\bisNaN\b/g, 'Number.isNaN');
  
  // Prefer globalThis over window (only whole word matches)
  content = content.replaceAll(/\bwindow\b/g, 'globalThis');
  
  // Prefer String#replaceAll for /[\u0300-\u036f]/g and similar replacements
  // replace(/[\\u0300-\\u036f]/g, '') -> replaceAll(/[\\u0300-\\u036f]/g, '')
  content = content.replaceAll(/\.replace\(\/\[\\u0300-\\u036f\]\/g/g, '.replaceAll(/[\u0300-\u036f]/g');
  // For the accented block we saw:
  content = content.replaceAll(/\.replace\(\/\[\u0300-\u036f\]\/g/g, '.replaceAll(/[\u0300-\u036f]/g');
  
  // Other replaces to replaceAll from the logs
  content = content.replaceAll(/\.replace\(\/\[\^a-z0-9-\]\/g/g, '.replaceAll(/[^a-z0-9-]/g');
  content = content.replaceAll(/\.replace\(\/-(\+?)\/g/g, '.replaceAll(/-$1/g');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
