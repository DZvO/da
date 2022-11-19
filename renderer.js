/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */


class PlotView {

  constructor(elementName, dataset, cursorCallback) {
    this.canvasName = elementName
    this.canvas = document.getElementById(this.canvasName);
    this.ctx = this.canvas.getContext("2d");
    this.BB = this.canvas.getBoundingClientRect();
    this.offsetX = this.BB.left;
    this.offsetY = this.BB.top;
    this.cursorCallback = cursorCallback

    // drag related variables
    this.dragok = false;
    this.startX;
    this.startY;
    this.cursorX = -1;
    this.cursorY = -1;

    this.currentX = 0, this.currentY = 0, this.currentZoom = 1;

    this.xDivsMin = 0;
    this.xDivsMax = 800;
    this.dataset = dataset

    // listen for mouse events
    this.canvas.addEventListener("mousedown", this.mouseDown)
    this.canvas.addEventListener("mouseup", this.mouseUp)
    this.canvas.addEventListener("mousemove", this.mouseMove)
    this.canvas.addEventListener("mousewheel", this.mouseWheel)
    this.canvas.addEventListener("auxclick", this.mouseWheel)

    this.YDIV = 50;
    this.XDIV = 50;
    this.xAxisHeight = 20
    this.yAxisWidth = 40

    window.addEventListener('resize', this.resizeCanvas, false);
    this.resizeCanvas();
    this.draw();
  }

  resetTransform() {
    this.currentX = 0;
    this.currentY = 0;
    this.currentZoom = 1;
    this.draw();
  }

