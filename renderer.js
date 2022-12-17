/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const GpsChart = require("./js/GpsChart")
const PlotView = require("./js/PlotChart")
const ComparisonChart = require("./js/ComparisonChart")
var fs = require('graceful-fs');
const LapList = require("./js/LapList");


function getDistanceFromLatLonInKm(a, b) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(b.lat - a.lat);  // deg2rad below
  var dLon = deg2rad(b.lon - a.lon);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return Math.abs(d);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

function msToH(m) {
  return m / 3.6e+5
}

const coords = [
  { "ts": 1668885094341, "lat": 52.0270976, "lon": 11.2803143 },
  { "ts": 1668885094341, "lat": 52.0275448, "lon": 11.2781256 },
  { "ts": 1668885094341, "lat": 52.0278962, "lon": 11.2763795 },
  { "ts": 1668885094341, "lat": 52.0281635, "lon": 11.2750679 },
  { "ts": 1668885094341, "lat": 52.0282889, "lon": 11.2744269 },
  { "ts": 1668885094341, "lat": 52.0283020, "lon": 11.2740085 },
  { "ts": 1668885094341, "lat": 52.0282460, "lon": 11.2737671 },
  { "ts": 1668885094341, "lat": 52.0281701, "lon": 11.2735820 },
  { "ts": 1668885094341, "lat": 52.0280942, "lon": 11.2733969 },
  { "ts": 1668885094341, "lat": 52.0280480, "lon": 11.2732574 },
  { "ts": 1668885094341, "lat": 52.0280232, "lon": 11.2730536 },
  { "ts": 1668885094341, "lat": 52.0280249, "lon": 11.2728739 },
  { "ts": 1668885094341, "lat": 52.0280678, "lon": 11.2726539 },
  { "ts": 1668885094341, "lat": 52.0281734, "lon": 11.2725413 },
  { "ts": 1668885094341, "lat": 52.0282410, "lon": 11.2724045 },
  { "ts": 1668885094341, "lat": 52.0284637, "lon": 11.2723348 },
  { "ts": 1668885094341, "lat": 52.0286551, "lon": 11.2723401 },
  { "ts": 1668885094341, "lat": 52.0287624, "lon": 11.2724340 },
  { "ts": 1668885094341, "lat": 52.0288581, "lon": 11.2725654 },
  { "ts": 1668885094341, "lat": 52.0289240, "lon": 11.2726781 },
  { "ts": 1668885094341, "lat": 52.0289603, "lon": 11.2728927 },
  { "ts": 1668885094341, "lat": 52.0289653, "lon": 11.2733379 },
  { "ts": 1668885094341, "lat": 52.0289389, "lon": 11.2737375 },
  { "ts": 1668885094341, "lat": 52.0288927, "lon": 11.2741372 },
  { "ts": 1668885094341, "lat": 52.0288531, "lon": 11.2745556 },
  { "ts": 1668885094341, "lat": 52.0288135, "lon": 11.2749445 },
  { "ts": 1668885094341, "lat": 52.0287888, "lon": 11.2752637 },
  { "ts": 1668885094341, "lat": 52.0287294, "lon": 11.2758806 },
  { "ts": 1668885094341, "lat": 52.0286601, "lon": 11.2766612 },
  { "ts": 1668885094341, "lat": 52.0286254, "lon": 11.2771091 },
  { "ts": 1668885094341, "lat": 52.0286617, "lon": 11.2773719 },
  { "ts": 1668885094341, "lat": 52.0287360, "lon": 11.2775436 },
  { "ts": 1668885094341, "lat": 52.0288333, "lon": 11.2776697 },
  { "ts": 1668885094341, "lat": 52.0289752, "lon": 11.2777367 },
  { "ts": 1668885094341, "lat": 52.0291039, "lon": 11.2777367 },
  { "ts": 1668885094341, "lat": 52.0292078, "lon": 11.2776884 },
  { "ts": 1668885094341, "lat": 52.0292689, "lon": 11.2775704 },
  { "ts": 1668885094341, "lat": 52.0293217, "lon": 11.2774631 },
  { "ts": 1668885094341, "lat": 52.0293745, "lon": 11.2773156 },
  { "ts": 1668885094341, "lat": 52.0294141, "lon": 11.2770689 },
  { "ts": 1668885094341, "lat": 52.0294520, "lon": 11.2766799 },
  { "ts": 1668885094341, "lat": 52.0295114, "lon": 11.2763956 },
  { "ts": 1668885094341, "lat": 52.0295493, "lon": 11.2759450 },
  { "ts": 1668885094341, "lat": 52.0296054, "lon": 11.2756634 },
  { "ts": 1668885094341, "lat": 52.0296747, "lon": 11.2752315 },
  { "ts": 1668885094341, "lat": 52.0297275, "lon": 11.2747273 },
  { "ts": 1668885094341, "lat": 52.0298084, "lon": 11.2742150 },
  { "ts": 1668885094341, "lat": 52.0298678, "lon": 11.2737617 },
  { "ts": 1668885094341, "lat": 52.0299172, "lon": 11.2732762 },
  { "ts": 1668885094341, "lat": 52.0299799, "lon": 11.2729704 },
  { "ts": 1668885094341, "lat": 52.0300179, "lon": 11.2725037 },
  { "ts": 1668885094341, "lat": 52.0299948, "lon": 11.2722275 },
  { "ts": 1668885094341, "lat": 52.0299255, "lon": 11.2719780 },
  { "ts": 1668885094341, "lat": 52.0297671, "lon": 11.2716669 },
  { "ts": 1668885094341, "lat": 52.0296912, "lon": 11.2714121 },
  { "ts": 1668885094341, "lat": 52.0295658, "lon": 11.2711546 },
  { "ts": 1668885094341, "lat": 52.0294503, "lon": 11.2710124 },
  { "ts": 1668885094341, "lat": 52.0292029, "lon": 11.2708971 },
  { "ts": 1668885094341, "lat": 52.0289768, "lon": 11.2708059 },
  { "ts": 1668885094341, "lat": 52.0287756, "lon": 11.2707844 },
  { "ts": 1668885094341, "lat": 52.0285462, "lon": 11.2708059 },
  { "ts": 1668885094341, "lat": 52.0284159, "lon": 11.2709239 },
  { "ts": 1668885094341, "lat": 52.0282311, "lon": 11.2710258 },
  { "ts": 1668885094341, "lat": 52.0280430, "lon": 11.2710097 },
  { "ts": 1668885094341, "lat": 52.0279176, "lon": 11.2709239 },
  { "ts": 1668885094341, "lat": 52.0277955, "lon": 11.2707147 },
  { "ts": 1668885094341, "lat": 52.0277328, "lon": 11.2704250 },
  { "ts": 1668885094341, "lat": 52.0277823, "lon": 11.2700361 },
  { "ts": 1668885094341, "lat": 52.0279770, "lon": 11.2697491 },
  { "ts": 1668885094341, "lat": 52.0283070, "lon": 11.2695882 },
  { "ts": 1668885094341, "lat": 52.0287195, "lon": 11.2696043 },
  { "ts": 1668885094341, "lat": 52.0291286, "lon": 11.2696311 },
  { "ts": 1668885094341, "lat": 52.0294701, "lon": 11.2696820 },
  { "ts": 1668885094341, "lat": 52.0298315, "lon": 11.2700415 },
  { "ts": 1668885094341, "lat": 52.0301488, "lon": 11.2702453 },
  { "ts": 1668885094341, "lat": 52.0304287, "lon": 11.2704223 },
  { "ts": 1668885094341, "lat": 52.0306201, "lon": 11.2705913 },
  { "ts": 1668885094341, "lat": 52.0307388, "lon": 11.2710151 },
  { "ts": 1668885094341, "lat": 52.0307553, "lon": 11.2713370 },
  { "ts": 1668885094341, "lat": 52.0307388, "lon": 11.2716696 },
  { "ts": 1668885094341, "lat": 52.0306910, "lon": 11.2720504 },
  { "ts": 1668885094341, "lat": 52.0306465, "lon": 11.2724742 },
  { "ts": 1668885094341, "lat": 52.0305805, "lon": 11.2728095 },
  { "ts": 1668885094341, "lat": 52.0305458, "lon": 11.2731072 },
  { "ts": 1668885094341, "lat": 52.0305013, "lon": 11.2733889 },
  { "ts": 1668885094341, "lat": 52.0304626, "lon": 11.2736517 },
  { "ts": 1668885094341, "lat": 52.0304378, "lon": 11.2739575 },
  { "ts": 1668885094341, "lat": 52.0303949, "lon": 11.2742552 },
  { "ts": 1668885094341, "lat": 52.0303586, "lon": 11.2745717 },
  { "ts": 1668885094341, "lat": 52.0303058, "lon": 11.2748775 },
  { "ts": 1668885094341, "lat": 52.0302497, "lon": 11.2752825 },
  { "ts": 1668885094341, "lat": 52.0302084, "lon": 11.2756687 },
  { "ts": 1668885094341, "lat": 52.0301507, "lon": 11.2760925 },
  { "ts": 1668885094341, "lat": 52.0300781, "lon": 11.2764439 },
  { "ts": 1668885094341, "lat": 52.0300202, "lon": 11.2768757 },
  { "ts": 1668885094341, "lat": 52.0299839, "lon": 11.2771788 },
  { "ts": 1668885094341, "lat": 52.0299410, "lon": 11.2775302 },
  { "ts": 1668885094341, "lat": 52.0298816, "lon": 11.2779245 },
  { "ts": 1668885094341, "lat": 52.0298090, "lon": 11.2784985 },
  { "ts": 1668885094341, "lat": 52.0297347, "lon": 11.2788606 },
  { "ts": 1668885094341, "lat": 52.0296588, "lon": 11.2792763 },
  { "ts": 1668885094341, "lat": 52.0295004, "lon": 11.2795123 },
  { "ts": 1668885094341, "lat": 52.0292232, "lon": 11.2797081 },
  { "ts": 1668885094341, "lat": 52.0289923, "lon": 11.2798449 },
  { "ts": 1668885094341, "lat": 52.0287629, "lon": 11.2800381 },
  { "ts": 1668885094341, "lat": 52.0287019, "lon": 11.2803760 },
  { "ts": 1668885094341, "lat": 52.0286359, "lon": 11.2809098 },
  { "ts": 1668885094341, "lat": 52.0285979, "lon": 11.2813255 },
  { "ts": 1668885094341, "lat": 52.0285583, "lon": 11.2817037 },
  { "ts": 1668885094341, "lat": 52.0285286, "lon": 11.2820363 },
  { "ts": 1668885094341, "lat": 52.0284808, "lon": 11.2824655 },
  { "ts": 1668885094341, "lat": 52.0284494, "lon": 11.2828249 },
  { "ts": 1668885094341, "lat": 52.0284164, "lon": 11.2831655 },
  { "ts": 1668885094341, "lat": 52.0283538, "lon": 11.2835276 },
  { "ts": 1668885094341, "lat": 52.0282317, "lon": 11.2837824 },
  { "ts": 1668885094341, "lat": 52.0280436, "lon": 11.2839514 },
  { "ts": 1668885094341, "lat": 52.0278291, "lon": 11.2840480 },
  { "ts": 1668885094341, "lat": 52.0276031, "lon": 11.2841740 },
  { "ts": 1668885094341, "lat": 52.0274331, "lon": 11.2842652 },
  { "ts": 1668885094341, "lat": 52.0272830, "lon": 11.2843376 },
  { "ts": 1668885094341, "lat": 52.0271196, "lon": 11.2844181 },
  { "ts": 1668885094341, "lat": 52.0269695, "lon": 11.2844771 },
  { "ts": 1668885094341, "lat": 52.0267698, "lon": 11.2845388 },
  { "ts": 1668885094341, "lat": 52.0266115, "lon": 11.2845147 },
  { "ts": 1668885094341, "lat": 52.0264729, "lon": 11.2843832 },
  { "ts": 1668885094341, "lat": 52.0263970, "lon": 11.2839165 },
  { "ts": 1668885094341, "lat": 52.0264976, "lon": 11.2833157 },
  { "ts": 1668885094341, "lat": 52.0266346, "lon": 11.2826774 },
  { "ts": 1668885094341, "lat": 52.0267566, "lon": 11.2819397 },
  { "ts": 1668885094341, "lat": 52.0268672, "lon": 11.2816072 },
  { "ts": 1668885094341, "lat": 52.0269299, "lon": 11.2811163 },
  { "ts": 1668885094341, "lat": 52.0270487, "lon": 11.2806630 },
  { "ts": 1668885094341, "lat": 52.0271510, "lon": 11.2801722 },
  { "ts": 1668885094341, "lat": 52.0272632, "lon": 11.2796384 },
  { "ts": 1668885094341, "lat": 52.0273919, "lon": 11.2789920 },
  { "ts": 1668885094341, "lat": 52.0275288, "lon": 11.2782571 },
  { "ts": 1668885094341, "lat": 52.0276278, "lon": 11.2777367 },
  { "ts": 1668885094341, "lat": 52.0277251, "lon": 11.2773076 },
  { "ts": 1668885094341, "lat": 52.0278324, "lon": 11.2768275 },
  { "ts": 1668885094341, "lat": 52.0281195, "lon": 11.2753952 },
  { "ts": 1668885094341, "lat": 52.0282201, "lon": 11.2748426 },
  { "ts": 1668885094341, "lat": 52.0283158, "lon": 11.2741935 },
  { "ts": 1668885094341, "lat": 52.0284494, "lon": 11.2736598 },
  { "ts": 1668885094341, "lat": 52.0283769, "lon": 11.2734613 },
  { "ts": 1668885094341, "lat": 52.0281789, "lon": 11.2733755 },
]


