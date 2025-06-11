class ImageEditor {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.previewImg = document.getElementById("preview-img");
    this.originalImage = null;
    this.currentImage = null;

    // Filter values
    this.filters = {
      brightness: 100,
      saturation: 100,
      inversion: 0,
      grayscale: 0,
    };

    // Transform values
    this.transform = {
      rotate: 0,
      flipHorizontal: 1,
      flipVertical: 1,
    };

    // Drawing state
    this.isDrawing = false;
    this.drawMode = false;
    this.brushSize = 5;
    this.brushColor = "#333333";
    this.lastX = 0;
    this.lastY = 0;

    // History for undo functionality
    this.history = [];
    this.historyIndex = -1;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupThemeToggle();
    this.updateFilterDisplay();
  }

  setupEventListeners() {
    // File input
    const fileInput = document.getElementById("file-input");
    const chooseImgBtn = document.getElementById("choose-img-btn");
    const choosePlaceholder = document.getElementById("choose-placeholder");

    fileInput.addEventListener("change", (e) => this.loadImage(e));
    chooseImgBtn.addEventListener("click", () => fileInput.click());
    choosePlaceholder.addEventListener("click", () => fileInput.click());

    // Filter controls
    const filterBtns = document.querySelectorAll(".filter-btn");
    const filterSlider = document.getElementById("filter-slider");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => this.selectFilter(e));
    });

    filterSlider.addEventListener("input", (e) => this.updateFilter(e));

    // Rotation controls
    const rotateBtns = document.querySelectorAll(".rotate-btn");
    rotateBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleRotation(e));
    });

    // Drawing controls
    const toggleDrawBtn = document.getElementById("toggle-draw");
    const brushColorInput = document.getElementById("brush-color");
    const brushSizeSlider = document.getElementById("brush-size-slider");
    const colorOptions = document.querySelectorAll(".color-option");

    toggleDrawBtn.addEventListener("click", () => this.toggleDrawMode());
    brushColorInput.addEventListener("change", (e) =>
      this.setBrushColor(e.target.value)
    );
    brushSizeSlider.addEventListener("input", (e) =>
      this.setBrushSize(e.target.value)
    );

    colorOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        const color = e.target.dataset.color;
        this.setBrushColor(color);
        brushColorInput.value = color;
      });
    });

    // Canvas drawing events
    this.canvas.addEventListener("mousedown", (e) =>
      this.handleCanvasMouseDown(e)
    );
    this.canvas.addEventListener("mousemove", (e) =>
      this.handleCanvasMouseMove(e)
    );
    this.canvas.addEventListener("mouseup", () => this.handleCanvasMouseUp());
    this.canvas.addEventListener("mouseout", () => this.handleCanvasMouseUp());

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", (e) =>
      this.handleCanvasMouseDown(e)
    );
    this.canvas.addEventListener("touchmove", (e) =>
      this.handleCanvasMouseMove(e)
    );
    this.canvas.addEventListener("touchend", () => this.handleCanvasMouseUp());

    // Action buttons
    const resetBtn = document.getElementById("reset-btn");
    const undoBtn = document.getElementById("undo-btn");
    const saveBtn = document.getElementById("save-img-btn");
    const saveAsJpg = document.getElementById("save-as-jpg");
    const saveAsPng = document.getElementById("save-as-png");

    resetBtn.addEventListener("click", () => this.resetAll());
    undoBtn.addEventListener("click", () => this.undo());
    saveBtn.addEventListener("click", () => this.toggleSaveOptions());
    saveAsJpg.addEventListener("click", () => this.saveImage("jpeg"));
    saveAsPng.addEventListener("click", () => this.saveImage("png"));

    // Close save options when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".save-options")) {
        document.getElementById("download-options").classList.add("hidden");
      }
    });
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle-checkbox");
    const savedTheme = "light"; // Remove localStorage usage

    if (savedTheme === "dark") {
      themeToggle.checked = true;
      document.documentElement.setAttribute("data-theme", "dark");
    }

    themeToggle.addEventListener("change", () => {
      const theme = themeToggle.checked ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
    });
  }

  loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.currentImage = img;
        this.setupCanvas();
        this.showImage();
        this.saveState();
        this.resetFilters();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupCanvas() {
    const container = document.getElementById("image-container");
    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 48; // padding
    const maxHeight = containerRect.height - 48;

    const imgRatio = this.originalImage.width / this.originalImage.height;
    const containerRatio = maxWidth / maxHeight;

    let canvasWidth, canvasHeight;

    if (imgRatio > containerRatio) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imgRatio;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imgRatio;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    this.applyFilters();
  }

  showImage() {
    document.getElementById("placeholder").classList.add("hidden");
    this.previewImg.classList.add("hidden");
    this.canvas.classList.remove("hidden");
  }

  selectFilter(event) {
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");

    const filterType = event.target.dataset.filter;
    this.updateFilterDisplay(filterType);
  }

  updateFilterDisplay(filterType = "brightness") {
    const filterSlider = document.getElementById("filter-slider");
    const filterName = document.querySelector(".filter-name");
    const filterValue = document.querySelector(".filter-value");

    let value, min, max, unit;

    switch (filterType) {
      case "brightness":
        value = this.filters.brightness;
        min = 0;
        max = 200;
        unit = "%";
        break;
      case "saturation":
        value = this.filters.saturation;
        min = 0;
        max = 200;
        unit = "%";
        break;
      case "inversion":
        value = this.filters.inversion;
        min = 0;
        max = 100;
        unit = "%";
        break;
      case "grayscale":
        value = this.filters.grayscale;
        min = 0;
        max = 100;
        unit = "%";
        break;
    }

    filterSlider.min = min;
    filterSlider.max = max;
    filterSlider.value = value;
    filterName.textContent =
      filterType.charAt(0).toUpperCase() + filterType.slice(1);
    filterValue.textContent = value + unit;
  }

  updateFilter(event) {
    const activeFilter = document.querySelector(".filter-btn.active");
    const filterType = activeFilter.dataset.filter;
    const value = parseInt(event.target.value);

    this.filters[filterType] = value;

    const filterValue = document.querySelector(".filter-value");
    filterValue.textContent = value + "%";

    this.applyFilters();
  }

  applyFilters() {
    if (!this.originalImage) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply transforms
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate((this.transform.rotate * Math.PI) / 180);
    this.ctx.scale(this.transform.flipHorizontal, this.transform.flipVertical);

    // Apply filters
    const filterString = `
            brightness(${this.filters.brightness}%)
            saturate(${this.filters.saturation}%)
            invert(${this.filters.inversion}%)
            grayscale(${this.filters.grayscale}%)
        `;
    this.ctx.filter = filterString;

    // Draw image
    this.ctx.drawImage(
      this.originalImage,
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );

    this.ctx.restore();
    this.ctx.filter = "none";
  }

  handleRotation(event) {
    const action = event.target.closest(".rotate-btn").dataset.action;

    switch (action) {
      case "left":
        this.transform.rotate -= 90;
        break;
      case "right":
        this.transform.rotate += 90;
        break;
      case "horizontal":
        this.transform.flipHorizontal *= -1;
        break;
      case "vertical":
        this.transform.flipVertical *= -1;
        break;
    }

    this.applyFilters();
    this.saveState();
  }

  toggleDrawMode() {
    this.drawMode = !this.drawMode;
    const toggleBtn = document.getElementById("toggle-draw");
    const colorPickerContainer = document.getElementById(
      "color-picker-container"
    );
    const brushSlider = document.getElementById("brush-slider");

    if (this.drawMode) {
      toggleBtn.classList.add("active");
      colorPickerContainer.classList.remove("hidden");
      brushSlider.classList.remove("hidden");
      this.canvas.style.cursor = "crosshair";
    } else {
      toggleBtn.classList.remove("active");
      colorPickerContainer.classList.add("hidden");
      brushSlider.classList.add("hidden");
      this.canvas.style.cursor = "default";
    }
  }

  setBrushColor(color) {
    this.brushColor = color;
  }

  setBrushSize(size) {
    this.brushSize = size;
    document.getElementById("brush-value").textContent = size + "px";
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let clientX, clientY;

    if (e.type.includes("touch")) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  handleCanvasMouseDown(e) {
    if (this.cropMode) {
      this.startCrop(e);
    } else if (this.drawMode) {
      this.startDrawing(e);
    }
  }

  handleCanvasMouseMove(e) {
    if (this.cropMode) {
      this.updateCrop(e);
    } else if (this.drawMode) {
      this.draw(e);
    }
  }

  handleCanvasMouseUp() {
    if (this.cropMode) {
      this.endCrop();
    } else if (this.drawMode) {
      this.stopDrawing();
    }
  }

  startDrawing(e) {
    if (!this.drawMode) return;

    e.preventDefault();
    this.isDrawing = true;

    const pos = this.getMousePos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;

    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(e) {
    if (!this.isDrawing || !this.drawMode) return;

    e.preventDefault();
    const pos = this.getMousePos(e);

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = this.brushColor;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.saveState();
  }

  saveState() {
    if (!this.canvas) return;

    const imageData = this.canvas.toDataURL();

    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push({
      imageData: imageData,
      filters: { ...this.filters },
      transform: { ...this.transform },
      imageObj: this.createImageFromCanvas(),
    });

    this.historyIndex = this.history.length - 1;

    // Limit history to 10 states
    if (this.history.length > 10) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  createImageFromCanvas() {
    const img = new Image();
    img.src = this.canvas.toDataURL();
    return img;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];

      // Restore the original image
      this.originalImage = state.imageObj;

      // Restore filters and transforms
      this.filters = { ...state.filters };
      this.transform = { ...state.transform };

      // Redraw everything
      this.applyFilters();
      this.updateAllFilterDisplays();
    }
  }

  updateAllFilterDisplays() {
    const activeFilter = document.querySelector(".filter-btn.active");
    if (activeFilter) {
      this.updateFilterDisplay(activeFilter.dataset.filter);
    }
  }

  resetFilters() {
    this.filters = {
      brightness: 100,
      saturation: 100,
      inversion: 0,
      grayscale: 0,
    };

    this.transform = {
      rotate: 0,
      flipHorizontal: 1,
      flipVertical: 1,
    };

    this.updateAllFilterDisplays();
    this.applyFilters();
  }

  resetAll() {
    if (!this.originalImage) return;

    // Reset to the very first loaded image
    if (this.history.length > 0) {
      const firstState = this.history[0];
      this.originalImage = firstState.imageObj;
      this.historyIndex = 0;
    }

    this.resetFilters();
    this.setupCanvas();
    this.saveState();

    // Reset UI
    this.drawMode = false;
    document.getElementById("toggle-draw").classList.remove("active");
    document.getElementById("color-picker-container").classList.add("hidden");
    document.getElementById("brush-slider").classList.add("hidden");
    this.canvas.style.cursor = "default";
  }

  toggleSaveOptions() {
    const downloadOptions = document.getElementById("download-options");
    downloadOptions.classList.toggle("hidden");
  }

  saveImage(format) {
    if (!this.canvas) return;

    const link = document.createElement("a");
    link.download = `edited-image.${format}`;

    if (format === "jpeg") {
      link.href = this.canvas.toDataURL("image/jpeg", 0.9);
    } else {
      link.href = this.canvas.toDataURL("image/png");
    }

    link.click();

    // Hide download options
    document.getElementById("download-options").classList.add("hidden");
  }
}

// Initialize the image editor when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new ImageEditor();
});
