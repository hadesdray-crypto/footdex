// The world map: a simplified drawing of the continents and the places of the almanac.
// Coordinates are [longitude, latitude]. The drawing is smoothed once when the page opens.

type Pt = [number, number];

export const LAND: Pt[][] = [
  // North America
  [[-168,65.5],[-163,67.5],[-156,71.3],[-141,69.6],[-128,70],[-115,68.5],[-100,68],[-95,71.5],[-85,69.5],[-82,66],[-88,64],[-93,61],[-94,58.7],[-92,57],[-85,55.2],[-82,52.8],[-79.5,51.5],[-78.8,55],[-77,59],[-78,62.3],[-72,61.5],[-69,58.8],[-64.5,60.3],[-61.5,56.5],[-57,53.5],[-56,51.5],[-60,50.2],[-66.5,49.2],[-64.5,48.8],[-64.8,47],[-61,46],[-60,45.5],[-64,44],[-66.5,43.8],[-70,43.7],[-70.7,41.8],[-74,40.5],[-75.5,38.3],[-76,35.5],[-78.5,33.8],[-81,31.8],[-81,29.5],[-80,26.8],[-80.3,25.2],[-81.2,25.2],[-82.7,27.8],[-83.7,29.8],[-85.5,29.7],[-88,30.3],[-89.5,29.2],[-91.5,29.5],[-94,29.5],[-97,27.8],[-97.5,25],[-97.8,22],[-96,19],[-94.5,18.2],[-91.5,18.5],[-90.5,21],[-87,21.5],[-87.5,18.5],[-88.2,16],[-84.5,15.8],[-83.2,14.8],[-83.6,11],[-81.8,9],[-79.5,9.5],[-77.5,8.7],[-77.3,8.6],[-77.9,7.3],[-80,7.3],[-82.5,8.2],[-83.7,9],[-85.7,10],[-87.5,13],[-91.5,14],[-94,16],[-96.5,15.7],[-100,17],[-104,19],[-105.7,22.8],[-109,25.5],[-112.5,29],[-114.7,31.7],[-114.5,30],[-112.8,27.5],[-110,23.2],[-112,25],[-114,28],[-116,31],[-117.2,32.7],[-120.5,34.5],[-122.5,37.5],[-124.2,40.3],[-124.5,43],[-124,46.2],[-124.7,48.3],[-123,49],[-127,50.8],[-130,54.5],[-134,58],[-138,59.5],[-146,60.8],[-151,59.2],[-154,57.5],[-158,56.2],[-162,55],[-165,54.5],[-160,58],[-162,59.8],[-165,61.5],[-166,63],[-161,64.5]],
  // Greenland
  [[-73,78],[-60,82],[-30,83.5],[-20,81],[-18,76],[-22,70],[-32,68],[-41,65],[-43,60],[-48,61],[-53,66],[-55,70],[-60,76]],
  // Baffin, Ellesmere, Victoria, Newfoundland
  [[-80,73],[-72,71.5],[-62,67],[-65,62.5],[-75,64.5],[-78,66],[-90,70]],
  [[-90,77],[-78,76.5],[-62,82],[-75,83],[-95,81]],
  [[-118,71.5],[-105,73],[-101,69.5],[-114,68.8]],
  [[-59,47.6],[-53,46.7],[-52.7,48],[-55.5,51.5]],
  // South America
  [[-77.3,8.6],[-75.5,10.8],[-72,12],[-71.5,11],[-68,10.5],[-64,10.6],[-61,10.5],[-60,8.5],[-57,6],[-52.5,5],[-50,1.5],[-50,0],[-48.5,-1.2],[-44,-2.5],[-40,-2.8],[-35,-5.2],[-34.8,-8],[-37,-12],[-39,-14.5],[-39,-18],[-41,-22],[-44,-23],[-48.5,-26],[-48.7,-28.5],[-52,-32],[-53.5,-34],[-57,-35],[-57,-38],[-62,-39],[-65,-41],[-64,-43],[-66,-45.5],[-67.5,-46.5],[-66,-48],[-69,-51],[-68.5,-52.5],[-65.5,-55],[-68,-55.5],[-72,-54],[-75,-50],[-75.5,-46],[-73.5,-42],[-73.5,-37],[-71.5,-33],[-71.5,-28],[-70.3,-24],[-70.2,-18.5],[-75,-15.5],[-78,-12],[-80,-8],[-81,-5],[-80,-2.5],[-80.5,-0.5],[-79,1.5],[-78,3.5],[-77.4,7]],
  // Cuba, Hispaniola
  [[-85,22],[-82,23.1],[-77,21.8],[-74.2,20.2],[-77.5,19.9],[-81,22]],
  [[-74.4,18.4],[-72,19.9],[-68.5,18.6],[-70,18.2],[-71.5,17.6]],
  // Europe and Asia
  [[-9.5,38.7],[-9,43],[-1.8,43.5],[-1.2,46],[-4.5,48.4],[-1.5,48.7],[1.5,50.2],[3.5,51.3],[4.5,52.8],[8.5,53.8],[8.7,57],[10.5,57.7],[10.3,55],[11,54],[14,54.2],[19.5,54.4],[21,56.5],[21.5,57.5],[24,57.2],[24,59.4],[28,59.8],[30,60],[23,60],[21.5,61.5],[21.2,63],[25,65.2],[22,65.8],[18,62.8],[17.5,60.5],[16.5,57],[12.5,56],[11,59],[8,58],[5.5,58.8],[5,62],[10,64],[14,67.5],[19,70],[25,71],[31,70.5],[40,67.5],[41,66.5],[35,66],[34,64.5],[37,64],[40,64.8],[44,66.2],[44,68.5],[53,68.7],[60,69.2],[68,69],[67,71],[73,72.8],[80,73.5],[87,75],[100,77],[105,77.5],[112,76],[113,73.7],[125,73.5],[130,71.2],[140,72.5],[150,71.5],[160,69.7],[170,70],[180,69],[180,65],[176,64.7],[179,62.5],[173,61.7],[164,59.8],[163,56],[156,51],[156.5,57.8],[160,61],[155,59],[142,59],[138,55.5],[135,54.5],[141,53.5],[140.5,48],[135,43.5],[131,42.5],[129.5,41],[129.5,37.5],[126.5,34.5],[126.5,37.5],[125,39.5],[121.5,39],[122,40.7],[118,39],[119,37.2],[122.5,37],[120.5,36],[119.5,34.5],[121.8,31.5],[122,29.5],[120,26],[117,23.5],[113,22],[110.5,21],[109.8,20.3],[108,21.5],[106.5,20],[105.7,18.5],[108.8,15.5],[109.3,12],[107,10.4],[105,8.6],[104.5,10],[103,10.8],[100.8,13.5],[99.8,11.5],[100.3,7],[103.4,4.2],[103.5,1.4],[101,2.2],[100.4,5.8],[98.3,7.8],[98.5,10.5],[98.5,13.5],[97.5,16.8],[94.5,16],[94.2,18.5],[92,21],[91.5,22.7],[88.5,21.7],[86.9,21],[85,19.4],[82,16.5],[80.2,15.7],[80.3,13],[79.8,10.3],[77.5,8.1],[76.2,10],[74.8,12.8],[73.2,17.5],[72.8,20.7],[72.5,21.3],[70.5,20.8],[68.9,22.3],[70,23.5],[67,24.8],[66.5,25.5],[61.5,25.2],[57.3,25.7],[56.5,27],[54,26.7],[51,28.3],[48.8,30],[48,29.5],[50,26.5],[51.5,24.5],[52,24],[55,25.5],[56.3,26],[56.8,24.5],[59.8,22.5],[58.5,20.5],[57.5,18.8],[55,17],[52.5,16],[49,14],[45,12.8],[43.3,12.7],[42.8,15.5],[41.5,18.5],[39.5,21.5],[38.5,24],[36.5,26],[35,28],[34.9,29.5],[34.3,31.3],[35,32.8],[35.5,34],[35.9,35.5],[36.2,36.6],[34,36.2],[32,36.2],[30.5,36.8],[28.5,36.6],[27.3,37],[26.3,38.3],[26.5,39.5],[26.2,40.4],[24,40.8],[23.5,40.2],[23,39],[24,37.7],[22.7,36.5],[21.7,36.8],[21.2,38.3],[20.2,39.5],[19.5,41.7],[19,42.3],[16.5,43.5],[14.5,45.2],[13.7,45.6],[12.3,45.3],[12.4,44],[14,42.4],[16,41.5],[18.5,40.2],[17,39.5],[16.5,38.4],[15.7,38],[15.8,40],[14.3,40.8],[12.5,41.5],[10.5,43],[8.8,44.4],[7.5,43.8],[5,43.4],[3.2,43],[3,41.8],[0.8,40.8],[-0.3,39.5],[0,38.6],[-0.8,37.6],[-2.2,36.7],[-4.5,36.7],[-5.4,36],[-6.3,36.8],[-7.5,37.2],[-8.9,37],[-8.8,38.5]],
  // Africa
  [[-17.5,14.7],[-16.5,19.5],[-16,23],[-13,27.5],[-10,29.5],[-9.6,31],[-8.5,33.2],[-6.8,34],[-5.8,35.8],[-2.5,35.2],[1,36.5],[5,36.8],[9.8,37.2],[11,36.8],[10.5,35.2],[11,33.3],[15,32.3],[20,32.2],[20,30.8],[23,32.5],[26,31.5],[29,30.9],[32,31.2],[34.2,31.2],[34.9,29.5],[34.3,27.9],[33.2,28],[32.6,29.9],[33.5,27.2],[35.5,24],[37,21],[37.5,18.5],[39,15.8],[41,14],[43,12.5],[44,10.5],[48,11.3],[51.2,11.8],[51,10.4],[50,9],[48,5],[45,2],[42,-1],[40.5,-3],[39.2,-5],[39.5,-8],[40.5,-10.5],[40.5,-14.5],[35,-18],[35,-22],[32.8,-25.8],[32.5,-28.5],[31,-30],[28,-33],[25.5,-34],[22,-34],[20,-34.8],[18.5,-34],[17.8,-31],[16.5,-28.5],[15,-26],[14.4,-22.5],[11.8,-17.5],[13.5,-12],[12.3,-6],[11.5,-5],[9,-1],[9.5,1],[9.5,3.8],[8.5,4.5],[5.5,4.4],[4,6.3],[1,6],[-2,4.8],[-4,5.2],[-7.5,4.4],[-10.5,6.3],[-13.2,8.4],[-15,10.9],[-16.8,12.5]],
  // Madagascar
  [[49.3,-12],[50.4,-15.5],[49.5,-17],[47.5,-24.8],[45,-25.5],[43.7,-23],[44.3,-20],[44,-17],[46,-15.7],[48,-13.5]],
  // Australia, New Zealand, New Guinea
  [[113.5,-22],[114,-26],[115,-33.5],[118,-35],[123.5,-34],[127,-32],[131,-31.5],[135,-34.8],[138,-35.5],[140,-38],[144,-38.3],[147.5,-38],[150,-37],[150.5,-33],[153,-28],[153,-25],[150,-22.5],[146.5,-19],[145.4,-15],[143.5,-13.5],[142.5,-10.7],[141.5,-13],[141.6,-16.5],[139.5,-17.5],[136.5,-15.5],[137,-12],[132.5,-11.5],[130,-12.3],[129.5,-15],[126,-14],[123,-17],[121.5,-19.5],[116.5,-20.7]],
  [[172.7,-34.4],[174.5,-36.3],[178.5,-37.7],[177,-39.3],[175,-41.5],[174.8,-40],[173.8,-39.2],[174.6,-38]],
  [[172.6,-40.5],[174.3,-41.7],[173,-43.5],[171,-44.5],[169,-46.6],[166.5,-46],[168,-44],[171.2,-42]],
  [[131,-0.8],[135,-3.4],[138,-1.7],[141,-2.6],[145,-4.5],[147.5,-6],[150,-10.5],[147.5,-10],[144,-7.7],[141,-9.1],[138,-8.4],[137.8,-5.5],[134.5,-4],[132,-2.8]],
  // Islands
  [[-5.7,50.1],[-3,50.7],[1.4,51.2],[1.7,52.7],[0.2,53.4],[-1.5,55],[-2,56],[-3,56.2],[-2,57.6],[-3.5,58.6],[-5,58.6],[-6,57.5],[-5.5,56],[-4.8,55],[-3.2,54.8],[-3.5,53.4],[-4.8,52.8],[-4.3,51.7],[-3.1,51.4]],
  [[-10,51.7],[-6,52.2],[-6,54.5],[-6.2,55.2],[-8.5,55],[-10,54]],
  [[-24,65.5],[-22,66.4],[-16,66.5],[-13.5,65],[-18,63.4],[-22.5,63.8]],
  [[130.9,34],[132,33.9],[135.2,34.7],[136.8,34.3],[138.8,34.6],[140.8,35.7],[141,38],[142,39.5],[141.5,41.4],[140,40.5],[139.8,38.5],[137,37],[136,36],[133.5,35.5],[131,34.7]],
  [[140,42],[141.5,41.8],[143.3,42],[145.5,43.3],[144.5,44],[141.8,45.4],[141.7,43.5],[140,42.5]],
  [[130,33.9],[131.8,33.3],[131.4,31.4],[130.2,31.2],[129.8,33]],
  [[142,46],[143.5,49],[143,54],[142.5,51]],
  [[95.3,5.6],[98,4],[100.5,2],[103.8,-1],[106,-3],[105.8,-5.8],[104.5,-5.8],[102,-4],[100.3,-1],[98.7,1.5],[96,3.3]],
  [[105.2,-6.8],[108,-6.5],[111,-6.4],[114.5,-7.7],[114.4,-8.7],[110,-8.2],[106.5,-7.5]],
  [[109,1.5],[111,2.5],[113,3.2],[116,6.8],[118,5.5],[117.7,3.5],[118.5,1],[117.5,-1],[116.2,-3.8],[114.5,-4],[112,-3.5],[110,-2.9],[109.5,-1.5]],
  [[119.5,-5.5],[120.3,-3],[119,-0.5],[120,1.2],[123.5,0.9],[125,1.7],[124.5,0],[121.5,-1],[122,-4],[123,-5],[121.5,-4.5],[120.5,-5.8]],
  [[120.3,18.5],[122.2,18.4],[122,16],[121.6,14.2],[124,12.8],[122,14],[120.7,14.5],[120.3,16]],
  [[122,7],[124.5,8.5],[126.5,7],[126.2,6],[125,5.8],[123.5,7.3]],
  [[80,9.7],[81.8,7.5],[81.2,6.2],[80,6],[79.8,8]],
  [[121,25],[122,24.5],[121,22],[120.2,23]],
  [[12.4,38],[15.6,38.2],[15.1,36.7],[12.5,37.6]],
  [[8.2,41],[9.7,41.1],[9.6,39.2],[8.5,39]],
  [[8.6,42.5],[9.5,43],[9.4,41.4],[8.7,41.5]],
  // Antarctica
  [[-180,-79],[-120,-74.5],[-60,-64.5],[-62,-70],[-30,-78],[30,-69],[60,-67],[100,-66],[150,-68],[180,-79],[180,-90],[-180,-90]],
];