for (let i = 1; i < coords.length; i++) {
  coords[i].ts += i * 100;
}

const basets = coords[0].ts
const dataset = []
for (let i = 1; i < coords.length; i++) {
  dataset.push({
    value: getDistanceFromLatLonInKm(coords[i - 1], coords[i]) / msToH(coords[i].ts - coords[i - 1].ts),
    ts: coords[i].ts
  })
}

const dataset2 = []
for (let i = 1; i < coords.length / 2; i++) {
  dataset2.push({
    value: (Math.sin(i / 2) + 1) * 10,
    ts: coords[i].ts + 10000000
  })
}

const finishline = {
  //start: {lat: 52.0269031, lon: 11.2802439},
  start: {lat: 51.532792, lon: 6.957120},
  //end: {lat: 52.0273181, lon: 11.2804565}
  end: {lat: 51.532538, lon: 6.957288}
}

const laps = []
const lapFiles = fs.readdirSync("dl/laps")
  .filter(element => element.endsWith(".json"))
lapFiles.forEach(element => {
    const content = fs.readFileSync("dl/laps/" + element, {encoding: "utf-8"})
    const data = JSON.parse(content)
    laps.push(data)
    console.log(data.laptime)
})


/*let t = fs
    .readFileSync("dl/inprogress/accumulation.sorted.log", {encoding: "utf-8"})
    .split("\n")
    .sort()
    .filter(e => e != "")
    .map(e => {
      let elements = e.split(",")
      let date = elements[0] //221203_155034300
      let sats = elements[1] // 1
      let speed = elements[2] // 2.96
      let lat = elements[3] // 51.5344429016
      let lon = elements[4] // 6.9596800804
      return {
        ts: new Date(
          "20" + date.substring(0, 2),
          date.substring(2, 4) - 1,
          date.substring(4, 6),
          date.substring(7, 9),
          date.substring(9, 11),
          date.substring(11, 13),
          date.substring(13, 15)
        ),
        sattelites: parseInt(sats),
        speed: parseFloat(speed),
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      }
  })
  .filter(e => e.ts >= new Date("2022-12-10"))*/
