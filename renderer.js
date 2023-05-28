const fs = require('graceful-fs');

const GpsChart = require('./lib/components/GpsChart');
const PlotView = require('./lib/components/PlotChart');
const ComparisonChart = require('./lib/components/ComparisonChart');
const LapList = require('./lib/components/LapList');
const FileProcessor = require('./lib/FileProcessor');
const FileDownloader = require('./lib/FileDownloader');

const laps = [];
const lapFiles = fs.readdirSync('dl/laps')
  .filter((element) => element.endsWith('.json'));
lapFiles.forEach((element) => {
  const content = fs.readFileSync(`dl/laps/${element}`, { encoding: 'utf-8' });
  const data = JSON.parse(content);
  laps.push(data);
  console.log(data.laptime);
});

const gpsChart = new GpsChart('gpsChart');

const lapList = new LapList(
  'lapList',
  laps,
  (index, color, trackname) => {
    gpsChart.setTrack(trackname);
    gpsChart.addElement(index, laps[index], color);
    gpsChart.draw();
    plot.addElement(index, laps[index], color);
    plot.draw();
  },
  (index) => {
    gpsChart.removeElement(index);
    gpsChart.draw();
    plot.removeElement(index);
    plot.draw();
  },
);

const plot = new ComparisonChart(
  'plot',
  (idx, p) => {
    gpsChart.setPointer(idx, p);
  },
  (i) => {
  },
  (i) => {
  },
);

document.querySelector('#buttonload').addEventListener('click', () => {
  const fd = new FileDownloader();
  fd.downloadFiles().then(() => {
    const fp = new FileProcessor();
    fp.parseFiles();
  }, (e) => { alert(e); });
});
