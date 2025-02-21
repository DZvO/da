const fs = require('graceful-fs');

module.exports = class GpsChart {
  constructor(elementName) {
    this.elementName = elementName;
    this.elements = new Map();
    this.colors = new Map();
    this.finishline = null;
    this.minX = 0, this.minY = 0, this.maxX = 0, this.maxY = 0;
    // this.setupMinXY()

    this.canvas = document.getElementById(this.elementName);
    this.ctx = this.canvas.getContext('2d');
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
    this.pointers = new Map();

    this.image = null;
    this.trackdef = null;

    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mouseup', this.mouseUp);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mousewheel', this.mouseWheel);
    // this.canvas.addEventListener("auxclick", this.mouseWheel)
    window.addEventListener('resize', this.resizeCanvas, false);
    this.resizeCanvas();
  }

  setupMinXY() {
    this.elements.forEach((value) => {
      value.samples.forEach((p, i) => {
        if (i === 0) { // if first point
          this.minX = this.maxX = p.lon;
          this.minY = this.maxY = p.lat;
        } else {
          // x = lon
          // y = lat
          this.minX = Math.min(p.lon, this.minX);
          this.minY = Math.min(p.lat, this.minY);
          this.maxX = Math.max(p.lon, this.maxX);
          this.maxY = Math.max(p.lat, this.maxY);
        }
      });
    });
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

    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.currentZoom, this.currentZoom);
    this.ctx.translate(-this.canvas.width / 2 + this.currentX, -this.canvas.height / 2 + this.currentY);

    // this.ctx.rotate(90 * Math.PI / 180)

    const mapWidth = this.maxX - this.minX;
    const mapHeight = this.maxY - this.minY;
    const mapCenterX = (this.maxX + this.minX) / 2;
    const mapCenterY = (this.maxY + this.minY) / 2;

    const scale = Math.min(this.canvas.width / mapWidth, this.canvas.height / mapHeight) * 0.98;

    if (this.image != null) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.5;

      const bgX = (this.trackdef.upperLeftLon - mapCenterX) * scale + this.canvas.width / 2;
      const bgY = this.canvas.height - ((this.trackdef.upperLeftLat - mapCenterY) * scale + this.canvas.height / 2);
      const bgW = Math.abs(bgX - ((this.trackdef.lowerRightLon - mapCenterX) * scale + this.canvas.width / 2));
      const bgH = Math.abs(bgY - (this.canvas.height - ((this.trackdef.lowerRightLat - mapCenterY) * scale + this.canvas.height / 2)));

      this.ctx.drawImage(
        this.image,
        bgX,
        bgY,
        bgW,
        bgH,
      );
      this.ctx.restore();
    }

    // TODO this is pretty expensive as we have many points, could simplify list of points via 
    // Ramer-Douglas-Peucker algorithm
    this.elements.forEach((val, idx) => {
      this.ctx.beginPath();
      this.ctx.lineWidth = 0.75;
      this.ctx.strokeStyle = this.colors.get(idx);
      this.ctx.lineCap = 'round';
      for (let i = 0; i < val.samples.length; i++) {
        this.ctx.lineTo(
          (val.samples[i].lon - mapCenterX) * scale + this.canvas.width / 2,
          this.canvas.height - ((val.samples[i].lat - mapCenterY) * scale + this.canvas.height / 2),
        );
      }
      this.ctx.stroke();
    });

    if (this.finishline != null) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'black';
      this.ctx.lineCap = 'round';
      this.ctx.moveTo(
        (this.finishline.start.lon - mapCenterX) * scale + this.canvas.width / 2,
        this.canvas.height - ((this.finishline.start.lat - mapCenterY) * scale + this.canvas.height / 2),
      );
      this.ctx.lineTo(
        (this.finishline.end.lon - mapCenterX) * scale + this.canvas.width / 2,
        this.canvas.height - ((this.finishline.end.lat - mapCenterY) * scale + this.canvas.height / 2),
      );
      this.ctx.stroke();
    }

    this.pointers.forEach((val, idx) => {
      const centerX = (this.elements.get(idx).samples[val].lon - mapCenterX) * scale + this.canvas.width / 2;
      const centerY = this.canvas.height - ((this.elements.get(idx).samples[val].lat - mapCenterY) * scale + this.canvas.height / 2);
      const radius = 4;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      this.ctx.fillStyle = this.colors.get(idx);
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  consumeMouseEvent(e) {
    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();
  }

  mouseDown = (e) => {
    this.consumeMouseEvent(e);

    const mx = parseInt(e.clientX - this.offsetX);
    const my = parseInt(e.clientY - this.offsetY);

    this.startX = mx;
    this.startY = my;

    this.dragok = true;
  };

  mouseUp = (e) => {
    this.consumeMouseEvent(e);
    this.dragok = false;
  };

  mouseMove = (e) => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    const mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    const my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.dragok) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      const dx = mx - this.startX;
      const dy = my - this.startY;

      this.currentX += dx / this.currentZoom;
      this.currentY += dy / this.currentZoom;

      // reset the starting mouse position for the next mousemove
      this.startX = mx;
      this.startY = my;
    }
    // redraw the scene with the new rect positions
    this.draw();
  };

  mouseWheel = (e) => {
    const scroll = e.wheelDelta / 1024;
    this.currentZoom = Math.max(0, this.currentZoom + scroll);
    this.draw();
  };

  resizeCanvas = (e) => {
    const rect = this.canvas.parentNode.getBoundingClientRect();
    const { width } = rect;
    const { height } = rect;

    this.canvas.width = width;
    this.canvas.height = height;

    this.BB = this.canvas.getBoundingClientRect();
    this.offsetX = this.BB.left;
    this.offsetY = this.BB.top;

    this.draw();
  };

  setPointer(idx, p) {
    this.pointers.set(idx, p);
    this.draw();
  }

  addElement(index, lapData, color) {
    this.elements.set(index, lapData);
    this.colors.set(index, color);
    this.setupMinXY();
  }

  removeElement(index) {
    this.elements.delete(index);
    this.pointers.delete(index);
    this.colors.delete(index);
    this.setupMinXY();
  }

  setTrack(trackname) {
    this.trackname = trackname;
    this.#loadImage(`res/tracks/${trackname}/aerial.png`).then((r) => {
      this.image = r;
      this.draw();
    });

    const content = fs.readFileSync(`res/tracks/${trackname}/def.json`, { encoding: 'utf-8' });
    const data = JSON.parse(content);

    this.finishline = data.startFinishLine;
    this.trackdef = data.aerial;
  }

  #loadImage(url) {
    return new Promise((r) => { const i = new Image(); i.onload = (() => r(i)); i.src = url; });
  }
};