const gpsChart = new GpsChart("gpsChart", finishline)

const lapList = new LapList(
  "lapList",
  laps,
  (index, color) => {
    gpsChart.addElement(index, laps[index], color)
    gpsChart.draw()
    plot.addElement(index, laps[index], color)
    plot.draw()
  },
  (index) => {
    gpsChart.removeElement(index)
    gpsChart.draw()
    plot.removeElement(index)
    plot.draw()
  }
)

/*const plot1 = new PlotView(
  "plot1",
  dataset,
  (i) => {
    gpsChart.setPointer(i)
    plot2.setPointer(i)
  },
  (i) => {
    plot2.setScroll(i)
  },
  (i) => {
    plot2.setZoom(i)
  }
)
const plot2 = new PlotView(
  "plot2",
  dataset,
  (i) => {
    gpsChart.setPointer(i)
    plot1.setPointer(i)
  },
  (i) => {
    plot1.setScroll(i)
  },
  (i) => {
    plot1.setZoom(i)
  }
)*/

const datasets = [dataset, dataset2]

const plot = new ComparisonChart(
  "plot",
  (idx, p) => {
    //gpsChart.setPointer(i)
    //plot1.setPointer(i)
    gpsChart.setPointer(idx, p)
  },
  (i) => {
  },
  (i) => {
  }
)