  // clear the canvas
  clear() {
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  drawXAxis() {
    this.ctx.beginPath();
    this.ctx.lineCap = 'butt';
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'black'
    this.ctx.fillStyle = 'black'
    // draw x axis
    this.ctx.fillRect(0, this.canvas.height - this.xAxisHeight, this.canvas.width, this.canvas.height);
    this.ctx.stroke();

    this.ctx.font = "15px sans-serif";
    this.ctx.fillStyle = 'grey'
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = "center";
    var range = this.xDivsMax - this.xDivsMin;
    this.ctx.beginPath();
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'gray'
    for (let i = this.yAxisWidth + this.XDIV; i < this.canvas.width + this.XDIV; i += this.XDIV) {
      this.ctx.moveTo(i - (this.xDivsMin % this.XDIV), this.canvas.height - this.xAxisHeight);
      this.ctx.lineTo(i - (this.xDivsMin % this.XDIV), 0 - this.xAxisHeight);

      //ctx.save();
      //ctx.translate(, );
      //var angle = 0;
      //ctx.rotate(angle * (Math.PI / 180));
      this.ctx.fillText(
        i - (this.xDivsMin % this.XDIV) + this.xDivsMin - this.yAxisWidth,
        i - (this.xDivsMin % this.XDIV),
        this.canvas.height - this.xAxisHeight / 2
      );
      //ctx.restore();
    }
    this.ctx.stroke();
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = 'alphabetic'
  }


  drawYAxis() {
    this.ctx.beginPath();
    this.ctx.lineCap = 'butt';
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'black'
    this.ctx.fillStyle = 'black'
    // draw Y axis
    this.ctx.fillRect(0, 0, this.yAxisWidth, this.canvas.height);
    this.ctx.stroke();

    this.ctx.font = "15px sans-serif";
    this.ctx.fillStyle = 'grey'
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = "center";
    var range = this.xDivsMax - this.xDivsMin;
    this.ctx.beginPath();
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'gray'
    for (let i = this.canvas.height; i > -this.YDIV; i -= this.YDIV) {
      this.ctx.fillText(
        this.canvas.height - i,
        this.yAxisWidth / 2,
        i - this.xAxisHeight
      );
      this.ctx.moveTo(this.yAxisWidth, i - this.xAxisHeight);
      this.ctx.lineTo(this.canvas.width, i - this.xAxisHeight);
    }
    this.ctx.stroke();
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = 'alphabetic'
  }

  drawDataPath() {
    this.ctx.beginPath();
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'orange'
    this.ctx.lineCap = 'round'
    this.ctx.moveTo(this.yAxisWidth + this.dataset[this.xDivsMin].x - this.xDivsMin, this.canvas.height - this.dataset[this.xDivsMin].y - this.xAxisHeight);
    for (let i = this.xDivsMin; i < Math.min(this.canvas.width + this.xDivsMin, this.dataset.length); i++) {
      this.ctx.lineTo(this.yAxisWidth + this.dataset[i].x - this.xDivsMin, this.canvas.height - this.dataset[i].y - this.xAxisHeight);
    }
    this.ctx.stroke();
  }

  drawHUD() {
    if (this.cursorX > 0) {
      this.ctx.save();
      this.ctx.resetTransform();

      this.ctx.font = "12px serif";
      this.ctx.fillStyle = 'black'
      var w = this.ctx.measureText("val = " + this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y).width

      this.ctx.clearRect(this.canvas.width - w, 0, this.canvas.width, 12 * 3);

      if (this.cursorX < this.yAxisWidth) return

      // value at x 
      this.ctx.fillText(
        "val = " + this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y,
        this.canvas.width - w,
        12,
        w
      );
      // current x pointer
      this.ctx.fillText(
        "x = " + parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth),
        this.canvas.width - w,
        12 * 2,
        w
      );
      this.cursorCallback.setCursor(parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth))
      this.cursorCallback.draw();
      // current y pointer
      this.ctx.fillText(
        "y = " + parseInt(this.cursorY - this.xAxisHeight),
        this.canvas.width - w,
        12 * 3,
        w
      );
      this.ctx.restore();

      this.ctx.beginPath();
      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = 'grey'
      this.ctx.lineCap = 'butt'
      this.ctx.moveTo(this.cursorX, 0);
      this.ctx.lineTo(this.cursorX, this.canvas.height);
      this.ctx.moveTo(0, this.canvas.height - this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y - this.xAxisHeight);
      this.ctx.lineTo(this.canvas.width, this.canvas.height - this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y - this.xAxisHeight);
      this.ctx.stroke();

      this.ctx.clearRect(
        0,
        this.canvas.height - this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y - this.xAxisHeight - 10,
        this.yAxisWidth,
        20
      );
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(
        this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y.toFixed(1),
        2,
        this.canvas.height - this.dataset[parseInt(this.cursorX + this.xDivsMin - this.yAxisWidth)].y - this.xAxisHeight,
      );
      this.ctx.textBaseline = 'alphabetic'
    }
  }

  draw() {
    //ctx.resetTransform();
    //ctx.translate(currentX, 0 /*currentY*/);
    //ctx.scale(currentZoom,currentZoom);
    this.clear();
    this.drawDataPath();
    this.drawXAxis();
    this.drawYAxis();
    this.drawHUD();
  }

  consumeMouseEvent(e) {
    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();
  }

  mouseDown = e => {
    this.consumeMouseEvent(e);

    var mx = parseInt(e.clientX - this.offsetX);
    var my = parseInt(e.clientY - this.offsetY);

    this.startX = mx;
    this.startY = my;

    this.dragok = true;
  }

  mouseUp = e => {
    this.consumeMouseEvent(e);
    this.dragok = false;
  }

  mouseMove = e => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    var mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    var my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.dragok) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      var dx = mx - this.startX;
      var dy = my - this.startY;

      if (this.xDivsMin - dx > 0) {
        this.xDivsMin -= dx;
        this.xDivsMax -= dx;
      }

      this.currentX += dx;
      this.currentY += dy;

      // reset the starting mouse position for the next mousemove
      this.startX = mx;
      this.startY = my;
    }
    // redraw the scene with the new rect positions
    this.draw();

    //setup cursor
    if (false) {
      document.body.style.cursor = "n-resize"
    } else if (false) {
      document.body.style.cursor = "e-resize"
    } else {
      document.body.style.cursor = "auto"
    }
  }

  mouseWheel = e => {
    var scroll = e.wheelDelta / 1024;
    this.currentZoom += scroll;
    this.draw();
  }

  resizeCanvas = e => {
    if (e != null) this.consumeMouseEvent(e)
    var rect = this.canvas.parentNode.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.draw();
  }
}

