const fs = require('node:fs');
const files = [
  String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src\composables\useMapFilters.js`,
  String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src\composables\useMapLayers.js`,
  String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src\composables\useMapInit.js`,
  String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src\stores\useMapStore.js`,
  String.raw`d:\OMARQUEZG\My Documents\Aplicativos\SIMEVA-GOB\SIMEVA-FRONTEND\src\tests\useCircuitoPhotos.test.js`
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix zero fractions: 1.0 -> 1, 0.0 -> 0 (but only if it looks like a stand-alone number in code)
    content = content.replaceAll(/\b(\d+)\.0+\b/g, '$1');
    
    // Remove unused variable loading in tests
    if (file.includes('useCircuitoPhotos.test.js')) {
       content = content.replaceAll(/let loading = true;?\n?/g, '');
       content = content.replaceAll(/const loading = true;?\n?/g, '');
    }
    
    fs.writeFileSync(file, content, 'utf8');
  }
});