document.querySelector('#buttonload').addEventListener('click', () => {
  downloadFiles()
})

async function getListOfFiles() {
  let elements = []
  await fetch("http://esp32.local/list")
  .then(response => response.text())
  .then(async data => {
      elements = data.split(",").filter(element => element.endsWith(".log"))
    }
  )
  return elements
}

async function downloadFiles() {
  try {
    if(!fs.existsSync("dl"))
      fs.mkdirSync("dl")
    
    let filesList = getListOfFiles()
    while((await filesList).length > 1) {
      const elements = (await filesList)
      console.log("fetching " + elements)
      for (let i = 0; i < elements.length; i++) {
        await fetch("http://esp32.local/get?filename=" + elements[i])
        .then(response => response.text())
        .catch((error) => {
          console.error(error);
        })
        .then(data => {
          document.querySelector('#loadprogress')
            .setAttribute("value", (i / (elements.length-1)) * 100)
          console.log("downloaded " + elements[i])
          if(fs.existsSync("dl/" + elements[i])) {
            fs.rmSync("dl/" + elements[i])
          }
          fs.writeFileSync("dl/" + elements[i], data)
          console.log("wrote " + elements[i])
          fetch("http://esp32.local/delete?filename=" + elements[i])
          .then(s => console.log("deleted " + elements[i]), e => console.log(e))
        }).catch((error) => {
          console.error(error);
        })
      }
      filesList = getListOfFiles()
    }
  } finally {
    parseFiles()
  }
}


