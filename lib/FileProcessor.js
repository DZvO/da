const fs = require('graceful-fs');

module.exports = class FileProcessor {
  constructor() {
    this.finishline = {
      // start: {lat: 52.0269031, lon: 11.2802439},
      start: { lat: 51.532792, lon: 6.957120 },
      // end: {lat: 52.0273181, lon: 11.2804565}
      end: { lat: 51.532538, lon: 6.957288 },
    };
    this.trackDefs = {}

    this.#populateTrackDefs();
  }

  parseFiles() {
    // move log files here after done
    if (!fs.existsSync('dl/processed')) {
      fs.mkdirSync('dl/processed');
    }
    // bunched up log lines before laps are extraced
    if (!fs.existsSync('dl/inprogress')) {
      fs.mkdirSync('dl/inprogress');
    }
    // one lap per file
    if (!fs.existsSync('dl/laps')) {
      fs.mkdirSync('dl/laps');
    }

    this.concatenateFiles();
    this.sortAccumulationFile();
    this.extractLaps();
  }

  concatenateFiles() {
    console.log('%cadding all newly downloaded files to accumulation file', `color: gray;`);
    const logFiles = fs.readdirSync('dl')
      .filter((element) => element.endsWith('.log'));
    logFiles.forEach((element) => {
      const content = fs.readFileSync(`dl/${element}`, { encoding: 'utf-8' });
      fs.appendFileSync('dl/inprogress/accumulation.log', content, 'utf-8');
      fs.copyFileSync(`dl/${element}`, `dl/processed/${element}`);
      fs.rmSync(`dl/${element}`);
    });
  }

  sortAccumulationFile() {
    console.log('%csorting accumulation file by timestamp, this might take a bit', `color: gray;`);
    if (fs.existsSync('dl/inprogress/accumulation.log')) {
      const acc = fs.readFileSync('dl/inprogress/accumulation.log', { encoding: 'utf-8' });
      const elements = acc.split('\n').sort().filter((e) => e != '');
      try {
        fs.rmSync('dl/inprogress/accumulation.sorted.log');
      } catch { }
      for (let i = 0; i < elements.length; i++) {
        fs.appendFileSync('dl/inprogress/accumulation.sorted.log', `${elements[i]}\n`, 'utf-8');
      }
      fs.rmSync('dl/inprogress/accumulation.log');
    }
  }

  extractLaps() {
    console.log('%cexttracing laps from accumulation file', `color:gray;`);
    const t = fs
      .readFileSync('dl/inprogress/accumulation.sorted.log', { encoding: 'utf-8' })
      .split('\n')
      .filter((e) => e != '')
      .map((e) => {
        const elements = e.split(',');
        const date = elements[0]; // 221203_155034300
        // 0123456789012345
        const sats = elements[1]; // 1
        const speed = elements[2]; // 2.96
        const lat = elements[3]; // 51.5344429016
        const lon = elements[4]; // 6.9596800804
        return {
          timestamp: new Date(
            `20${date.substring(0, 2)}`,
            date.substring(2, 4) - 1,
            date.substring(4, 6),
            date.substring(7, 9),
            date.substring(9, 11),
            date.substring(11, 13),
            date.substring(13, 16),
          ),
          sattelites: parseInt(sats),
          speed: parseFloat(speed),
          lat: parseFloat(lat),
          lon: parseFloat(lon),
        };
      });
    let lastIndex = 0;
    let crossingAIndex = null;
    let crossingBIndex = null;
    for (let i = 0; i < t.length - 1; i++) {
      document.querySelector('#loadprogress')
        .setAttribute('value', (i / (t.length - 1)) * 100);
      const [crossing, track] = this.crossesStartFinishLine(t[i], t[i + 1]);
      if (crossing != false) {
        if (crossingAIndex == null) {
          crossingAIndex = i;
        } else {
          crossingBIndex = i;
        }
      }

      if (crossingAIndex != null && crossingBIndex != null) {
        this.exportLapFile(t.slice(crossingAIndex, crossingBIndex + 1 + 1));
        lastIndex = i;
        crossingAIndex = null;
        crossingBIndex = null;
        i -= 1;
      }
    }

    const writeBack = fs
      .readFileSync('dl/inprogress/accumulation.sorted.log', { encoding: 'utf-8' })
      .split('\n')
      .sort()
      .filter((e) => e != '')
      .slice(lastIndex);
    try {
      fs.rmSync('dl/inprogress/accumulation.sorted.log');
    } catch { }
    for (let i = 0; i < writeBack.length; i++) {
      fs.appendFileSync('dl/inprogress/accumulation.sorted.log', `${writeBack[i]}\n`, 'utf-8');
    }
  }

  exportLapFile(sliceToExport) {
    const filename = sliceToExport[0].timestamp.getTime();
    const filledSlice = [];
    const beginTimeStamp = sliceToExport[0].timestamp.getTime();
    const endTimeStamp = sliceToExport[sliceToExport.length - 1].timestamp.getTime();
    let n = 0;
    let prev = structuredClone(sliceToExport[0]);
    for (let i = beginTimeStamp; i <= endTimeStamp; i += 100) {
      // TODO some samples have .X99Z timestamp, these will be overriden by this
      // -> make this more robust
      if (sliceToExport[n].timestamp.getTime() > i) {
        prev.timestamp = new Date(i);
        filledSlice.push(structuredClone(prev));
      } else {
        const k = sliceToExport[n];
        k.timestamp = new Date(i);
        filledSlice.push(k);
        prev = structuredClone(k);
        n++;
      }
    }
    const exportMap = { samples: filledSlice };
    const contentInJSON = JSON.stringify(exportMap, null, 2);
    fs.writeFileSync(`dl/laps/${filename}.json`, contentInJSON);
    this.processLapFile(`dl/laps/${filename}.json`);
  }

  processLapFile(path) {
    const j = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));
    // if(j.has("info")) return

    const { samples } = j;
    let startTime = null;
    let endTime = null;
    let track = null;
    // TODO sector times
    for (let i = 0; i < samples.length - 1 - 1; i++) {
      const [k, locatedTrack] = this.crossesStartFinishLine(samples[i], samples[i + 1]);
      if (k != false) {
        startTime = new Date(samples[i].timestamp);
        track = locatedTrack;
        // TODO use middle of two samples as first approx
        // TODO fancy calc using current speed (samples[i].speed) and distance from intersection point to point at i
        break;
      }
    }
    for (let i = samples.length - 1; i > 1; i--) {
      const [k, _] = this.crossesStartFinishLine(samples[i], samples[i - 1]);
      if (k != false) {
        endTime = new Date(samples[i].timestamp);
        // TODO use middle of two samples as first approx
        // TODO fancy calc using current speed (samples[i].speed) and distance from intersection point to point at i
        break;
      }
    }
    // TODO add sector times
    j.laptime = endTime - startTime;
    j.track = track;
    console.log(
      `%cexporting lap on %c${j.track} %cwith time ${j.laptime} %c(from ${startTime} to ${endTime})`,
      `color: green;`,
      `color: red;`,
      `color: green;`,
      `color: gray;`
    );
    fs.writeFileSync(path, JSON.stringify(j)); // TODO check if this appends or rewrites file
  }

  crossesStartFinishLine(from, to) {
    // x = lon
    // y = lat

    for(const k in this.trackDefs) {
      if(this.intersect(
        from.lon,
        from.lat,
        to.lon,
        to.lat,
        this.trackDefs[k].start.lon,
        this.trackDefs[k].start.lat,
        this.trackDefs[k].end.lon,
        this.trackDefs[k].end.lat,
      )) return [true, k]
    }
    return [false, ""]
  }

  // line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
  // Determine the intersection point of two line segments
  // Return FALSE if the lines don't intersect
  intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
      return false;
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // Lines are parallel
    if (denominator === 0) {
      return false;
    }

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false;
    }

    // Return a object with the x and y coordinates of the intersection
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);

    return { x, y };
  }

  #populateTrackDefs() {
    const tracks = fs.readdirSync('res/tracks');
    for(const element of tracks) {
      if(fs.lstatSync('res/tracks/' + element).isDirectory() ) {
        const content = fs.readFileSync('res/tracks/' + element + "/def.json", { encoding: 'utf-8' });
        const j = JSON.parse(content);
        this.trackDefs[j.name] = j.startFinishLine;
        console.log(`%cparsed track ${j.name}`, `color: gray;`);
      }
    }
  }
};
