module.exports = class PlotView {
  constructor(elementName, dataset, pointerCallback, scrollCallback, zoomCallback) {
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
    this.flagDraggingXZoom = false;
    this.startX;
    this.startY;
    this.cursorX = -1;
    this.cursorY = -1;

    this.currentX = 0, this.currentY = 0, this.currentZoom = 1;

    this.xScroll = 0;
    this.xZoom = 0.1;
    this.xPointer = 0;
    this.dataset = dataset;

    // listen for mouse events
    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mouseup', this.mouseUp);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mousewheel', this.mouseWheel);
    this.canvas.addEventListener('auxclick', this.mouseWheel);

    this.YDIV = 50;
    this.XDIV = 75;
    this.xAxisHeight = 20;
    this.yAxisWidth = 40;

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
    this.ctx.font = '15px sans-serif';
    this.ctx.fillStyle = 'grey';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';

    for (let i = this.dataset[0].ts; i < this.dataset[this.dataset.length - 1].ts; i += 100 / this.xZoom) {
      this.ctx.fillText(
        this.getFormattedDate(i),
        this.yAxisWidth + (i - this.dataset[0].ts) * this.xZoom - this.xScroll,
        this.canvas.height - this.xAxisHeight / 2,
      );
    }

    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  getFormattedDate(ts) {
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  getXvalue(index) {
    try {
      if (index >= this.dataset.length) return '-1';
      return this.dataset[index].ts;
    } catch (error) {
      return '-1';
    }
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
    for (let i = this.canvas.height; i > -this.YDIV; i -= this.YDIV) {
      this.ctx.moveTo(this.yAxisWidth, i - this.xAxisHeight);
      this.ctx.lineTo(this.canvas.width, i - this.xAxisHeight);
    }
    for (let i = this.canvas.height; i > -this.YDIV; i -= this.YDIV) {
      this.ctx.fillText(
        this.canvas.height - i,
        this.yAxisWidth / 2,
        i - this.xAxisHeight,
      );
      // this.ctx.moveTo(this.yAxisWidth, i - this.xAxisHeight);
      // this.ctx.lineTo(this.canvas.width, i - this.xAxisHeight);
    }
    this.ctx.stroke();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  drawDataPath() {
    this.ctx.beginPath();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'orange';
    this.ctx.lineCap = 'round';
    for (let i = 0; i < this.dataset.length - 2; i++) {
      const timeOffset = this.dataset[0].ts;

      this.ctx.moveTo(
        this.yAxisWidth - this.xScroll + (this.dataset[i].ts - timeOffset) * this.xZoom,
        this.canvas.height - this.dataset[i].value - this.xAxisHeight,
      );
      this.ctx.lineTo(
        this.yAxisWidth - this.xScroll + (this.dataset[i + 1].ts - timeOffset) * this.xZoom,
        (this.canvas.height - this.dataset[i + 1].value - this.xAxisHeight),
      );
    }
    this.ctx.stroke();
  }

  drawHUD() {
    if (this.cursorX > 0) {
      if (this.cursorX < this.yAxisWidth) return;

      // draw crosshair
      this.ctx.beginPath();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'grey';
      this.ctx.lineCap = 'butt';
      // vertical
      // (this.xPointer + this.yAxisWidth - this.xScroll) / (1/this.xZoom) * 100 = i
      const cursorFromIndex = this.xPointer / (0.01 / this.xZoom) + this.yAxisWidth - this.xScroll;
      this.ctx.moveTo(cursorFromIndex, 0);
      this.ctx.lineTo(cursorFromIndex, this.canvas.height);
      // horizontal
      const indexVal = this.xPointer;
      const valueAtCursor = this.canvas.height - this.xAxisHeight - this.dataset[indexVal].value;
      this.ctx.moveTo(
        0,
        valueAtCursor,
      );
      this.ctx.lineTo(
        this.canvas.width,
        valueAtCursor,
      );
      this.ctx.stroke();

      // draw popup on y axis
      /* this.ctx.clearRect(
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
      this.ctx.textBaseline = 'alphabetic' */
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
      this.flagDraggingXZoom = true;
    } else {
      this.flagDraggingXScroll = true;
    }
  };

  mouseUp = (e) => {
    this.consumeMouseEvent(e);
    this.flagDraggingXScroll = false;
    this.flagDraggingXZoom = false;
  };

  mouseMove = (e) => {
    this.consumeMouseEvent(e);
    // get the current mouse position
    const mx = parseInt(e.clientX - this.offsetX);
    this.cursorX = mx;
    const my = parseInt(e.clientY - this.offsetY);
    this.cursorY = this.canvas.height - my;
    if (this.flagDraggingXScroll || this.flagDraggingXZoom) {
      // calculate the distance the mouse has moved
      // since the last mousemove
      const dx = mx - this.startX;
      const dy = my - this.startY;

      if (this.flagDraggingXZoom) {
        this.xScale += dx / 1000;
        this.xScale = Math.min(this.xScale, 1);
        this.xScale = Math.max(this.xScale, 0.001);

        this.xZoom += dx / 1000;
        this.xZoom = Math.min(this.xZoom, 1);
        this.xZoom = Math.max(this.xZoom, 0.001);
        this.zoomCallback(this.xZoom);
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
    const scroll = e.wheelDelta / 1024;
    this.currentZoom += scroll;
    // this.xScale += scroll;
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