/** Inland seas drawn on top of the land. */
export const SEAS: Pt[][] = [
  [[28,41.5],[28.5,43.5],[30,45.5],[33.5,46],[33,44.5],[36.5,45.3],[38,47],[39,45],[37.5,44.5],[40,43.5],[41.7,41.7],[38,41],[35,42],[31.5,41.2]],
  [[47,45],[49,46.5],[53,46.8],[53.5,45],[51,44.5],[51,42.5],[53,40.5],[53.8,37.5],[51,36.8],[49,37.5],[49,40],[47.5,42]],
  [[-95,60],[-92,57],[-85,55.2],[-82,52.8],[-79.5,51.5],[-78.8,55],[-77,59],[-78,62.3],[-82,63],[-88,64],[-93,61]],
];

export const MAP_W = 1000;
export const MAP_H = 405;
export const project = (lon: number, lat: number): [number, number] => [((lon + 180) * MAP_W) / 360, ((84 - lat) * MAP_W) / 360];

function chaikin(pts: Pt[], rounds = 2): Pt[] {
  let p = pts;
  for (let r = 0; r < rounds; r += 1) {
    const out: Pt[] = [];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}
const toPath = (polys: Pt[][], smooth: boolean) =>
  polys
    .map((poly) => {
      const pts = smooth && poly.length > 6 ? chaikin(poly) : poly;
      return "M" + pts.map(([lo, la]) => project(lo, la).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
    })
    .join("");
export const LAND_PATH = toPath(LAND, true);
export const SEA_PATH = toPath(SEAS, true);

export type Kind = "soir" | "stade" | "club";
export type Place = {
  id: string;
  name: string;
  city: string;
  country: string;
  continent: "Europe" | "Amérique du Sud" | "Amérique du Nord" | "Afrique" | "Asie";
  lon: number;
  lat: number;
  kind: Kind;
  text: string;
  matches?: string[];
  clubs?: string[];
};

export const KINDS: Record<Kind, { label: string; color: string }> = {
  soir: { label: "Grand soir", color: "#f6c453" },
  stade: { label: "Stade de légende", color: "#34d399" },
  club: { label: "Club de France", color: "#6f8bff" },
};

export const PLACES: Place[] = [
  { id: "sdf", name: "Stade de France", city: "Saint-Denis", country: "France", continent: "Europe", lon: 2.3601, lat: 48.9245, kind: "soir", matches: ["finale-1998"], text: "C'est ici que la France est devenue championne du monde pour la première fois, le 12 juillet 1998, en battant le Brésil 3-0." },
  { id: "parc", name: "Parc des Princes", city: "Paris", country: "France", continent: "Europe", lon: 2.253, lat: 48.8414, kind: "soir", matches: ["euro-1984"], clubs: ["psg"], text: "La maison du Paris Saint-Germain. La France y a gagné l'Euro 1984 en battant l'Espagne 2-0." },
  { id: "loujniki", name: "Loujniki", city: "Moscou", country: "Russie", continent: "Europe", lon: 37.5539, lat: 55.7158, kind: "soir", matches: ["finale-2018"], text: "La France y est devenue championne du monde pour la deuxième fois, en 2018, en battant la Croatie 4-2." },
  { id: "olympia-berlin", name: "Olympiastadion", city: "Berlin", country: "Allemagne", continent: "Europe", lon: 13.2395, lat: 52.5147, kind: "soir", matches: ["finale-2006"], text: "La finale de la Coupe du monde 2006 : Italie 1-1 France, puis l'Italie gagne aux tirs au but." },
  { id: "kuip", name: "De Kuip", city: "Rotterdam", country: "Pays-Bas", continent: "Europe", lon: 4.5232, lat: 51.8939, kind: "soir", matches: ["euro-2000"], text: "La France y a gagné l'Euro 2000 en battant l'Italie 2-1." },
  { id: "olympia-munich", name: "Olympiastadion de Munich", city: "Munich", country: "Allemagne", continent: "Europe", lon: 11.547, lat: 48.1752, kind: "soir", matches: ["om-1993"], text: "Marseille y a battu Milan 1-0 en finale de la Ligue des champions 1993." },
  { id: "allianz", name: "Allianz Arena", city: "Munich", country: "Allemagne", continent: "Europe", lon: 11.6247, lat: 48.2188, kind: "soir", matches: ["chelsea-2012", "psg-2025"], text: "Deux grandes finales de la Ligue des champions : Chelsea-Bayern en 2012 et PSG 5-0 Inter en 2025." },
  { id: "ataturk", name: "Stade Atatürk", city: "Istanbul", country: "Turquie", continent: "Europe", lon: 28.7658, lat: 41.0742, kind: "soir", matches: ["istanbul-2005"], text: "La finale folle de 2005 : Liverpool revient de 0-3 contre Milan et finit par gagner." },
  { id: "campnou", name: "Camp Nou", city: "Barcelone", country: "Espagne", continent: "Europe", lon: 2.1228, lat: 41.3809, kind: "soir", matches: ["remontada-2017"], text: "Le soir de la remontada : Barcelone bat le PSG 6-1 en 2017." },
  { id: "azteca", name: "Stade Azteca", city: "Mexico", country: "Mexique", continent: "Amérique du Nord", lon: -99.1505, lat: 19.3029, kind: "soir", matches: ["main-de-dieu", "bresil-1970"], text: "Deux moments de légende : la Main de Dieu de Maradona en 1986, et le Brésil de Pelé champion du monde en 1970." },
  { id: "mineirao", name: "Mineirão", city: "Belo Horizonte", country: "Brésil", continent: "Amérique du Sud", lon: -43.971, lat: -19.8659, kind: "soir", matches: ["allemagne-bresil-2014"], text: "Allemagne 7-1 Brésil en demi-finale de la Coupe du monde 2014 : un score que personne n'a oublié." },
  { id: "lusail", name: "Stade de Lusail", city: "Lusail", country: "Qatar", continent: "Asie", lon: 51.4906, lat: 25.4206, kind: "soir", matches: ["finale-2022"], text: "La finale de 2022 : Argentine 3-3 France, puis l'Argentine gagne aux tirs au but." },
  { id: "dallas", name: "Stade de Dallas", city: "Arlington", country: "États-Unis", continent: "Amérique du Nord", lon: -97.0945, lat: 32.7473, kind: "soir", matches: ["demi-2026"], text: "La demi-finale de la Coupe du monde 2026 : France 0-2 Espagne." },
  { id: "metlife", name: "MetLife Stadium", city: "New York / New Jersey", country: "États-Unis", continent: "Amérique du Nord", lon: -74.0745, lat: 40.8135, kind: "soir", matches: ["finale-2026"], text: "La finale de la Coupe du monde 2026 : Espagne 1-0 Argentine." },
  { id: "maracana", name: "Maracanã", city: "Rio de Janeiro", country: "Brésil", continent: "Amérique du Sud", lon: -43.2302, lat: -22.9122, kind: "stade", text: "Le temple du football brésilien. Il a vu la Coupe du monde 1950, où l'Uruguay a battu le Brésil, et la finale de 2014." },
  { id: "wembley", name: "Wembley", city: "Londres", country: "Angleterre", continent: "Europe", lon: -0.2795, lat: 51.556, kind: "stade", text: "Le stade national de l'Angleterre. En 1966, l'Angleterre y a gagné la finale de la Coupe du monde contre l'Allemagne (4-2)." },
  { id: "bernabeu", name: "Santiago-Bernabéu", city: "Madrid", country: "Espagne", continent: "Europe", lon: -3.6883, lat: 40.453, kind: "stade", text: "La maison du Real Madrid, au cœur de la capitale espagnole." },
  { id: "sansiro", name: "San Siro", city: "Milan", country: "Italie", continent: "Europe", lon: 9.124, lat: 45.4781, kind: "stade", text: "Le grand stade de Milan, partagé par l'AC Milan et l'Inter." },
  { id: "oldtrafford", name: "Old Trafford", city: "Manchester", country: "Angleterre", continent: "Europe", lon: -2.2913, lat: 53.4631, kind: "stade", text: "La maison de Manchester United, surnommée le Théâtre des rêves." },
  { id: "anfield", name: "Anfield", city: "Liverpool", country: "Angleterre", continent: "Europe", lon: -2.9609, lat: 53.4308, kind: "stade", text: "La maison de Liverpool, célèbre pour son chant You'll Never Walk Alone." },
  { id: "etihad", name: "Etihad Stadium", city: "Manchester", country: "Angleterre", continent: "Europe", lon: -2.2004, lat: 53.4831, kind: "stade", text: "La maison de Manchester City." },
  { id: "stamford", name: "Stamford Bridge", city: "Londres", country: "Angleterre", continent: "Europe", lon: -0.191, lat: 51.4817, kind: "stade", text: "La maison de Chelsea, dans l'ouest de Londres." },
  { id: "amsterdam", name: "Johan Cruyff Arena", city: "Amsterdam", country: "Pays-Bas", continent: "Europe", lon: 4.9419, lat: 52.3143, kind: "stade", text: "La maison de l'Ajax. Le stade porte le nom du grand Johan Cruyff." },
  { id: "dortmund", name: "Signal Iduna Park", city: "Dortmund", country: "Allemagne", continent: "Europe", lon: 7.4519, lat: 51.4926, kind: "stade", text: "La maison de Dortmund, célèbre pour sa grande tribune sud toute jaune." },
  { id: "juventus", name: "Allianz Stadium", city: "Turin", country: "Italie", continent: "Europe", lon: 7.6412, lat: 45.1096, kind: "stade", text: "La maison de la Juventus." },
  { id: "olimpico", name: "Stadio Olimpico", city: "Rome", country: "Italie", continent: "Europe", lon: 12.4547, lat: 41.9341, kind: "stade", text: "Le stade de Rome. En 1990, l'Allemagne y a gagné la finale de la Coupe du monde contre l'Argentine (1-0)." },
  { id: "mestalla", name: "Mestalla", city: "Valence", country: "Espagne", continent: "Europe", lon: -0.3583, lat: 39.4748, kind: "stade", text: "La maison du FC Valence." },
  { id: "hampden", name: "Hampden Park", city: "Glasgow", country: "Écosse", continent: "Europe", lon: -4.252, lat: 55.8259, kind: "stade", text: "Le stade national de l'Écosse." },
  { id: "bombonera", name: "La Bombonera", city: "Buenos Aires", country: "Argentine", continent: "Amérique du Sud", lon: -58.3647, lat: -34.6356, kind: "stade", text: "Le stade de Boca Juniors, où les tribunes semblent trembler quand les supporters chantent." },
  { id: "monumental", name: "Monumental", city: "Buenos Aires", country: "Argentine", continent: "Amérique du Sud", lon: -58.4498, lat: -34.5453, kind: "stade", text: "Le stade de River Plate, l'un des plus grands d'Argentine." },
  { id: "centenario", name: "Estadio Centenario", city: "Montevideo", country: "Uruguay", continent: "Amérique du Sud", lon: -56.1527, lat: -34.8946, kind: "stade", text: "Construit pour la toute première Coupe du monde, en 1930. L'Uruguay y a battu l'Argentine 4-2 en finale." },
  { id: "rosebowl", name: "Rose Bowl", city: "Pasadena", country: "États-Unis", continent: "Amérique du Nord", lon: -118.1676, lat: 34.1613, kind: "stade", text: "La finale de la Coupe du monde 1994 s'y est jouée : le Brésil a battu l'Italie aux tirs au but." },
  { id: "soccercity", name: "Soccer City", city: "Johannesburg", country: "Afrique du Sud", continent: "Afrique", lon: 27.9826, lat: -26.2347, kind: "stade", text: "La finale de la Coupe du monde 2010 : l'Espagne a battu les Pays-Bas 1-0." },
  { id: "caire", name: "Stade international du Caire", city: "Le Caire", country: "Égypte", continent: "Afrique", lon: 31.317, lat: 30.0698, kind: "stade", text: "Le grand stade du Caire, où joue l'équipe d'Égypte." },
  { id: "yokohama", name: "Stade international de Yokohama", city: "Yokohama", country: "Japon", continent: "Asie", lon: 139.606, lat: 35.51, kind: "stade", text: "La finale de la Coupe du monde 2002 : le Brésil a battu l'Allemagne 2-0." },
  { id: "velodrome", name: "Stade Vélodrome", city: "Marseille", country: "France", continent: "Europe", lon: 5.3959, lat: 43.2698, kind: "club", clubs: ["om"], text: "La maison de l'Olympique de Marseille. Plus de 67 000 places." },
  { id: "groupama", name: "Groupama Stadium", city: "Décines-Charpieu", country: "France", continent: "Europe", lon: 4.9823, lat: 45.7653, kind: "club", clubs: ["ol"], text: "La maison de l'Olympique Lyonnais, près de Lyon." },
  { id: "geoffroy", name: "Geoffroy-Guichard", city: "Saint-Étienne", country: "France", continent: "Europe", lon: 4.3903, lat: 45.4607, kind: "club", clubs: ["asse"], text: "Le Chaudron des Verts de Saint-Étienne." },
  { id: "louis2", name: "Stade Louis-II", city: "Monaco", country: "Monaco", continent: "Europe", lon: 7.4156, lat: 43.7277, kind: "club", clubs: ["monaco"], text: "La maison de l'AS Monaco, au bord de la mer." },
  { id: "mauroy", name: "Stade Pierre-Mauroy", city: "Villeneuve-d'Ascq", country: "France", continent: "Europe", lon: 3.1305, lat: 50.6119, kind: "club", clubs: ["lille"], text: "La maison du LOSC Lille, près de Lille." },
  { id: "delaune", name: "Stade Auguste-Delaune", city: "Reims", country: "France", continent: "Europe", lon: 4.0253, lat: 49.2465, kind: "club", clubs: ["reims"], text: "La maison du Stade de Reims." },
  { id: "bollaert", name: "Stade Bollaert-Delelis", city: "Lens", country: "France", continent: "Europe", lon: 2.8156, lat: 50.4328, kind: "club", clubs: ["lens"], text: "La maison du RC Lens, avec ses supporters en rouge et jaune." },
];

export type Tour = { id: string; title: string; tag: string; stops: { place: string; note: string }[] };
export const TOURS: Tour[] = [
  {
    id: "mondial",
    title: "Les finales de la Coupe du monde",
    tag: "13 étapes, de 1930 à 2026",
    stops: [
      { place: "centenario", note: "1930 : la toute première finale. L'Uruguay bat l'Argentine 4-2." },
      { place: "wembley", note: "1966 : l'Angleterre bat l'Allemagne 4-2." },
      { place: "azteca", note: "1970 : le Brésil de Pelé bat l'Italie 4-1." },
      { place: "olimpico", note: "1990 : l'Allemagne bat l'Argentine 1-0." },
      { place: "rosebowl", note: "1994 : le Brésil gagne aux tirs au but contre l'Italie." },
      { place: "sdf", note: "1998 : la France championne du monde, 3-0 contre le Brésil." },
      { place: "yokohama", note: "2002 : le Brésil bat l'Allemagne 2-0." },
      { place: "olympia-berlin", note: "2006 : l'Italie gagne aux tirs au but contre la France." },
      { place: "soccercity", note: "2010 : l'Espagne bat les Pays-Bas 1-0." },
      { place: "maracana", note: "2014 : l'Allemagne est championne du monde." },
      { place: "loujniki", note: "2018 : la France bat la Croatie 4-2." },
      { place: "lusail", note: "2022 : Argentine 3-3 France, l'Argentine gagne aux tirs au but." },
      { place: "metlife", note: "2026 : l'Espagne bat l'Argentine 1-0." },
    ],
  },
  {
    id: "europe",
    title: "Les temples du football européen",
    tag: "10 étapes en Europe",
    stops: [
      { place: "wembley", note: "On commence à Londres." },
      { place: "stamford", note: "Chelsea, toujours à Londres." },
      { place: "oldtrafford", note: "Manchester United." },
      { place: "anfield", note: "Liverpool." },
      { place: "amsterdam", note: "L'Ajax et Johan Cruyff." },
      { place: "dortmund", note: "Le mur jaune de Dortmund." },
      { place: "sansiro", note: "Milan." },
      { place: "olimpico", note: "Rome." },
      { place: "bernabeu", note: "Madrid." },
      { place: "campnou", note: "Barcelone, pour finir." },
    ],
  },
  {
    id: "france",
    title: "Les stades de France",
    tag: "9 étapes, du Nord au Sud",
    stops: [
      { place: "mauroy", note: "On part du Nord." },
      { place: "bollaert", note: "Lens, tout près." },
      { place: "delaune", note: "Reims." },
      { place: "sdf", note: "Le plus grand stade du pays." },
      { place: "parc", note: "Le Parc des Princes, à Paris." },
      { place: "geoffroy", note: "Saint-Étienne." },
      { place: "groupama", note: "Lyon." },
      { place: "velodrome", note: "Marseille." },
      { place: "louis2", note: "Monaco, au bord de la mer." },
    ],
  },
];
