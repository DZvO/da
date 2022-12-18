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

const gpsChart = new GpsChart("gpsChart")

const lapList = new LapList(
  "lapList",
  laps,
  (index, color, trackname) => {
    gpsChart.setTrack(trackname)
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

const plot = new ComparisonChart(
  "plot",
  (idx, p) => {
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