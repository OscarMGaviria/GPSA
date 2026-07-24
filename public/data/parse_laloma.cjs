const fs = require('fs');
const proj4 = require('proj4');

// EPSG:3115 MAGNA-SIRGAS / Colombia West zone
const epsg3115 = '+proj=tmerc +lat_0=4.59620041666667 +lon_0=-77.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs';

const text = `
          at point  X=1096277.364  Y=1196411.715  Z=    0.000
          at point  X=1096296.170  Y=1196400.031  Z=    0.000
             bulge    -0.070
            center  X=1096255.485  Y=1196334.568  Z=    0.000
            radius    77.076
       start angle  58d8'21"
         end angle 42d10'16"
          at point  X=1096312.609  Y=1196386.312  Z=    0.000
          at point  X=1096316.329  Y=1196382.204  Z=    0.000
          at point  X=1096329.865  Y=1196366.511  Z=    0.000
             bulge     0.249
            center  X=1096351.732  Y=1196386.313  Z=    0.000
            radius    29.500
       start angle 222d9'48"
         end angle 278d1'48"
          at point  X=1096355.853  Y=1196357.102  Z=    0.000
          at point  X=1096410.129  Y=1196364.759  Z=    0.000
             bulge     0.105
            center  X=1096395.672  Y=1196467.244  Z=    0.000
            radius   103.500
       start angle 278d1'48"
         end angle 302d2'11"
          at point  X=1096450.574  Y=1196379.506  Z=    0.000
          at point  X=1096464.904  Y=1196389.063  Z=    0.000
          at point  X=1096469.411  Y=1196391.883  Z=    0.000
             bulge    -0.019
            center  X=1096547.388  Y=1196267.270  Z=    0.000
            radius   147.000
       start angle 122d2'11"
         end angle 117d43'7"
          at point  X=1096479.014  Y=1196397.400  Z=    0.000
          at point  X=1096508.563  Y=1196412.926  Z=    0.000
          at point  X=1096505.772  Y=1196418.238  Z=    0.000
          at point  X=1096476.223  Y=1196402.712  Z=    0.000
             bulge     0.019
            center  X=1096547.388  Y=1196267.270  Z=    0.000
            radius   153.000
       start angle 117d43'7"
         end angle 122d2'11"
          at point  X=1096466.228  Y=1196396.970  Z=    0.000
          at point  X=1096461.721  Y=1196394.149  Z=    0.000
          at point  X=1096446.861  Y=1196385.440  Z=    0.000
             bulge    -0.105
            center  X=1096395.672  Y=1196467.244  Z=    0.000
            radius    96.500
       start angle 302d2'11"
         end angle 278d1'48"
          at point  X=1096409.152  Y=1196371.691  Z=    0.000
          at point  X=1096354.875  Y=1196364.034  Z=    0.000
             bulge    -0.249
            center  X=1096351.732  Y=1196386.313  Z=    0.000
            radius    22.500
       start angle 278d1'48"
         end angle 222d9'48"
          at point  X=1096335.054  Y=1196371.210  Z=    0.000
          at point  X=1096320.776  Y=1196386.231  Z=    0.000
          at point  X=1096317.056  Y=1196390.340  Z=    0.000
             bulge     0.070
            center  X=1096255.481  Y=1196334.563  Z=    0.000
            radius    83.082
       start angle 42d10'16"
         end angle  58d8'22"
          at point  X=1096299.336  Y=1196405.127  Z=    0.000
          at point  X=1096280.530  Y=1196416.811  Z=    0.000
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

console.log('Extracted', rawPoints.length, 'unique points.');

const projectedPoints = rawPoints.map(p => proj4(epsg3115, epsg4326, p));
// Close polygon if needed
if (Math.abs(projectedPoints[0][0] - projectedPoints[projectedPoints.length-1][0]) > 0.000001 ||
    Math.abs(projectedPoints[0][1] - projectedPoints[projectedPoints.length-1][1]) > 0.000001) {
  projectedPoints.push(projectedPoints[0]);
}

const feature = {
  type: 'Feature',
  properties: {
    NOMBRE_PROYECTO: 'Puente La Loma',
    SUBREGION: 'SUROESTE'
  },
  geometry: {
    type: 'Polygon',
    coordinates: [projectedPoints]
  }
};

const p = 'd:/OMARQUEZG/My Documents/Aplicativos/GPSA/public/data/01 Puente gavino/Localizacion.geojson';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

// Delete existing if it was added before
data.features = data.features.filter(f => f.properties.NOMBRE_PROYECTO !== 'Puente La Loma' && f.properties.NOMBRE_PROYECTO !== 'PUENTE LA LOMA URRAO');
data.features.push(feature);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully projected and added the polygon to Localizacion.');
