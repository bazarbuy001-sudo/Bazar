/**
 * Image Upload Manager
 * Handles drag & drop, preview, and file management for product images
 */

class ImageUploadManager {
  constructor() {
    this.images = [null, null, null, null, null]; // 5 slots
    this.mainImageIndex = 0; // First image is main by default
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupFileInputs();
    this.setupButtonEvents();
  }

  setupDragAndDrop() {
    const slots = document.querySelectorAll('.image-slot');

    slots.forEach((slot) => {
      const dropZone = slot.querySelector('.image-drop-zone');

      if (!dropZone) return;

      // Drag over
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });

      // Drag leave
      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });

      // Drop
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const slotIndex = parseInt(slot.dataset.slot);
          this.handleFile(files[0], slotIndex);
        }
      });

      // Click to open file dialog
      dropZone.addEventListener('click', (e) => {
        const fileInput = slot.querySelector('.image-file-input');
        if (fileInput && e.target !== fileInput) {
          fileInput.click();
        }
      });
    });
  }

  setupFileInputs() {
    const fileInputs = document.querySelectorAll('.image-file-input');

    fileInputs.forEach((input) => {
      input.addEventListener('change', (e) => {
        const slot = input.closest('.image-slot');
        const slotIndex = parseInt(slot.dataset.slot);

        if (e.target.files.length > 0) {
          this.handleFile(e.target.files[0], slotIndex);
        }
      });
    });
  }

  setupButtonEvents() {
    const slots = document.querySelectorAll('.image-slot');

    slots.forEach((slot) => {
      const slotIndex = parseInt(slot.dataset.slot);

      // Set as main button
      const setMainBtn = slot.querySelector('.btn-set-main');
      if (setMainBtn) {
        setMainBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.setMainImage(slotIndex);
        });
      }

      // Remove button
      const removeBtn = slot.querySelector('.btn-remove-image');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.removeImage(slotIndex);
        });
      }
    });
  }

  handleFile(file, slotIndex) {
    // Validate file
    const error = this.validateFile(file);
    if (error) {
      this.showError(error);
      return;
    }

    // Clear error
    this.clearError();

    // Read file and create preview
    const reader = new FileReader();

    reader.onload = (e) => {
      const imageData = {
        file: file,
        data: e.target.result, // base64
        name: file.name,
        type: file.type,
        size: file.size,
      };

      this.images[slotIndex] = imageData;

      // If this is the first image with content and no main image set, make it main
      if (slotIndex === 0 && this.mainImageIndex === null) {
        this.mainImageIndex = 0;
      }

      this.renderPreview(slotIndex);
    };

    reader.readAsDataURL(file);
  }

  validateFile(file) {
    // Check size
    if (file.size > this.maxFileSize) {
      return `Файл "${file.name}" слишком большой (максимум 5MB)`;
    }

    // Check type
    if (!this.allowedFormats.includes(file.type)) {
      return `Файл "${file.name}" имеет неподдерживаемый формат. Допустимые: JPG, PNG, WebP`;
    }

    return null;
  }

  renderPreview(slotIndex) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    const imageData = this.images[slotIndex];

    if (!slot || !imageData) return;

    const dropZone = slot.querySelector('.image-drop-zone');
    const preview = slot.querySelector('.image-preview');
    const img = preview.querySelector('img');

    // Update image preview
    img.src = imageData.data;
    img.alt = imageData.name;

    // Hide drop zone, show preview
    dropZone.style.display = 'none';
    preview.style.display = 'block';

    // Update badge if main
    const badge = preview.querySelector('.image-badge');
    if (slotIndex === this.mainImageIndex) {
      badge.textContent = 'Основное';
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

    // Show/hide set as main button
    const setMainBtn = slot.querySelector('.btn-set-main');
    if (setMainBtn) {
      setMainBtn.style.display = slotIndex === this.mainImageIndex ? 'none' : 'block';
    }
  }

  removeImage(slotIndex) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    const dropZone = slot.querySelector('.image-drop-zone');
    const preview = slot.querySelector('.image-preview');
    const fileInput = slot.querySelector('.image-file-input');

    // Remove data
    this.images[slotIndex] = null;

    // Reset file input
    if (fileInput) {
      fileInput.value = '';
    }

    // Show drop zone, hide preview
    dropZone.style.display = 'flex';
    preview.style.display = 'none';

    // If removed image was main, set first available as main
    if (slotIndex === this.mainImageIndex) {
      const nextMain = this.images.findIndex((img) => img !== null);
      if (nextMain !== -1) {
        this.setMainImage(nextMain);
      } else {
        this.mainImageIndex = 0; // Reset to 0
      }
    }
  }

  setMainImage(slotIndex) {
    if (this.images[slotIndex] === null) {
      this.showError('Выберите изображение перед установкой его как основного');
      return;
    }

    const previousMain = this.mainImageIndex;
    this.mainImageIndex = slotIndex;

    // Update previous main image preview
    if (previousMain !== null) {
      this.renderPreview(previousMain);
    }

    // Update new main image preview
    this.renderPreview(slotIndex);

    this.clearError();
  }

  showError(message) {
    const errorDiv = document.getElementById('image-upload-error');
    const errorMsg = document.getElementById('image-error-message');

    if (errorDiv && errorMsg) {
      errorMsg.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  clearError() {
    const errorDiv = document.getElementById('image-upload-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  // Get all images data for submission
  getImagesData() {
    return {
      images: this.images,
      mainImageIndex: this.mainImageIndex,
    };
  }

  // Get all files (for FormData submission)
  getImageFiles() {
    const files = [];
    this.images.forEach((imageData, index) => {
      if (imageData) {
        files.push({
          index: index,
          isMain: index === this.mainImageIndex,
          file: imageData.file,
        });
      }
    });
    return files;
  }

  // Validate that main image is selected
  isValid() {
    if (this.images[this.mainImageIndex] === null) {
      this.showError('Основное изображение обязательно');
      return false;
    }
    return true;
  }

  // Reset all images
  reset() {
    this.images = [null, null, null, null, null];
    this.mainImageIndex = 0;

    const slots = document.querySelectorAll('.image-slot');
    slots.forEach((slot) => {
      const dropZone = slot.querySelector('.image-drop-zone');
      const preview = slot.querySelector('.image-preview');
      const fileInput = slot.querySelector('.image-file-input');

      dropZone.style.display = 'flex';
      preview.style.display = 'none';

      if (fileInput) {
        fileInput.value = '';
      }
    });

    this.clearError();
  }

  // Load existing images (for edit mode)
  loadExistingImages(productImages) {
    if (!productImages || !Array.isArray(productImages)) return;

    productImages.forEach((image, index) => {
      if (index >= 5) return; // Max 5 images

      // Create a mock file object
      const imageData = {
        url: image.url,
        name: image.name || `image-${index}.jpg`,
        isMain: image.isMain || false,
        existingImage: true,
      };

      this.images[index] = imageData;

      if (image.isMain) {
        this.mainImageIndex = index;
      }
    });

    // Render all loaded images
    this.images.forEach((imageData, index) => {
      if (imageData && imageData.url) {
        const slot = document.querySelector(`[data-slot="${index}"]`);
        const dropZone = slot.querySelector('.image-drop-zone');
        const preview = slot.querySelector('.image-preview');
        const img = preview.querySelector('img');
        const badge = preview.querySelector('.image-badge');

        img.src = imageData.url;
        img.alt = imageData.name;

        dropZone.style.display = 'none';
        preview.style.display = 'block';

        if (index === this.mainImageIndex) {
          badge.textContent = 'Основное';
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }

        const setMainBtn = slot.querySelector('.btn-set-main');
        if (setMainBtn) {
          setMainBtn.style.display = index === this.mainImageIndex ? 'none' : 'block';
        }
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('image-upload-container')) {
    window.imageUploadManager = new ImageUploadManager();
  }
});
