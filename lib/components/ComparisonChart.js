module.exports = class ComparisonChart {
  constructor(elementName, pointerCallback, scrollCallback, zoomCallback) {
    this.canvasName = elementName;
    this.canvas = document.getElementById(this.canvasName);
    this.ctx = this.canvas.getContext('2d');
    this.BB = this.canvas.getBoundingClientRect();
    this.offsetX = this.BB.left;
    this.offsetY = this.BB.top;
    this.pointerCallback = pointerCallback;
    this.scrollCallback = scrollCallback;
    this.zoomCallback = zoomCallback;

    // drag related variables
    this.flagDraggingXScroll = false;
    this.flagDraggingYScroll = false;
    this.startX;
    this.startY;
    this.cursorX = -1;
    this.cursorY = -1;

    this.currentX = 0, this.currentY = 0, this.currentZoom = 1;

    this.xScroll = 0;
    this.xZoom = 0.01;

    this.yScroll = 0;
    this.yZoom = 2;

    this.xPointer = 0;
    this.elements = new Map();
    this.colors = new Map();

    this.offsets = new Map();
    this.flagDraggingOffsets = new Map();

    // listen for mouse events
    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mouseup', this.mouseUp);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('wheel', this.mouseWheel);
    this.canvas.addEventListener('auxclick', this.mouseWheel);
    window.addEventListener('keydown', this.keydown);

    this.YDIV = 20;
    this.XDIV = 50;
    this.xLineHeight = 15;
    this.xAxisHeight = this.xLineHeight * (this.elements.size);
    this.yAxisWidth = 40;

    window.addEventListener('resize', this.resizeCanvas, false);
    this.resizeCanvas();
    this.draw();
  }

  keydown = (event) => {
    switch (event.key) {
      case 'r':
        [...this.offsets.keys()].forEach((key) => {
          this.offsets.set(key, 0);
        });
        break;
      default:
        return; // Quit when this doesn't handle the key event.
    }
    this.draw();
  };

  addElement(index, data, color) {
    data.samplesByTimestamp = new Map();
    data.samples.forEach((s) => data.samplesByTimestamp.set(new Date(s.timestamp).getTime(), s));
    this.elements.set(index, data);
    this.colors.set(index, color);
    this.offsets.set(index, 0);
    this.flagDraggingOffsets.set(index, false);
    this.xAxisHeight = this.xLineHeight * (this.elements.size);
  }

  removeElement(index) {
    this.elements.delete(index);
    this.colors.delete(index);
    this.offsets.delete(index);
    this.flagDraggingOffsets.delete(index);
    this.xAxisHeight = this.xLineHeight * (this.elements.size);
  }

  resetTransform() {
    this.currentX = 0;
    this.currentY = 0;
    this.currentZoom = 1;
    this.draw();
  }

  clear() {
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  drawXAxis() {
    this.ctx.save();
    this.ctx.font = '15px sans-serif';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';

    let k = 0;
    this.elements.forEach((val, idx) => {
      const offsetTs = new Date(val.samples[0].timestamp).getTime();
      for (
        let i = offsetTs;
        i < new Date(val.samples[val.samples.length - 1].timestamp).getTime();
        i += 100 / this.xZoom) {
        const x = this.yAxisWidth + (i - offsetTs) * this.xZoom - this.xScroll - this.offsets.get(idx);
        if (x < 0 || x > this.canvas.width) {
          continue;
        }
        this.ctx.fillStyle = this.colors.get(idx);
        this.ctx.fillText(
          this.getFormattedDate(i - offsetTs),
          x,
          this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * k + 2,
        );
      }
      k++;
    });
    this.ctx.restore();
  }

  getFormattedDate(ts) {
    const d = new Date(ts);
    return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  lerp(v0, v1, t) {
    return v0 + t * (v1 - v0);
  }

  drawYAxis() {
    this.ctx.beginPath();
    this.ctx.lineCap = 'butt';
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'black';
    this.ctx.fillStyle = 'black';
    // draw Y axis
    this.ctx.fillRect(0, 0, this.yAxisWidth, this.canvas.height);
    this.ctx.stroke();

    this.ctx.font = '15px sans-serif';
    this.ctx.fillStyle = 'grey';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
    this.ctx.beginPath();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'lightgray';
    // for (let i = this.canvas.height; i > -this.YDIV; i -= this.YDIV) {
    //  this.ctx.moveTo(this.yAxisWidth, i - this.xAxisHeight);
    //  this.ctx.lineTo(this.canvas.width, i - this.xAxisHeight);
    // }
    for (let i = 0; i < this.canvas.height; i += this.YDIV) {
      this.ctx.fillText(
        i,
        this.yAxisWidth / 2,
        this.canvas.height - this.xAxisHeight + this.yScroll - (i * this.yZoom),
      );
    }
    this.ctx.stroke();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  drawDataPath() {
    // TODO this is pretty expensive as we have many points, could simplify list of points via 
    // Ramer-Douglas-Peucker algorithm
    this.elements.forEach((val, idx) => {
      this.ctx.beginPath();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = this.colors.get(idx);
      this.ctx.lineCap = 'round';

      const timeOffset = new Date(val.samples[0].timestamp).getTime();
      for (let i = 0; i < val.samples.length - 1; i++) {
        const x = this.yAxisWidth - this.xScroll - this.offsets.get(idx)
          + (new Date(val.samples[i].timestamp).getTime() - timeOffset) * this.xZoom;
        if (x < 0) {
          continue;
        } else if (x > this.canvas.width) {
          break;
        }
        this.ctx.lineTo(
          x,
          this.canvas.height - this.xAxisHeight + this.yScroll - val.samples[i].speed * this.yZoom,
        );
        /* x =
          this.yAxisWidth - this.xScroll - this.offsets.get(idx) +
          (new Date(val.samples[i + 1].timestamp).getTime() - timeOffset) * this.xZoom
        this.ctx.lineTo(
          x,
          this.canvas.height - this.xAxisHeight + this.yScroll - val.samples[i + 1].speed * this.yZoom
        ) */
      }
      this.ctx.stroke();
    });
  }

  drawHUD() {
    if (this.cursorX > 0) {
      if (this.cursorX < this.yAxisWidth) return;

      // draw crosshair
      this.ctx.beginPath();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'lightgray';
      this.ctx.lineCap = 'butt';
      // vertical
      // (this.xPointer + this.yAxisWidth - this.xScroll) / (1/this.xZoom) * 100 = i
      const cursorFromIndex = this.xPointer / (0.01 / this.xZoom) + this.yAxisWidth - this.xScroll;
      this.ctx.moveTo(this.cursorX, 0);
      this.ctx.lineTo(this.cursorX, this.canvas.height);

      this.ctx.moveTo(cursorFromIndex, 0);
      this.ctx.lineTo(cursorFromIndex, this.canvas.height);

      this.ctx.save();
      this.ctx.font = '15px sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'center';
      let n = 0;
      this.elements.forEach((val, idx) => {
        try {
          const offsetTs = new Date(val.samples[0].timestamp).getTime();
          // let x =
          //  this.yAxisWidth - this.xScroll - this.offsets.get(idx) +
          //  (new Date(val.samples[i].timestamp).getTime() - timeOffset) * this.xZoom
          let p = (this.cursorX - this.yAxisWidth + this.offsets.get(idx) + this.xScroll) * (0.01 / this.xZoom);
          p = Math.min(p, val.samples.length - 1);
          const l = this.lerp(
            new Date(val.samples[parseInt(p)].timestamp).getTime(),
            new Date(val.samples[parseInt(p) + 1].timestamp).getTime(),
            p % 1,
          );
          const text = this.getFormattedDate(l - offsetTs);
          const textWidth = this.ctx.measureText(text).width;

          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.fillRect(
            this.cursorX - textWidth / 2 - 1,
            this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * n + 2 - 15 / 2 - 2,
            textWidth + 2,
            15 + 2,
          );
          this.ctx.fillStyle = '#EEEEEE';
          this.ctx.fillRect(
            this.cursorX - textWidth / 2,
            this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * n + 2 - 15 / 2,
            textWidth,
            15,
          );
          this.ctx.fillStyle = this.colors.get(idx);
          this.ctx.fillText(
            text,
            this.cursorX,
            this.canvas.height - (this.xLineHeight / 2) - this.xLineHeight * n + 2,
          );
          n++;
        } catch (error) { console.log(error); }
      });
      this.ctx.restore();

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
      this.ctx.stroke();

      // draw popup on y axis
      n = 0;
      this.elements.forEach((val, idx) => {
        this.ctx.textBaseline = 'top';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        const p = (this.cursorX + this.offsets.get(idx) + this.xScroll - this.yAxisWidth) * (0.01 / this.xZoom);
        const v = val.samples[parseInt(p)].speed;
        // TODO lerp between values

        this.ctx.fillStyle = 'white';
        this.ctx.clearRect(
          0,
          // this.canvas.height - this.cursorY - 20/2,
          this.canvas.height - this.xAxisHeight - v * this.yZoom - 1,
          this.yAxisWidth,
          18,
        );
        this.ctx.fillStyle = this.colors.get(idx);
        this.ctx.fillText(
          v.toFixed(1),
          this.yAxisWidth / 2,
          // this.canvas.height - this.cursorY - 20/2,
          this.canvas.height - this.xAxisHeight - v * this.yZoom + 1,
        );
        this.ctx.textBaseline = 'alphabetic';
        n++;
      });
    }
  }

  draw() {
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

  mouseDown = (e) => {
    this.consumeMouseEvent(e);

    const mx = parseInt(e.clientX - this.offsetX);
    const my = parseInt(e.clientY - this.offsetY);

    this.startX = mx;
    this.startY = my;

    if (my >= (this.canvas.height - this.xAxisHeight)) {
      const s = parseInt((this.canvas.height - my) / (this.xAxisHeight / this.elements.size));
      this.flagDraggingOffsets.set(Array.from(this.flagDraggingOffsets.keys())[s], true);
    } else if (mx < this.yAxisWidth) {
      this.flagDraggingYScroll = true;
    } else {
      this.flagDraggingXScroll = true;
    }
  };

  mouseUp = (e) => {
    this.consumeMouseEvent(e);
    this.flagDraggingXScroll = false;
    this.flagDraggingYScroll = false;

    [...this.flagDraggingOffsets.keys()].forEach((key) => {
      this.flagDraggingOffsets.set(key, false);
    });
  };

  mouseMove = (e) => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    const mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    const my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.flagDraggingXScroll || this.flagDraggingYScroll || [...this.flagDraggingOffsets.values()].some((x) => x === true)) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      const dx = mx - this.startX;
      const dy = my - this.startY;

      if ([...this.flagDraggingOffsets.values()].some((x) => x === true)) {
        const offsetKey = [...this.flagDraggingOffsets.keys()].find((x) => this.flagDraggingOffsets.get(x) == true);
        this.offsets.set(offsetKey, this.offsets.get(offsetKey) - dx);
      } else if (this.flagDraggingYScroll) {
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

    this.elements.forEach((val, idx) => {
      const p = (this.cursorX - this.yAxisWidth + this.offsets.get(idx) + this.xScroll) * (0.01 / this.xZoom);
      this.pointerCallback(idx, parseInt(Math.min(Math.max(p, 0), val.samples.length - 1)));
    });

    // https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations#scheduled_updates
    // redraw the scene with the new rect positions
    this.draw();

    // setup cursor
    if (false) {
      document.body.style.cursor = 'n-resize';
    } else if (false) {
      document.body.style.cursor = 'e-resize';
    } else {
      document.body.style.cursor = 'auto';
    }
  };

  mouseWheel = (e) => {
    const scroll = e.deltaY / 1024;
    this.currentZoom += scroll;

    const mx = parseInt(e.clientX - this.offsetX);
    const my = parseInt(e.clientY - this.offsetY);

    if (mx < this.yAxisWidth) {
      this.yZoom += scroll;
    } else if (my >= (this.canvas.height - this.xAxisHeight)) {
      this.xZoom = Math.max(this.xZoom + scroll * this.xZoom, 0.0001);
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

  setPointer(index) {
    this.xPointer = index;
    this.draw();
  }

  setScroll(index) {
    this.xScroll = index;
    this.draw();
  }

  setZoom(zoom) {
    this.xZoom = zoom;
    this.draw();
  }
};