class GpsChart {
  constructor(elementName, coords) {
    this.elementName = elementName
    this.coords = coords
    this.minX = 0, this.minY = 0, this.maxX = 0, this.maxY = 0;
    this.coords.forEach((p, i) => {
      if (i === 0) { // if first point 
        this.minX = this.maxX = this.coords[i].lon;
        this.minY = this.maxY = this.coords[i].lat;
      } else {
        this.minX = Math.min(this.coords[i].lon, this.minX);
        this.minY = Math.min(this.coords[i].lat, this.minY);
        this.maxX = Math.max(this.coords[i].lon, this.maxX);
        this.maxY = Math.max(this.coords[i].lat, this.maxY);
      }
    });


    this.canvas = document.getElementById(this.elementName);
    this.ctx = this.canvas.getContext("2d");
    this.BB = this.canvas.getBoundingClientRect();
    this.offsetX = this.BB.left;
    this.offsetY = this.BB.top;

    this.dragok = false;
    this.startX;
    this.startY;
    this.cursorX = -1;
    this.cursorY = -1;

    this.currentX = 0, this.currentY = 0, this.currentZoom = 1;
    this.pointer = 0;

    this.canvas.addEventListener("mousedown", this.mouseDown)
    this.canvas.addEventListener("mouseup", this.mouseUp)
    this.canvas.addEventListener("mousemove", this.mouseMove)
    this.canvas.addEventListener("mousewheel", this.mouseWheel)
    //this.canvas.addEventListener("auxclick", this.mouseWheel)
    window.addEventListener('resize', this.resizeCanvas, false);
    this.resizeCanvas();
  }

  clear() {
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  draw() {
    this.clear();
    this.ctx.resetTransform();

    this.ctx.translate(this.currentX, this.currentY);
    this.ctx.scale(this.currentZoom, this.currentZoom);
    //this.ctx.rotate(90 * Math.PI / 180)

    const mapWidth = this.maxX - this.minX;
    const mapHeight = this.maxY - this.minY;
    const mapCenterX = (this.maxX + this.minX) / 2;
    const mapCenterY = (this.maxY + this.minY) / 2;

    const scale = Math.min(this.canvas.width / mapWidth, this.canvas.height / mapHeight) * 0.98;
    this.ctx.beginPath();
    this.ctx.lineWidth = 10
    this.ctx.strokeStyle = 'orange'
    this.ctx.lineCap = 'round'
    for (let i = 0; i < this.coords.length; i++) {
      this.ctx.lineTo(
        (this.coords[i].lon - mapCenterX) * scale + this.canvas.width / 2,
        this.canvas.height - ((this.coords[i].lat - mapCenterY) * scale + this.canvas.height / 2)
      );
    }
    this.ctx.stroke();

    const centerX = (this.coords[this.pointer].lon - mapCenterX) * scale + this.canvas.width / 2;
    const centerY = this.canvas.height - ((this.coords[this.pointer].lat - mapCenterY) * scale + this.canvas.height / 2);
    const radius = 2;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = 'green';
    this.ctx.fill();
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#003300';
    this.ctx.stroke();
  }


  consumeMouseEvent(e) {
    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();
  }

  mouseDown = e => {
    this.consumeMouseEvent(e);

    var mx = parseInt(e.clientX - this.offsetX);
    var my = parseInt(e.clientY - this.offsetY);

    this.startX = mx;
    this.startY = my;

    this.dragok = true;
  }

  mouseUp = e => {
    this.consumeMouseEvent(e);
    this.dragok = false;
  }

  mouseMove = e => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    var mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    var my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.dragok) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      var dx = mx - this.startX;
      var dy = my - this.startY;

      this.currentX += dx;
      this.currentY += dy;

      // reset the starting mouse position for the next mousemove
      this.startX = mx;
      this.startY = my;
    }
    // redraw the scene with the new rect positions
    this.draw();
  }

  mouseWheel = e => {
    var scroll = e.wheelDelta / 1024;
    this.currentZoom = Math.max(0, this.currentZoom + scroll);
    this.draw();
  }

  resizeCanvas = e => {
    if (e != null) this.consumeMouseEvent(e)
    var rect = this.canvas.parentNode.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.draw();
  }

  setCursor(ts) {
    this.pointer = ts
  }
}

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
  return m / 3.6e+6
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
  coords[i].ts += i * 1000;
}

const basets = coords[0].ts
const dataset = []
for (let i = 1; i < coords.length; i++) {
  dataset.push({ x: (coords[i].ts - basets) / 1000, y: getDistanceFromLatLonInKm(coords[i - 1], coords[i]) / msToH(coords[i].ts - coords[i - 1].ts) });
}

const gpsChart = new GpsChart("gpsChart", coords)
const plot1 = new PlotView("plot1", dataset, gpsChart)
