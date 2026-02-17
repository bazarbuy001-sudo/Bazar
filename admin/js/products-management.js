/**
 * Products Management Module
 */

class ProductsManager {
  constructor() {
    this.products = [];
    this.currentProduct = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add product button
    document.getElementById('btn-add-product')?.addEventListener('click', () => {
      this.openProductModal();
    });

    // Import products
    document.getElementById('btn-import-products')?.addEventListener('click', () => {
      this.showImportDialog();
    });

    // Search and filter
    document.getElementById('products-search')?.addEventListener('keyup', () => {
      this.filterProducts();
    });

    document.getElementById('products-category')?.addEventListener('change', () => {
      this.filterProducts();
    });

    // Modal actions
    const modal = document.getElementById('product-modal');
    modal?.querySelector('.modal-close')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => {
      document.getElementById('product-modal').classList.remove('active');
    });

    document.getElementById('modal-save')?.addEventListener('click', () => {
      this.saveProduct();
    });

    // Close modal on overlay click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  async loadProducts() {
    try {
      const response = await apiClient.getProducts();
      this.products = response.data || response.products || [];
      this.renderProductsTable();
      this.loadCategories();
    } catch (error) {
      console.error('Failed to load products:', error);
      dashboardManager.showToast('Ошибка загрузки товаров', 'error');
    }
  }

  renderProductsTable() {
    const tbody = document.getElementById('products-tbody');

    if (this.products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Товары не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = this.products.map(product => `
      <tr>
        <td>${this.truncate(product.publicId, 8)}</td>
        <td>${product.name}</td>
        <td>${product.productType === 'FABRIC' ? 'Ткань' : 'Фурнитура'}</td>
        <td>${dashboardManager.formatPrice(product.price)}</td>
        <td>${product.category?.name || '—'}</td>
        <td>${(product.colors && Array.isArray(product.colors) ? product.colors.join(', ') : '—')}</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="productsManager.editProduct('${product.id}')">
            Редактировать
          </button>
          <button class="btn btn-danger btn-small" onclick="productsManager.deleteProduct('${product.id}')">
            Удалить
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadCategories() {
    try {
      const response = await apiClient.getCategories();
      const select = document.getElementById('products-category');

      if (select && response.data) {
        response.data.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  filterProducts() {
    const search = document.getElementById('products-search')?.value.toLowerCase() || '';
    const category = document.getElementById('products-category')?.value || '';

    const filtered = this.products.filter(product => {
      const matchSearch = product.name.toLowerCase().includes(search) ||
                         product.publicId?.toLowerCase().includes(search) ||
                         product.id.toLowerCase().includes(search);
      const matchCategory = !category || product.categoryId === category;
      return matchSearch && matchCategory;
    });

    // Render filtered products
    const tbody = document.getElementById('products-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Товары не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(product => `
      <tr>
        <td>${this.truncate(product.publicId, 8)}</td>
        <td>${product.name}</td>
        <td>${product.productType === 'FABRIC' ? 'Ткань' : 'Фурнитура'}</td>
        <td>${dashboardManager.formatPrice(product.price)}</td>
        <td>${product.category?.name || '—'}</td>
        <td>${(product.colors && Array.isArray(product.colors) ? product.colors.join(', ') : '—')}</td>
        <td>
          <button class="btn btn-primary btn-small" onclick="productsManager.editProduct('${product.id}')">
            Редактировать
          </button>
          <button class="btn btn-danger btn-small" onclick="productsManager.deleteProduct('${product.id}')">
            Удалить
          </button>
        </td>
      </tr>
    `).join('');
  }

  openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');

    form.reset();
    this.currentProduct = null;

    // Reset form to step 1 (type selection)
    document.getElementById('product-type').value = '';
    document.getElementById('step-1-type').classList.add('active');
    document.getElementById('step-2-basic').classList.add('hidden');
    document.getElementById('step-3-fabric').classList.add('hidden');
    document.getElementById('step-3-accessory').classList.add('hidden');

    // Reset image upload manager
    if (window.imageUploadManager) {
      window.imageUploadManager.reset();
    }

    if (productId) {
      this.editProduct(productId);
      return;
    }

    document.getElementById('modal-title').textContent = 'Добавить товар';
    modal.classList.add('active');
  }

  async editProduct(productId) {
    try {
      const product = await apiClient.getProductById(productId);

      this.currentProduct = product;

      document.getElementById('modal-title').textContent = 'Редактировать товар';
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-category').value = product.category || '';
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-old-price').value = product.old_price || '';
      document.getElementById('product-colors').value = (product.colors || []).join(', ');

      // Load existing images if available
      if (window.imageUploadManager && product.images) {
        window.imageUploadManager.loadExistingImages(product.images);
      }

      document.getElementById('product-modal').classList.add('active');
    } catch (error) {
      console.error('Failed to load product:', error);
      dashboardManager.showToast('Ошибка загрузки товара', 'error');
    }
  }

  async saveProduct() {
    const form = document.getElementById('product-form');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Validate images (at least main image required)
    if (window.imageUploadManager && !window.imageUploadManager.isValid()) {
      return;
    }

    // Use ProductFormHandler to collect structured data
    const data = window.productFormHandler?.collectFormData();
    
    if (!data) {
      dashboardManager.showToast('Ошибка при сборке данных товара', 'error');
      return;
    }

    try {
      let productId;

      if (this.currentProduct) {
        await apiClient.updateProduct(this.currentProduct.id, data);
        productId = this.currentProduct.id;
        dashboardManager.showToast('Товар обновлён', 'success');
      } else {
        const response = await apiClient.createProduct(data);
        productId = response.data?.id || response.id;
        dashboardManager.showToast('Товар добавлен', 'success');
      }

      // Upload images if they exist
      if (window.imageUploadManager) {
        const imageFiles = window.imageUploadManager.getImageFiles();
        if (imageFiles.length > 0) {
          try {
            const uploadFormData = new FormData();
            imageFiles.forEach((imageData) => {
              uploadFormData.append('images', imageData.file);
              uploadFormData.append(`image_${imageData.index}_isMain`, imageData.isMain);
            });
            uploadFormData.append('productId', productId);

            const uploadResponse = await fetch(`http://localhost:3000/api/v1/admin/products/upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiClient.getToken()}`,
              },
              body: uploadFormData,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            dashboardManager.showToast('Изображения загружены', 'success');
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
            dashboardManager.showToast('Ошибка загрузки изображений', 'warning');
          }
        }
      }

      document.getElementById('product-modal').classList.remove('active');
      this.loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      dashboardManager.showToast('Ошибка сохранения товара: ' + error.message, 'error');
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Вы уверены?')) return;

    try {
      await apiClient.deleteProduct(productId);
      dashboardManager.showToast('Товар удалён', 'success');
      this.loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      dashboardManager.showToast('Ошибка удаления товара', 'error');
    }
  }

  showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const format = file.name.endsWith('.json') ? 'json' : 'csv';

      try {
        await apiClient.importProducts(format, file);
        dashboardManager.showToast('Товары импортированы', 'success');
        this.loadProducts();
      } catch (error) {
        console.error('Failed to import products:', error);
        dashboardManager.showToast('Ошибка импорта', 'error');
      }
    });

    input.click();
  }

  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.productsManager = new ProductsManager();
});
