const fs = require('fs');
const proj4 = require('proj4');

const epsg9377 = '+proj=tmerc +lat_0=4.0 +lon_0=-73.0 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const epsg4326 = '+proj=longlat +datum=WGS84 +no_defs';

const text = `
          at point  X=4672357.458  Y=2226904.818  Z=    0.000
          at point  X=4672368.008  Y=2226905.739  Z=    0.000
             bulge    -0.025
            center  X=4672370.313  Y=2226879.339  Z=    0.000
            radius    26.500
       start angle 94d59'20"
         end angle 89d10'25"
          at point  X=4672370.695  Y=2226905.837  Z=    0.000
          at point  X=4672416.557  Y=2226905.175  Z=    0.000
             bulge     0.108
            center  X=4672417.055  Y=2226939.671  Z=    0.000
            radius    34.500
       start angle 269d10'25"
         end angle 293d46'53"
          at point  X=4672430.967  Y=2226908.101  Z=    0.000
          at point  X=4672490.980  Y=2226934.547  Z=    0.000
             bulge    -0.282
            center  X=4672501.666  Y=2226910.297  Z=    0.000
            radius    26.500
       start angle 113d46'53"
         end angle 50d41'43"
          at point  X=4672518.453  Y=2226930.802  Z=    0.000
          at point  X=4672534.340  Y=2226917.796  Z=    0.000
             bulge     0.159
            center  X=4672568.229  Y=2226959.194  Z=    0.000
            radius    53.500
       start angle 230d41'43"
         end angle 266d54'52"
          at point  X=4672565.350  Y=2226905.771  Z=    0.000
          at point  X=4672598.569  Y=2226903.981  Z=    0.000
             bulge     0.046
            center  X=4672601.449  Y=2226957.403  Z=    0.000
            radius    53.500
       start angle 266d54'52"
         end angle 277d33'3"
          at point  X=4672608.479  Y=2226904.367  Z=    0.000
          at point  X=4672641.354  Y=2226908.725  Z=    0.000
             bulge    -0.060
            center  X=4672654.034  Y=2226813.062  Z=    0.000
            radius    96.500
       start angle  97d33'3"
         end angle  83d50'2"
          at point  X=4672664.400  Y=2226909.003  Z=    0.000
          at point  X=4672711.628  Y=2226903.901  Z=    0.000
             bulge    -0.278
            center  X=4672708.352  Y=2226873.577  Z=    0.000
            radius    30.500
       start angle  83d50'2"
         end angle  21d39'6"
          at point  X=4672736.700  Y=2226884.831  Z=    0.000
          at point  X=4672751.924  Y=2226846.480  Z=    0.000
             bulge     0.162
            center  X=4672783.060  Y=2226858.840  Z=    0.000
            radius    33.500
       start angle 201d39'6"
         end angle 238d27'59"
          at point  X=4672765.540  Y=2226830.287  Z=    0.000
          at point  X=4672858.914  Y=2226772.992  Z=    0.000
             bulge    -0.141
            center  X=4672818.904  Y=2226707.789  Z=    0.000
            radius    76.500
       start angle 58d27'59"
         end angle  26d15'7"
          at point  X=4672887.514  Y=2226741.626  Z=    0.000
          at point  X=4672896.342  Y=2226723.725  Z=    0.000
             bulge    -0.231
            center  X=4672872.576  Y=2226712.004  Z=    0.000
            radius    26.500
       start angle  26d15'7"
         end angle 334d15'19"
          at point  X=4672896.445  Y=2226700.493  Z=    0.000
          at point  X=4672865.815  Y=2226636.976  Z=    0.000
             bulge     0.251
            center  X=4672895.990  Y=2226622.425  Z=    0.000
            radius    33.500
       start angle 154d15'19"
         end angle 210d35'46"
          at point  X=4672867.154  Y=2226605.374  Z=    0.000
          at point  X=4672869.786  Y=2226600.923  Z=    0.000
             bulge     0.542
            center  X=4672898.622  Y=2226617.974  Z=    0.000
            radius    33.500
       start angle 210d35'46"
         end angle 324d20'28"
          at point  X=4672925.841  Y=2226598.445  Z=    0.000
          at point  X=4672943.594  Y=2226623.189  Z=    0.000
             bulge    -0.124
            center  X=4672981.376  Y=2226596.081  Z=    0.000
            radius    46.500
       start angle 144d20'28"
         end angle  116d7'8"
          at point  X=4672960.905  Y=2226637.833  Z=    0.000
          at point  X=4672986.729  Y=2226650.494  Z=    0.000
             bulge     0.210
            center  X=4672963.176  Y=2226698.531  Z=    0.000
            radius    53.500
       start angle  296d7'8"
         end angle 343d39'37"
          at point  X=4673014.516  Y=2226683.480  Z=    0.000
          at point  X=4673022.252  Y=2226709.867  Z=    0.000
             bulge    -0.364
            center  X=4673043.843  Y=2226703.537  Z=    0.000
            radius    22.500
       start angle 163d39'37"
         end angle 83d33'40"
          at point  X=4673046.366  Y=2226725.895  Z=    0.000
          at point  X=4673063.612  Y=2226723.949  Z=    0.000
             bulge     0.073
            center  X=4673072.415  Y=2226801.954  Z=    0.000
            radius    78.500
       start angle 263d33'40"
         end angle 280d9'32"
          at point  X=4673086.261  Y=2226724.685  Z=    0.000
          at point  X=4673110.286  Y=2226728.990  Z=    0.000
             bulge     0.163
            center  X=4673100.849  Y=2226781.651  Z=    0.000
            radius    53.500
       start angle 280d9'32"
         end angle 317d6'41"
          at point  X=4673140.048  Y=2226745.240  Z=    0.000
          at point  X=4673164.647  Y=2226771.723  Z=    0.000
             bulge    -0.176
            center  X=4673184.063  Y=2226753.687  Z=    0.000
            radius    26.500
       start angle 137d6'41"
         end angle 97d17'25"
          at point  X=4673180.700  Y=2226779.973  Z=    0.000
          at point  X=4673182.287  Y=2226780.176  Z=    0.000
          at point  X=4673181.398  Y=2226787.120  Z=    0.000
          at point  X=4673179.812  Y=2226786.917  Z=    0.000
             bulge     0.176
            center  X=4673184.063  Y=2226753.687  Z=    0.000
            radius    33.500
       start angle 97d17'25"
         end angle 137d6'41"
          at point  X=4673159.518  Y=2226776.487  Z=    0.000
          at point  X=4673134.919  Y=2226750.004  Z=    0.000
             bulge    -0.163
            center  X=4673100.849  Y=2226781.651  Z=    0.000
            radius    46.500
       start angle 317d6'41"
         end angle 280d9'32"
          at point  X=4673109.051  Y=2226735.880  Z=    0.000
          at point  X=4673085.026  Y=2226731.575  Z=    0.000
             bulge    -0.073
            center  X=4673072.415  Y=2226801.954  Z=    0.000
            radius    71.500
       start angle 280d9'32"
         end angle 263d33'40"
          at point  X=4673064.397  Y=2226730.905  Z=    0.000
          at point  X=4673047.151  Y=2226732.851  Z=    0.000
             bulge     0.364
            center  X=4673043.843  Y=2226703.537  Z=    0.000
            radius    29.500
       start angle 83d33'40"
         end angle 163d39'37"
          at point  X=4673015.535  Y=2226711.837  Z=    0.000
          at point  X=4673007.798  Y=2226685.449  Z=    0.000
             bulge    -0.210
            center  X=4672963.176  Y=2226698.531  Z=    0.000
            radius    46.500
       start angle 343d39'37"
         end angle  296d7'8"
          at point  X=4672983.647  Y=2226656.780  Z=    0.000
          at point  X=4672957.823  Y=2226644.118  Z=    0.000
             bulge     0.124
            center  X=4672981.376  Y=2226596.081  Z=    0.000
            radius    53.500
       start angle  116d7'8"
         end angle 144d20'28"
          at point  X=4672937.907  Y=2226627.269  Z=    0.000
          at point  X=4672920.153  Y=2226602.526  Z=    0.000
             bulge    -0.542
            center  X=4672898.622  Y=2226617.974  Z=    0.000
            radius    26.500
       start angle 324d20'28"
         end angle 210d35'46"
          at point  X=4672875.812  Y=2226604.486  Z=    0.000
          at point  X=4672873.180  Y=2226608.937  Z=    0.000
             bulge    -0.251
            center  X=4672895.990  Y=2226622.425  Z=    0.000
            radius    26.500
       start angle 210d35'46"
         end angle 154d15'19"
          at point  X=4672872.121  Y=2226633.936  Z=    0.000
          at point  X=4672902.750  Y=2226697.453  Z=    0.000
             bulge     0.231
            center  X=4672872.576  Y=2226712.004  Z=    0.000
            radius    33.500
       start angle 334d15'19"
         end angle  26d15'7"
          at point  X=4672902.620  Y=2226726.822  Z=    0.000
          at point  X=4672893.792  Y=2226744.722  Z=    0.000
             bulge     0.141
            center  X=4672818.904  Y=2226707.789  Z=    0.000
            radius    83.500
       start angle  26d15'7"
         end angle 58d27'59"
          at point  X=4672862.575  Y=2226778.958  Z=    0.000
          at point  X=4672769.201  Y=2226836.253  Z=    0.000
             bulge    -0.162
            center  X=4672783.060  Y=2226858.840  Z=    0.000
            radius    26.500
       start angle 238d27'59"
         end angle 201d39'6"
          at point  X=4672758.430  Y=2226849.063  Z=    0.000
          at point  X=4672743.206  Y=2226887.413  Z=    0.000
             bulge     0.278
            center  X=4672708.352  Y=2226873.577  Z=    0.000
            radius    37.500
       start angle  21d39'6"
         end angle  83d50'2"
          at point  X=4672712.380  Y=2226910.860  Z=    0.000
          at point  X=4672665.152  Y=2226915.963  Z=    0.000
             bulge     0.060
            center  X=4672654.034  Y=2226813.062  Z=    0.000
            radius   103.500
       start angle  83d50'2"
         end angle  97d33'3"
          at point  X=4672640.434  Y=2226915.664  Z=    0.000
          at point  X=4672607.559  Y=2226911.306  Z=    0.000
             bulge    -0.046
            center  X=4672601.449  Y=2226957.403  Z=    0.000
            radius    46.500
       start angle 277d33'3"
         end angle 266d54'52"
          at point  X=4672598.946  Y=2226910.971  Z=    0.000
          at point  X=4672565.726  Y=2226912.761  Z=    0.000
             bulge    -0.159
            center  X=4672568.229  Y=2226959.194  Z=    0.000
            radius    46.500
       start angle 266d54'52"
         end angle 230d41'43"
          at point  X=4672538.774  Y=2226923.213  Z=    0.000
          at point  X=4672522.887  Y=2226936.219  Z=    0.000
             bulge     0.282
            center  X=4672501.666  Y=2226910.297  Z=    0.000
            radius    33.500
       start angle 50d41'43"
         end angle 113d46'53"
          at point  X=4672488.158  Y=2226940.952  Z=    0.000
          at point  X=4672428.144  Y=2226914.506  Z=    0.000
             bulge    -0.108
            center  X=4672417.055  Y=2226939.671  Z=    0.000
            radius    27.500
       start angle 293d46'53"
         end angle 269d10'25"
          at point  X=4672416.658  Y=2226912.174  Z=    0.000
          at point  X=4672370.796  Y=2226912.836  Z=    0.000
             bulge     0.025
            center  X=4672370.313  Y=2226879.339  Z=    0.000
            radius    33.500
       start angle 89d10'25"
         end angle 94d59'20"
          at point  X=4672367.399  Y=2226912.712  Z=    0.000
          at point  X=4672356.850  Y=2226911.791  Z=    0.000
`;

