module.exports = class ComparisonChart {
  constructor(elementName, pointerCallback, scrollCallback, zoomCallback) {
    this.canvasName = elementName
    this.canvas = document.getElementById(this.canvasName)
    this.ctx = this.canvas.getContext("2d")
    this.BB = this.canvas.getBoundingClientRect()
    this.offsetX = this.BB.left
    this.offsetY = this.BB.top
    this.pointerCallback = pointerCallback
    this.scrollCallback = scrollCallback
    this.zoomCallback = zoomCallback

    // drag related variables
    this.flagDraggingXScroll = false
    this.flagDraggingYScroll = false
    this.startX
    this.startY
    this.cursorX = -1
    this.cursorY = -1

    this.currentX = 0, this.currentY = 0, this.currentZoom = 1

    this.xScroll = 0
    this.xZoom = 0.1

    this.yScroll = 0
    this.yZoom = 1

    this.xPointer = 0
    this.elements = new Map()
    this.colors = new Map()

    this.offsets = new Map()
    this.flagDraggingOffsets = new Map()

    // listen for mouse events
    this.canvas.addEventListener("mousedown", this.mouseDown)
    this.canvas.addEventListener("mouseup", this.mouseUp)
    this.canvas.addEventListener("mousemove", this.mouseMove)
    this.canvas.addEventListener("wheel", this.mouseWheel)
    this.canvas.addEventListener("auxclick", this.mouseWheel)

    this.YDIV = 25
    this.XDIV = 75
    this.xLineHeight = 15
    this.xAxisHeight = this.xLineHeight * (this.elements.size)
    this.yAxisWidth = 40

    window.addEventListener('resize', this.resizeCanvas, false)
    this.resizeCanvas()
    this.draw()
  }

  addElement(index, data, color) {
    this.elements.set(index, data)
    this.colors.set(index, color)
    this.offsets.set(index, 0)
    this.flagDraggingOffsets.set(index, false)
    this.xAxisHeight = this.xLineHeight * (this.elements.size)
  }

  removeElement(index) {
    this.elements.delete(index)
    this.colors.delete(index)
    this.offsets.delete(index)
    this.flagDraggingOffsets.delete(index)
    this.xAxisHeight = this.xLineHeight * (this.elements.size)
  }


  resetTransform() {
    this.currentX = 0
    this.currentY = 0
    this.currentZoom = 1
    this.draw()
  }

  // clear the canvas
  clear() {
    this.ctx.save()
    this.ctx.resetTransform()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.restore()
  }

  drawXAxis() {
    this.ctx.save()
    this.ctx.font = "15px sans-serif";
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = "center";

    let k = 0
    this.elements.forEach((val, idx) => {
      let offsetTs = new Date(val.samples[0].timestamp).getTime()
      for (
        let i = offsetTs; 
        i < new Date(val.samples[val.samples.length - 1].timestamp).getTime(); 
        i += 100 / this.xZoom) {
          let x = this.yAxisWidth + (i - offsetTs) * this.xZoom - this.xScroll - this.offsets.get(idx)
          if(x < 0 || x > this.canvas.width) {
            continue
          }
          this.ctx.fillStyle = this.colors.get(idx)
          this.ctx.fillText(
            this.getFormattedDate(i),
            x,
            this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * k + 2
          )
      }
      k++
    })
    this.ctx.restore()
  }

  getFormattedDate(ts) {
    var d = new Date(ts)
    return d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0') + ":" + String(d.getSeconds()).padStart(2, '0');
  }

  lerp(v0, v1, t) {
    return v0 + t * (v1 - v0);
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
    this.ctx.beginPath();
    this.ctx.lineWidth = 1
    this.ctx.strokeStyle = 'lightgray'
    //for (let i = this.canvas.height; i > -this.YDIV; i -= this.YDIV) {
    //  this.ctx.moveTo(this.yAxisWidth, i - this.xAxisHeight);
    //  this.ctx.lineTo(this.canvas.width, i - this.xAxisHeight);
    //}
    for (let i = 0; i < this.canvas.height; i += this.YDIV) {
      this.ctx.fillText(
        i,
        this.yAxisWidth / 2,
        this.canvas.height - this.xAxisHeight + this.yScroll - (i * this.yZoom)
      );
    }
    this.ctx.stroke();
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = 'alphabetic'
  }

  drawDataPath() {
    this.elements.forEach((val, idx) => {
      this.ctx.beginPath();
      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = this.colors.get(idx)
      this.ctx.lineCap = 'round'

      var timeOffset = new Date(val.samples[0].timestamp).getTime()
      for (let i = 0; i < val.samples.length; i++) {
        let x = 
          this.yAxisWidth - this.xScroll - this.offsets.get(idx) + 
          (new Date(val.samples[i].timestamp).getTime() - timeOffset) * this.xZoom
        if(x < 0) {
          continue
        } else if (x > this.canvas.width) {
          break
        }
        this.ctx.lineTo(
          x,
          this.canvas.height - this.xAxisHeight + this.yScroll - val.samples[i].speed * this.yZoom
        )
      }
      this.ctx.stroke();
    })
    
  }

  drawHUD() {
    if (this.cursorX > 0) {
      if (this.cursorX < this.yAxisWidth) return

      // draw crosshair
      this.ctx.beginPath();
      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = 'lightgray'
      this.ctx.lineCap = 'butt'
      // vertical
      //(this.xPointer + this.yAxisWidth - this.xScroll) / (1/this.xZoom) * 100 = i
      const cursorFromIndex = this.xPointer / (0.01 / this.xZoom) + this.yAxisWidth - this.xScroll
      this.ctx.moveTo(this.cursorX, 0)
      this.ctx.lineTo(this.cursorX, this.canvas.height)

      this.ctx.moveTo(cursorFromIndex, 0)
      this.ctx.lineTo(cursorFromIndex, this.canvas.height)

      this.ctx.save()
      this.ctx.font = "15px sans-serif";
      this.ctx.textBaseline = 'middle'
      this.ctx.textAlign = "center";
      for(let ds = 0; ds < this.datasets.length; ds++) {
        try {
          const idx = (this.cursorX + this.offsets[ds] + this.xScroll - this.yAxisWidth) * this.xZoom
          const l = this.lerp(this.datasets[ds][parseInt(idx)].ts, this.datasets[ds][parseInt(idx) + 1].ts, idx % 1)
          
          this.ctx.fillStyle = this.colors[ds]
          this.ctx.fillText(
            this.getFormattedDate(l),
            this.cursorX,
            this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * ds + 2
          )
        } catch (error) {
          
        }
      }
      this.ctx.restore()

      // horizontal
      /*
      const indexVal = this.xPointer
      var valueAtCursor = this.canvas.height - this.xAxisHeight - this.datasets[indexVal].value
      this.ctx.moveTo(
        0,
        valueAtCursor
      );
      this.ctx.lineTo(
        this.canvas.width,
        valueAtCursor
      );
      */
      this.ctx.stroke()
      

      // draw popup on y axis
      /*this.ctx.clearRect(
        0,
        this.canvas.height - this.dataset[parseInt((this.cursorX + this.xScroll - this.yAxisWidth) / this.xScaleUp)].value - this.xAxisHeight - 10,
        this.yAxisWidth,
        20
      );
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(
        this.dataset[parseInt((this.cursorX + this.xScroll - this.yAxisWidth) / this.xScaleUp)].value.toFixed(1),
        2,
        this.canvas.height - this.dataset[parseInt((this.cursorX + this.xScroll - this.yAxisWidth) / this.xScaleUp)].value - this.xAxisHeight,
      );
      this.ctx.textBaseline = 'alphabetic'*/
    }
  }

  draw() {
    this.clear();
    this.drawDataPath();
    this.drawYAxis();
    this.drawXAxis();
    //this.drawHUD();
  }

  consumeMouseEvent(e) {
    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();
  }

  mouseDown = e => {
    this.consumeMouseEvent(e)

    var mx = parseInt(e.clientX - this.offsetX)
    var my = parseInt(e.clientY - this.offsetY)

    this.startX = mx
    this.startY = my

    if (my >= (this.canvas.height - this.xAxisHeight)) {
      const s = parseInt((this.canvas.height - my) / (this.xAxisHeight / this.elements.size))
      this.flagDraggingOffsets.set(Array.from(this.flagDraggingOffsets.keys())[s], true)
    } else if(mx < this.yAxisWidth) {
      this.flagDraggingYScroll = true;
    } else {
      this.flagDraggingXScroll = true;
    }
  }

  mouseUp = e => {
    this.consumeMouseEvent(e);
    this.flagDraggingXScroll = false;
    this.flagDraggingYScroll = false;

    [...this.flagDraggingOffsets.keys()].forEach((key) => {
      this.flagDraggingOffsets.set(key, false);
    });
  }

  mouseMove = e => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    var mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    var my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.flagDraggingXScroll || this.flagDraggingYScroll || [...this.flagDraggingOffsets.values()].some((x) => x === true)) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      var dx = mx - this.startX;
      var dy = my - this.startY;

      if ([...this.flagDraggingOffsets.values()].some((x) => x === true)) {
        let offsetKey = [...this.flagDraggingOffsets.keys()].find((x) => this.flagDraggingOffsets.get(x) == true)
        this.offsets.set(offsetKey, this.offsets.get(offsetKey) - dx)
      } else if(this.flagDraggingYScroll) {
        this.yScroll = Math.max(this.yScroll + dy, 0);
      } else if (this.flagDraggingXScroll) {
        if (this.xScroll - dx > 0) {
          this.xScroll = Math.max(this.xScroll - dx, 0);
          this.scrollCallback(this.xScroll);
        }

        this.currentX = Math.max(this.currentX - dx, 0);
        this.currentY -= dy;
      }

      // reset the starting mouse position for the next mousemove
      this.startX = mx;
      this.startY = my;
    }

    this.xPointer = parseInt((this.cursorX - this.yAxisWidth + this.xScroll) * (1 / this.xZoom) / 100);
    this.pointerCallback(this.xPointer);

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
    var scroll = e.deltaY / 1024;
    this.currentZoom += scroll;

    var mx = parseInt(e.clientX - this.offsetX);
    var my = parseInt(e.clientY - this.offsetY);
    
    if(mx < this.yAxisWidth) {
      this.yZoom += scroll
    } else if (my >= (this.canvas.height - this.xAxisHeight)) {
      this.xZoom = Math.max(this.xZoom + scroll, 0)
      console.log(this.xZoom)
    } 
    /*
    this.xScale += dx / 1000;
    this.xScale = Math.min(this.xScale, 1)
    this.xScale = Math.max(this.xScale, 0.001)

    this.xZoom += dx / 1000;
    this.xZoom = Math.min(this.xZoom, 1)
    this.xZoom = Math.max(this.xZoom, 0.001)
    this.zoomCallback(this.xZoom)
    */
    this.draw();
  }

  resizeCanvas = e => {
    var rect = this.canvas.parentNode.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    this.canvas.width = width;
    this.canvas.height = height;

    this.BB = this.canvas.getBoundingClientRect()
    this.offsetX = this.BB.left
    this.offsetY = this.BB.top

    this.draw();
  }

  setPointer(index) {
    this.xPointer = index
    this.draw()
  }

  setScroll(index) {
    this.xScroll = index
    this.draw()
  }

  setZoom(zoom) {
    this.xZoom = zoom
    this.draw()
  }
}