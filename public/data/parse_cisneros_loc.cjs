const fs = require('fs');
const proj4 = require('proj4');

// EPSG:3116 MAGNA-SIRGAS / Colombia Bogota zone
const epsg3116 = '+proj=tmerc +lat_0=4.59620041666667 +lon_0=-74.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs';

const text = `
          at point  X=889316.468  Y=1214927.761  Z=    0.000
          at point  X=889343.325  Y=1214856.729  Z=    0.000
             bulge    -0.114
            center  X=889302.168  Y=1214841.168  Z=    0.000
            radius    44.000
       start angle 20d42'41"
         end angle 354d38'20"
          at point  X=889345.976  Y=1214837.057  Z=    0.000
          at point  X=889344.688  Y=1214823.335  Z=    0.000
          at point  X=889336.028  Y=1214731.049  Z=    0.000
          at point  X=889332.452  Y=1214700.660  Z=    0.000
          at point  X=889326.840  Y=1214704.306  Z=    0.000
          at point  X=889330.060  Y=1214731.680  Z=    0.000
          at point  X=889338.744  Y=1214824.210  Z=    0.000
          at point  X=889340.002  Y=1214837.618  Z=    0.000
             bulge     0.114
            center  X=889302.168  Y=1214841.168  Z=    0.000
            radius    38.000
       start angle 354d38'20"
         end angle 20d42'41"
          at point  X=889337.712  Y=1214854.607  Z=    0.000
          at point  X=889310.855  Y=1214925.640  Z=    0.000
`;

const rawPoints = [];
const lines = text.split('\n');
for (const line of lines) {
  const match = line.match(/at point\s+X=([\d.]+)\s+Y=([\d.]+)/);
  if (match) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (rawPoints.length === 0 || 
        Math.abs(rawPoints[rawPoints.length - 1][0] - x) > 0.001 || 
        Math.abs(rawPoints[rawPoints.length - 1][1] - y) > 0.001) {
      rawPoints.push([x, y]);
    }
  }
}

const projectedPoints = rawPoints.map(p => proj4(epsg3116, epsg4326, p));
if (Math.abs(projectedPoints[0][0] - projectedPoints[projectedPoints.length-1][0]) > 0.000001 ||
    Math.abs(projectedPoints[0][1] - projectedPoints[projectedPoints.length-1][1]) > 0.000001) {
  projectedPoints.push(projectedPoints[0]);
}

const feature = {
  type: 'Feature',
  properties: {
    NOMBRE_PROYECTO: 'Puente Cisneros',
    SUBREGION: 'NORDESTE'
  },
  geometry: {
    type: 'Polygon',
    coordinates: [projectedPoints]
  }
};

const p = 'd:/OMARQUEZG/My Documents/Aplicativos/GPSA/public/data/01 Puente gavino/Localizacion.geojson';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

data.features = data.features.filter(f => f.properties.NOMBRE_PROYECTO !== 'Puente Cisneros');
data.features.push(feature);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully projected and added Puente Cisneros to Localizacion.');
