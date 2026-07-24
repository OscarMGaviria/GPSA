const fs = require('fs');
const proj4 = require('proj4');

const epsg9377 = '+proj=tmerc +lat_0=4.0 +lon_0=-73.0 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs';

function makePolygon(rawPoints, props) {
  const projectedPoints = rawPoints.map(p => proj4(epsg9377, epsg4326, p));
  if (Math.abs(projectedPoints[0][0] - projectedPoints[projectedPoints.length-1][0]) > 0.000001 ||
      Math.abs(projectedPoints[0][1] - projectedPoints[projectedPoints.length-1][1]) > 0.000001) {
    projectedPoints.push(projectedPoints[0]);
  }
  return {
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [projectedPoints] }
  };
}

const features = [
  makePolygon([
    [4705267, 2242719], [4705272, 2242715], [4705261, 2242712], [4705262, 2242719]
  ], {
    DPTO: '005 - ANTIOQUIA',
    MPIO: '001 - MEDELLIN',
    PROP: 'OLIVIA RESTREPO DE TORO',
    CODCATAS: '0500100000040000041',
    MAT_INMOBILIARIA: '001-307922',
    AREA: '44.56 m²',
    NOMBRE_PROYECTO: 'PAP_SAN_ANTONIO_DE_PRADO',
    SUBREGION: 'VALLE DE ABURRA'
  }),
  makePolygon([
    [4705262, 2242719], [4705261, 2242712], [4705253, 2242709], [4705246, 2242704],
    [4705235, 2242690], [4705231, 2242695], [4705226, 2242696], [4705221, 2242694],
    [4705225, 2242701], [4705242, 2242714], [4705250, 2242717], [4705258, 2242719]
  ], {
    DPTO: '005 - ANTIOQUIA',
    MPIO: '001 - MEDELLIN',
    PROP: 'LUIS FERNANDO ESTRADA G.',
    CODCATAS: '0500100000040000238',
    MAT_INMOBILIARIA: '00103',
    AREA: '400.08 m²',
    NOMBRE_PROYECTO: 'PAP_SAN_ANTONIO_DE_PRADO',
    SUBREGION: 'VALLE DE ABURRA'
  })
];

const p = 'd:/OMARQUEZG/My Documents/Aplicativos/GPSA/public/data/01 Puente gavino/Predios_con_permiso.geojson';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

// Prevent duplicates
const codcatasIds = features.map(f => f.properties.CODCATAS);
data.features = data.features.filter(f => !codcatasIds.includes(f.properties.CODCATAS));
data.features.push(...features);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully added the 2 San Antonio de Prado polygons to Predios_con_permiso.');