function parseFiles() {
  if(!fs.existsSync("dl/processed"))
    fs.mkdirSync("dl/processed") // move log files here after done
  if(!fs.existsSync("dl/inprogress"))
    fs.mkdirSync("dl/inprogress")// bunched up log lines before laps are extraced
  if(!fs.existsSync("dl/laps"))
    fs.mkdirSync("dl/laps")      // one lap per file

  concatenateFiles()
  sortAccumulationFile()
  extractLaps()
}

function concatenateFiles() {
  console.log("concat")
  const logFiles = fs.readdirSync("dl")
    .filter(element => element.endsWith(".log"))
  logFiles.forEach(element => {
    const content = fs.readFileSync("dl/" + element, {encoding: "utf-8"})
    fs.appendFileSync("dl/inprogress/accumulation.log", content, "utf-8")
    fs.copyFileSync("dl/" + element, "dl/processed/" + element)
    fs.rmSync("dl/" + element)
  })
}

function sortAccumulationFile() {
  console.log("sort accum")
  if(fs.existsSync("dl/inprogress/accumulation.log")) {
    let acc = fs.readFileSync("dl/inprogress/accumulation.log", {encoding: "utf-8"})
    let elements = acc.split("\n").sort().filter(e => e != "")
    try {
      fs.rmSync("dl/inprogress/accumulation.sorted.log")
    } catch {}
    for(let i = 0; i < elements.length; i++) {
      fs.appendFileSync("dl/inprogress/accumulation.sorted.log", elements[i] + "\n", "utf-8")
    }
    fs.rmSync("dl/inprogress/accumulation.log")
  }
}

