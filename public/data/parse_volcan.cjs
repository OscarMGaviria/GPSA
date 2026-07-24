const fs = require('fs');
const proj4 = require('proj4');

// EPSG:3115 MAGNA-SIRGAS / Colombia West zone
const epsg3115 = '+proj=tmerc +lat_0=4.59620041666667 +lon_0=-77.0775079166667 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs';

const text = `
          at point  X=1104676.966  Y=1186822.720  Z=    0.000
          at point  X=1104687.840  Y=1186833.052  Z=    0.000
          at point  X=1104692.153  Y=1186835.771  Z=    0.000
          at point  X=1104709.587  Y=1186852.335  Z=    0.000
             bulge    -0.331
            center  X=1104741.616  Y=1186818.624  Z=    0.000
            radius    46.500
       start angle 133d32'5"
         end angle 60d21'17"
          at point  X=1104764.616  Y=1186859.038  Z=    0.000
          at point  X=1104846.768  Y=1186812.283  Z=    0.000
             bulge     0.130
            center  X=1104870.758  Y=1186854.434  Z=    0.000
            radius    48.500
       start angle 240d21'17"
         end angle 269d53'58"
          at point  X=1104870.673  Y=1186805.934  Z=    0.000
          at point  X=1104897.751  Y=1186805.887  Z=    0.000
             bulge     0.071
            center  X=1104897.784  Y=1186824.387  Z=    0.000
            radius    18.500
       start angle 269d53'58"
         end angle 286d14'40"
          at point  X=1104902.959  Y=1186806.625  Z=    0.000
             bulge    -0.346
            center  X=1104900.438  Y=1186794.382  Z=    0.000
            radius    12.500
       start angle  78d22'4"
         end angle   2d1'13"
          at point  X=1104912.931  Y=1186794.823  Z=    0.000
          at point  X=1104913.364  Y=1186782.547  Z=    0.000
          at point  X=1104918.361  Y=1186782.723  Z=    0.000
          at point  X=1104917.928  Y=1186794.999  Z=    0.000
          at point  X=1104915.557  Y=1186836.785  Z=    0.000
          at point  X=1104907.636  Y=1186837.510  Z=    0.000
          at point  X=1104909.183  Y=1186825.906  Z=    0.000
             bulge    -0.454
            center  X=1104897.784  Y=1186824.387  Z=    0.000
            radius    11.500
       start angle  7d35'29"
         end angle 269d53'58"
          at point  X=1104897.764  Y=1186812.887  Z=    0.000
          at point  X=1104870.685  Y=1186812.934  Z=    0.000
             bulge    -0.130
            center  X=1104870.758  Y=1186854.434  Z=    0.000
            radius    41.500
       start angle 269d53'58"
         end angle 240d21'17"
          at point  X=1104850.231  Y=1186818.366  Z=    0.000
          at point  X=1104768.078  Y=1186865.121  Z=    0.000
             bulge     0.331
            center  X=1104741.616  Y=1186818.624  Z=    0.000
            radius    53.500
       start angle 60d21'17"
         end angle 133d32'5"
          at point  X=1104704.765  Y=1186857.409  Z=    0.000
          at point  X=1104687.332  Y=1186840.845  Z=    0.000
          at point  X=1104684.396  Y=1186836.677  Z=    0.000
          at point  X=1104673.522  Y=1186826.345  Z=    0.000 
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
    NOMBRE_PROYECTO: 'Puente El Vólcan',
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
data.features = data.features.filter(f => f.properties.NOMBRE_PROYECTO !== 'Puente El Vólcan' && f.properties.NOMBRE_PROYECTO !== 'PUENTE EL VOLCAN URRAO');
data.features.push(feature);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully projected and added the polygon to Localizacion.');