const rawPoints = [];
const lines = text.split('\n');
for (const line of lines) {
  const match = line.match(/at point\s+X=([\d.]+)\s+Y=([\d.]+)/);
  if (match) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    // Avoid sequential duplicates which often happen in these lists
    if (rawPoints.length === 0 || 
        Math.abs(rawPoints[rawPoints.length - 1][0] - x) > 0.001 || 
        Math.abs(rawPoints[rawPoints.length - 1][1] - y) > 0.001) {
      rawPoints.push([x, y]);
    }
  }
}

console.log('Extracted', rawPoints.length, 'unique points.');

const projectedPoints = rawPoints.map(p => proj4(epsg9377, epsg4326, p));
// Close polygon if needed
if (Math.abs(projectedPoints[0][0] - projectedPoints[projectedPoints.length-1][0]) > 0.000001 ||
    Math.abs(projectedPoints[0][1] - projectedPoints[projectedPoints.length-1][1]) > 0.000001) {
  projectedPoints.push(projectedPoints[0]);
}

const feature = {
  type: 'Feature',
  properties: {
    NOMBRE_PROYECTO: 'Variante Majagua',
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
data.features = data.features.filter(f => f.properties.NOMBRE_PROYECTO !== 'Variante Majagua');
data.features.push(feature);

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log('Successfully projected and added the polygon to Localizacion.');