function extractLaps() {
  console.log("extract laps")
  let t = fs
    .readFileSync("dl/inprogress/accumulation.sorted.log", {encoding: "utf-8"})
    .split("\n")
    .filter(e => e != "")
    .map(e => {
      let elements = e.split(",")
      let date = elements[0] //221203_155034300
                             //0123456789012345
      let sats = elements[1] // 1
      let speed = elements[2] // 2.96
      let lat = elements[3] // 51.5344429016
      let lon = elements[4] // 6.9596800804
      return {
        timestamp: new Date(
          "20" + date.substring(0, 2),
          date.substring(2, 4) - 1,
          date.substring(4, 6),
          date.substring(7, 9),
          date.substring(9, 11),
          date.substring(11, 13),
          date.substring(13, 16)
        ),
        sattelites: parseInt(sats),
        speed: parseFloat(speed),
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      }
  })
  // TODO process which track we're dealing with
  let lastIndex = 0;
  let crossingAIndex = null
  let crossingBIndex = null
  for(let i = 0; i < t.length - 1; i++) {
      document.querySelector('#loadprogress')
        .setAttribute("value", (i / (t.length-1)) * 100)
      let k = crossesStartFinishLine(t[i], t[i+1])
      if(k != false) {
        if(crossingAIndex == null) {
          crossingAIndex = i
        } else {
          crossingBIndex = i
        }
      }

      if(crossingAIndex != null && crossingBIndex != null) {
        exportLapFile(t.slice(crossingAIndex, crossingBIndex + 1 + 1))
        lastIndex = i
        crossingAIndex = null
        crossingBIndex = null
        i -= 1
      }
  }

  let writeBack = fs
    .readFileSync("dl/inprogress/accumulation.sorted.log", {encoding: "utf-8"})
    .split("\n")
    .sort()
    .filter(e => e != "")
    .slice(lastIndex)
  try {
    fs.rmSync("dl/inprogress/accumulation.sorted.log")
  } catch {}
  for(let i = 0; i < writeBack.length; i++) {
    fs.appendFileSync("dl/inprogress/accumulation.sorted.log", writeBack[i] + "\n", "utf-8")
  }
}

function exportLapFile(sliceToExport) {
  console.log("exporting lap!")
  let filename = sliceToExport[0].timestamp.getTime()
  let filledSlice = []
  let beginTimeStamp = sliceToExport[0].timestamp.getTime()
  let endTimeStamp = sliceToExport[sliceToExport.length - 1].timestamp.getTime()
  let n = 0
  let prev = structuredClone(sliceToExport[0])
  for(let i = beginTimeStamp; i <= endTimeStamp; i += 100) {
    // TODO some samples have .X99Z timestamp, these will be overriden by this
    // -> make this more robust
    if(sliceToExport[n].timestamp.getTime() > i) {
      prev.timestamp = new Date(i)
      filledSlice.push(structuredClone(prev))
    } else {
      let k = sliceToExport[n]
      k.timestamp = new Date(i)
      filledSlice.push(k)
      prev = structuredClone(k)
      n++
    }
  }
  let exportMap = {samples: filledSlice}
  let contentInJSON = JSON.stringify(exportMap, null, 2)
  fs.writeFileSync("dl/laps/" + filename + ".json", contentInJSON)
  processLapFile("dl/laps/" + filename + ".json")
}

function processLapFile(path) {
  let j = JSON.parse(fs.readFileSync(path, {encoding: "utf-8"}))
  //if(j.has("info")) return
  
  let samples = j.samples
  let startTime = null
  let endTime = null
  for(let i = 0; i < samples.length - 1 - 1; i++) {
    let k = crossesStartFinishLine(samples[i], samples[i + 1])
    if(k != false) {
      startTime = new Date(samples[i].timestamp)
      // TODO use middle of tow samples as first approx
      // TODO fancy calc using current speed (samples[i].speed) and distance from intersection point to point at i
      break
    }
  }
  for(let i = samples.length - 1; i > 1; i--) {
    let k = crossesStartFinishLine(samples[i], samples[i - 1])
    if(k != false) {
      endTime = new Date(samples[i].timestamp)
      // TODO use middle of two samples as first approx
      // TODO fancy calc using current speed (samples[i].speed) and distance from intersection point to point at i
      break
    }
  }
  // TODO add sector times
  console.log("start time " + startTime)
  console.log("end time " + endTime)
  j.laptime = endTime - startTime
  console.log("exporting lap with time " + j.laptime)
  fs.writeFileSync(path, JSON.stringify(j)) // TODO check if this appends or rewrites file
}

function crossesStartFinishLine(from, to) {
  // x = lon
  // y = lat

  return intersect(
    from.lon, from.lat,
    to.lon, to.lat,
    finishline.start.lon, finishline.start.lat,
    finishline.end.lon, finishline.end.lat
  )
}

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {

  // Check if none of the lines are of length 0
	if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
		return false
	}

	denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

  // Lines are parallel
	if (denominator === 0) {
		return false
	}

	let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
	let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // is the intersection along the segments
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		return false
	}

  // Return a object with the x and y coordinates of the intersection
	let x = x1 + ua * (x2 - x1)
	let y = y1 + ua * (y2 - y1)

	return {x, y}
}