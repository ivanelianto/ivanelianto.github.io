let baseImage = null;
let logoImage = null;
let rectangles = [];
let texts = [];
let selectedElement = null;
let logoPreview;
let isDragging = false;
let offsetX, offsetY;

// Unified drag handler for logo, rectangles, and text
function startDrag(e) {
  if (isDragging) {
    isDragging = false;
    selectedElement = null;
    return;
  }

  e.preventDefault();
  isDragging = true;
  selectedElement = e.target;

  const rect = selectedElement.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  function onMouseMove(e) {
    if (isDragging && selectedElement) {
      const left = e.clientX - previewContainer.offsetLeft - offsetX;
      const top = e.clientY - previewContainer.offsetTop - offsetY;
      selectedElement.style.left = `${left}px`;
      selectedElement.style.top = `${top}px`;

      if (selectedElement.id === 'logoPreview') {
        document.getElementById('positionType').value = 'custom';
        document.getElementById('customPosition').classList.add('active');
        document.getElementById('posX').value = left;
        document.getElementById('posY').value = top;
      }
    }
  }

  function onMouseUp() {
    isDragging = false;
    selectedElement = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function previewBase() {
  const input = document.getElementById('baseImage');
  const preview = document.getElementById('basePreview');

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      baseImage = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function previewLogo() {
  const input = document.getElementById('logoUpload');
  logoPreview = document.getElementById('logoPreview');

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      logoPreview.src = e.target.result;
      logoPreview.style.display = 'block';
      logoPreview.style.cursor = 'move';
      logoImage = e.target.result;

      // Remove any existing event listener and add new one
      logoPreview.removeEventListener('mousedown', startDrag);
      logoPreview.addEventListener('mousedown', startDrag);

      if (!layers.includes(logoPreview)) {
        layers.push(logoPreview);
        updateZIndices();
        updateLayerList();
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function togglePositionInputs() {
  const positionType = document.getElementById('positionType').value;
  const customPosition = document.getElementById('customPosition');

  if (positionType === 'custom') {
    customPosition.classList.add('active');
  } else {
    customPosition.classList.remove('active');
  }
  updateLogoPreview();
}

function updateLogoPreview() {
  const preview = document.getElementById('logoPreview');
  const size = document.getElementById('logoSize').value;
  const positionType = document.getElementById('positionType').value;

  preview.style.width = `${size}px`;
  preview.style.height = `${size}px`;

  if (positionType === 'topLeft') {
    preview.style.left = '0';
    preview.style.top = '0';
  } else if (positionType === 'topRight') {
    preview.style.left = 'auto';
    preview.style.right = '0';
    preview.style.top = '0';
  } else {
    preview.style.left = `${document.getElementById('posX').value}px`;
    preview.style.top = `${document.getElementById('posY').value}px`;
  }
}

function addRectangle() {
  const container = document.getElementById('previewContainer');
  const rect = document.createElement('div');
  rect.className = 'rectangle';
  rect.style.width = '100px';
  rect.style.height = '100px';
  rect.style.borderColor = document.getElementById('rectangleStrokeColor').value;
  rect.style.backgroundColor = document.getElementById('rectangleFillColor').value;
  rect.style.cursor = 'move';

  const baseImg = document.getElementById('basePreview');
  if (baseImg.naturalWidth && baseImg.naturalHeight) {
    rect.style.left = `${(baseImg.offsetWidth - 100) / 2}px`;
    rect.style.top = `${(baseImg.offsetHeight - 100) / 2}px`;
  }

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  rect.appendChild(resizeHandle);

  rect.addEventListener('mousedown', startDrag);
  resizeHandle.addEventListener('mousedown', startResize);

  container.appendChild(rect);
  rectangles.push(rect);

  container.appendChild(rect);
  rectangles.push(rect);
  layers.push(rect);
  updateZIndices();
  updateLayerList();
}

function addText() {
  const container = document.getElementById('previewContainer');
  const text = document.createElement('div');
  text.className = 'textElement';
  text.innerText = document.getElementById('textInput').value;
  text.style.fontSize = `${document.getElementById('fontSize').value}px`;
  text.style.cursor = 'move';

  const baseImg = document.getElementById('basePreview');
  if (baseImg.naturalWidth && baseImg.naturalHeight) {
    text.style.left = `${(baseImg.offsetWidth - text.offsetWidth) / 2}px`;
    text.style.top = `${(baseImg.offsetHeight - text.offsetHeight) / 2}px`;
  }

  text.addEventListener('mousedown', startDrag);

  container.appendChild(text);
  texts.push(text);

  container.appendChild(text);
  texts.push(text);
  layers.push(text);
  updateZIndices();
  updateLayerList();
}

function startResize(e) {
  e.stopPropagation();
  const rect = e.target.parentElement;
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = rect.offsetWidth;
  const startHeight = rect.offsetHeight;

  function onMouseMove(e) {
    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);
    rect.style.width = `${newWidth}px`;
    rect.style.height = `${newHeight}px`;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// Update downloadImage function
function downloadImage() {
  if (!baseImage) {
    alert('Please upload the base image first');
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const baseImg = new Image();
  baseImg.onload = function () {
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    ctx.drawImage(baseImg, 0, 0);

    const scale = baseImg.width / document.getElementById('basePreview').offsetWidth;

    const renderPromises = layers.map(layer => {
      return new Promise((resolve) => {
        if (layer.classList.contains('overlayImage')) {
          const img = new Image();
          img.onload = function () {
            const left = parseInt(layer.style.left || 0);
            const top = parseInt(layer.style.top || 0);
            const width = layer.offsetWidth;
            const height = layer.offsetHeight;

            ctx.drawImage(
              img,
              left * scale,
              top * scale,
              width * scale,
              height * scale
            );
            resolve();
          };
          img.src = layer.src;
        }
        else if (layer.className === 'rectangle') {
          const rectLeft = parseInt(layer.style.left || 0);
          const rectTop = parseInt(layer.style.top || 0);
          const rectWidth = layer.offsetWidth;
          const rectHeight = layer.offsetHeight;

          ctx.fillStyle = layer.style.backgroundColor;
          ctx.strokeStyle = layer.style.borderColor;
          ctx.fillRect(rectLeft * scale, rectTop * scale, rectWidth * scale, rectHeight * scale);
          ctx.strokeRect(rectLeft * scale, rectTop * scale, rectWidth * scale, rectHeight * scale);
          resolve();
        }
        else if (layer.classList.contains('textElement')) {
          const textLeft = parseInt(layer.style.left || 0);
          const textTop = parseInt(layer.style.top || 0);
          const fontSize = parseInt(layer.style.fontSize);

          ctx.font = `${fontSize * scale}px ${window.getComputedStyle(layer).fontFamily}`;
          ctx.fillStyle = window.getComputedStyle(layer).color;
          ctx.fillText(layer.innerText, textLeft * scale, (textTop + fontSize) * scale);
          resolve();
        }
        else {
          resolve();
        }
      });
    });

    Promise.all(renderPromises).then(() => {
      const link = document.createElement('a');
      link.download = 'combined-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };
  baseImg.src = baseImage;
}

function renderRectangle(ctx, rect, scale) {
  // Render rectangles
  const rectLeft = parseInt(rect.style.left || 0);
  const rectTop = parseInt(rect.style.top || 0);
  const rectWidth = rect.offsetWidth;
  const rectHeight = rect.offsetHeight;

  ctx.strokeStyle = rect.style.borderColor;
  ctx.fillStyle = rect.style.backgroundColor;
  ctx.fillRect(rectLeft * scale, rectTop * scale, rectWidth * scale, rectHeight * scale);
  ctx.strokeRect(rectLeft * scale, rectTop * scale, rectWidth * scale, rectHeight * scale);
}

function renderText(ctx, text, scale) {
  // Render texts
  const textLeft = parseInt(text.style.left || 0);
  const textTop = parseInt(text.style.top || 0);

  ctx.font = `${parseInt(text.style.fontSize) * scale}px ${window.getComputedStyle(text).fontFamily}`;
  ctx.fillStyle = window.getComputedStyle(text).color;
  ctx.fillText(text.innerText, textLeft * scale, (textTop + parseInt(text.style.fontSize)) * scale);

}

// Add these to the existing global variables
let layers = [];
let selectedLayer = null;

// Add this function to initialize layers
function initializeLayers() {
  const container = document.getElementById('previewContainer');
  layers = Array.from(container.children);
  updateZIndices();
}

// Add this function to update z-indices
function updateZIndices() {
  layers.forEach((layer, index) => {
    layer.style.zIndex = index;
  });
}

function updateLayerList() {
  const layerList = document.getElementById('layerList');
  layerList.innerHTML = '';

  layers.slice().reverse().forEach((layer, index) => {
    const layerItem = document.createElement('div');
    layerItem.className = `layer-item${layer === selectedLayer ? ' selected' : ''}`;

    let layerName = 'Layer';
    if (layer.id === 'logoPreview') layerName = 'Logo';
    else if (layer.className === 'textElement') layerName = `Text: ${layer.innerText}`;
    else if (layer.className === 'rectangle') layerName = 'Rectangle';

    layerItem.innerHTML = `
      <span>${layerName}</span>
      <div class="layer-controls">
        <button class="layer-button" onclick="moveLayer(${layers.length - 1 - index}, 'up')">&uarr;</button>
        <button class="layer-button" onclick="moveLayer(${layers.length - 1 - index}, 'down')">&darr;</button>
        <button class="layer-button delete-button" onclick="deleteLayer(${layers.length - 1 - index})">🗑️</button>
      </div>
    `;

    layerItem.addEventListener('click', () => {
      selectedLayer = layer;
      updateLayerList();
    });

    layerList.appendChild(layerItem);
  });
}

function deleteLayer(index) {
  const layer = layers[index];
  if (layer) {
    if (layer.id === 'logoPreview') {
      layer.style.display = 'none';
      layer.src = '';  // Reset source
      logoImage = null;
      // Reset logo input so it can be reused
      document.getElementById('logoUpload').value = '';
      document.getElementById('posX').value = 0;
      document.getElementById('posY').value = 0;
    } else if (layer.className === 'rectangle') {
      rectangles = rectangles.filter(r => r !== layer);
    } else if (layer.className === 'textElement') {
      texts = texts.filter(t => t !== layer);
    }

    if (layer.id !== 'logoPreview') {
      layer.remove();
    }

    layers.splice(index, 1);
    selectedLayer = null;

    updateZIndices();
    updateLayerList();
  }
}

function moveLayer(index, direction) {
  const newIndex = direction === 'up' ? index + 1 : index - 1;

  if (newIndex >= 0 && newIndex < layers.length) {
    [layers[index], layers[newIndex]] = [layers[newIndex], layers[index]];
    updateZIndices();
    updateLayerList();
  }
}

// Add to the end of your window.onload or initialization code
initializeLayers();

function updateSelectedImageSize() {
  const size = document.getElementById('imageSize').value;
  if (selectedElement && selectedElement.classList.contains('overlayImage')) {
    console.log('cahngeee');
    updateImageSize(selectedElement, size);
  }
}

function createImageElement(src, size = 100) {
  const img = document.createElement('img');
  img.src = src;
  img.style.position = 'absolute';
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;
  img.style.display = 'block';
  img.style.cursor = 'move';
  img.style.left = '0';
  img.style.top = '0';
  img.className = 'overlayImage';
  img.addEventListener('mousedown', startDrag);
  return img;
}

function previewImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const container = document.getElementById('previewContainer');
    const img = createImageElement(e.target.result);
    container.appendChild(img);

    layers.push(img);
    updateZIndices();
    updateLayerList();
  };
  reader.readAsDataURL(file);
}

function handleImageUpload(event) {
  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    previewImage(files[i]);
  }
}

function updateImageSize(element, size) {
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
}
