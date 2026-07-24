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
    [4770294, 2280801], [4770294, 2280795], [4770282, 2280796], [4770283, 2280802]
  ], {
    DPTO: '005 - ANTIOQUIA',
    MPIO: '190 - CISNEROS',
    PROP: 'GLORIA AMPARO GONZALEZ G. Y BERTA OLIVA ARENAS OSPINA',
    CODCATAS: '19010010170006000008',
    MAT_INMOBILIARIA: '035-12731 / 035-12732',
    AREA: '71.73 m²',
    NOMBRE_PROYECTO: 'PUENTE LA CRISTALINA',
    SUBREGION: 'NORDESTE'
  })
];

const p = 'd:/OMARQUEZG/My Documents/Aplicativos/GPSA/public/data/01 Puente gavino/Predios_con_permiso.geojson';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

const codcatasIds = features.map(f => f.properties.CODCATAS);
data.features = data.features.filter(f => !codcatasIds.includes(f.properties.CODCATAS));
data.features.push(...features);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully added Puente La Cristalina to Predios_con_permiso.');
