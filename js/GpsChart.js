module.exports = class GpsChart {
    constructor(elementName, coords, finishline) {
      this.elementName = elementName
      this.coords = coords
      this.finishline = finishline
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

      this.image = document.getElementById("trackOsl");

  
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
  
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.scale(this.currentZoom, this.currentZoom);
      this.ctx.translate(-this.canvas.width / 2 + this.currentX, -this.canvas.height / 2 + this.currentY)
  
      //this.ctx.rotate(90 * Math.PI / 180)

      const mapWidth = this.maxX - this.minX;
      const mapHeight = this.maxY - this.minY;
      const mapCenterX = (this.maxX + this.minX) / 2;
      const mapCenterY = (this.maxY + this.minY) / 2;
  
      const scale = Math.min(this.canvas.width / mapWidth, this.canvas.height / mapHeight) * 0.98;

      const bgX = (11.268325 - mapCenterX) * scale + this.canvas.width / 2
      const bgY = this.canvas.height - ((52.031677 - mapCenterY) * scale + this.canvas.height / 2)
      const bgW = Math.abs(bgX - ((11.287551 - mapCenterX) * scale + this.canvas.width / 2))
      const bgH = Math.abs(bgY - (this.canvas.height - ((52.024853 - mapCenterY) * scale + this.canvas.height / 2)))

      this.ctx.save()
      this.ctx.globalAlpha = 0.5
      this.ctx.drawImage(this.image,
        bgX,
        bgY,
        bgW,
        bgH,
      )
      this.ctx.restore()

      this.ctx.beginPath();
      this.ctx.lineWidth = 0.75
      this.ctx.strokeStyle = 'orange'
      this.ctx.lineCap = 'round'
      for (let i = 0; i < this.coords.length; i++) {
        this.ctx.lineTo(
          (this.coords[i].lon - mapCenterX) * scale + this.canvas.width / 2,
          this.canvas.height - ((this.coords[i].lat - mapCenterY) * scale + this.canvas.height / 2)
        );
      }
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.strokeStyle = 'black'
      this.ctx.lineCap = 'round'
      this.ctx.moveTo(
        (this.finishline.start.lon - mapCenterX) * scale + this.canvas.width / 2,
        this.canvas.height - ((this.finishline.start.lat - mapCenterY) * scale + this.canvas.height / 2)
      )
      this.ctx.lineTo(
        (this.finishline.end.lon - mapCenterX) * scale + this.canvas.width / 2,
        this.canvas.height - ((this.finishline.end.lat - mapCenterY) * scale + this.canvas.height / 2)
      );
      this.ctx.stroke();
  
      const centerX = (this.coords[this.pointer].lon - mapCenterX) * scale + this.canvas.width / 2;
      const centerY = this.canvas.height - ((this.coords[this.pointer].lat - mapCenterY) * scale + this.canvas.height / 2);
      const radius = 1;
  
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
  
        this.currentX += dx / this.currentZoom;
        this.currentY += dy / this.currentZoom;
  
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
  
    setPointer(index) {
      this.pointer = index
      this.draw();
    }
  }