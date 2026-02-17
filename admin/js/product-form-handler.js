/**
 * Dynamic Product Form Handler
 * Manages multi-step form for both Fabric and Accessory products
 */

class ProductFormHandler {
  constructor() {
    this.currentType = null;
    this.fabricSubcategories = {
      'Одежные_ткани': [
        'атлас', 'бархат', 'батист', 'блузочные', 'букле', 'вельвет', 'велюр',
        'вискоза', 'вышивка', 'габардин', 'джерси', 'джинс', 'бифлекс', 'для_мусульманской_одежды',
        'для_школьной_формы', 'дубленка', 'жаккард', 'замша', 'интерлок', 'кожа',
        'костюмные', 'креп', 'кроше_кружево', 'кулирка', 'лен', 'люрекс', 'марлевка',
        'мех', 'муслин', 'на_флисе', 'органза_кристаллон', 'пайетка', 'пальтовые',
        'парча', 'плательные', 'плащевые_курточные', 'плиссе_гофре', 'подкладочные',
        'поплин', 'рами', 'рибана', 'рубашечные', 'свадебные', 'сетка', 'спорт_и_фитнес',
        'стеганые', 'тафта', 'трикотаж', 'фатин', 'фетр', 'флис_велсофт', 'футер',
        'хлопок', 'шелк', 'шерсть', 'шитье', 'шифон', 'штапель', 'купра', 'тенсель'
      ],
      'Натуральные_ткани': [
        'батист', 'вискоза', 'костюмные', 'коттон_сатин', 'лен', 'муслин',
        'подкладочные', 'поплин', 'рами', 'трикотаж', 'штапель', 'панбархат', 'крапива'
      ],
      'Европейские_ткани': [
        'другое'
      ],
      'Ткани_для_спецодежды': [
        'для_медицинских_масок_и_халатов', 'брезент', 'грета', 'диагональ',
        'для_анорака', 'для_маскхалата', 'для_тактических_брюк', 'для_фуфаек',
        'дубок', 'дюспо', 'камуфляжная_флора', 'мембранные_ткани', 'оксфорд',
        'полушерстяная', 'рипстоп', 'фланель'
      ],
      'Технические_ткани': [
        'другое'
      ]
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Product type selector
    const typeSelect = document.getElementById('product-type');
    typeSelect?.addEventListener('change', (e) => {
      this.handleTypeChange(e.target.value);
    });

    // Fabric main category change
    const mainCategorySelect = document.getElementById('fabric-main-category');
    mainCategorySelect?.addEventListener('change', (e) => {
      this.updateFabricSubcategories(e.target.value);
    });

    // Add composition component button
    document.getElementById('btn-add-composition')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.addCompositionItem();
    });

    // Delegation for remove composition
    document.getElementById('fabric-composition-container')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-composition')) {
        e.preventDefault();
        e.target.closest('.composition-item').remove();
      }
    });
  }

  handleTypeChange(type) {
    this.currentType = type;

    // Hide/show steps
    document.getElementById('step-2-basic').classList.toggle('hidden', !type);
    document.getElementById('step-3-fabric').classList.toggle('hidden', type !== 'fabric');
    document.getElementById('step-3-accessory').classList.toggle('hidden', type !== 'accessory');

    // Clear form if type changed
    if (type) {
      this.resetForm();
    }
  }

  resetForm() {
    document.getElementById('product-form').reset();
  }

  addCompositionItem() {
    const container = document.getElementById('fabric-composition-container');
    const item = document.createElement('div');
    item.className = 'composition-item';
    item.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Материал:</label>
          <input type="text" class="composition-material" placeholder="хлопок, синтетика...">
        </div>
        <div class="form-group">
          <label>Процент:</label>
          <input type="number" class="composition-percent" min="0" max="100" placeholder="%">
        </div>
        <button type="button" class="btn-remove-composition" style="margin-top: 24px;">✕</button>
      </div>
    `;
    container.appendChild(item);
  }

  updateFabricSubcategories(mainCategory) {
    const subcategorySelect = document.getElementById('fabric-subcategory');
    const subcategories = this.fabricSubcategories[mainCategory] || [];

    subcategorySelect.innerHTML = '<option value="">-- Выберите подкатегорию --</option>';
    subcategories.forEach(subcat => {
      const option = document.createElement('option');
      option.value = subcat;
      option.textContent = subcat.replace(/_/g, ' ');
      subcategorySelect.appendChild(option);
    });
  }

  // Collect form data
  collectFormData() {
    const type = document.getElementById('product-type').value;

    if (!type) {
      alert('Выберите тип товара');
      return null;
    }

    const baseData = {
      product_type: type,
      product_name: document.getElementById('product-name').value,
      article_number: document.getElementById('product-article').value,
    };

    if (type === 'fabric') {
      return this.collectFabricData(baseData);
    } else if (type === 'accessory') {
      return this.collectAccessoryData(baseData);
    }

    return null;
  }

  collectFabricData(baseData) {
    const composition = this.collectComposition();

    return {
      ...baseData,
      price_per_meter: parseFloat(document.getElementById('fabric-price').value),
      old_price: parseFloat(document.getElementById('fabric-old-price').value) || 0,
      minimum_cut: parseInt(document.getElementById('fabric-min-cut').value),
      warehouse_availability: parseFloat(document.getElementById('fabric-warehouse').value),
      is_new: document.getElementById('fabric-is-new').checked,
      is_on_sale: document.getElementById('fabric-is-sale').checked,
      is_rest_roll: document.getElementById('fabric-is-rest').checked,
      color: document.getElementById('fabric-color').value,
      shade: document.getElementById('fabric-shade').value,
      width_cm: parseFloat(document.getElementById('fabric-width').value),
      composition: composition,
      density_gsm: parseFloat(document.getElementById('fabric-density-gsm').value) || 0,
      density_gpm: parseFloat(document.getElementById('fabric-density-gpm').value) || 0,
      pattern: document.getElementById('fabric-pattern').value,
      print_type: document.getElementById('fabric-print-type').value,
      fabric_subtype: document.getElementById('fabric-subtype').value,
      fabric_properties: document.getElementById('fabric-properties').value,
      purpose: document.getElementById('fabric-purpose').value,
      meters_per_roll: parseFloat(document.getElementById('fabric-meters-roll').value) || 0,
      meters_per_kg: parseFloat(document.getElementById('fabric-meters-kg').value) || 0,
      country_of_origin: document.getElementById('fabric-country').value,
      category: document.getElementById('fabric-main-category').value,
      subcategory: document.getElementById('fabric-subcategory').value,
    };
  }

  collectAccessoryData(baseData) {
    return {
      ...baseData,
      price: parseFloat(document.getElementById('acc-price').value),
      warehouse_availability: parseFloat(document.getElementById('acc-warehouse').value),
      is_new: document.getElementById('acc-is-new').checked,
      is_on_sale: document.getElementById('acc-is-sale').checked,
      color: document.getElementById('acc-color').value,
      material: document.getElementById('acc-material').value,
      accessory_type: document.getElementById('acc-type').value,
      size: document.getElementById('acc-size').value,
      application: document.getElementById('acc-application').value,
      finish: document.getElementById('acc-finish').value,
      brand: document.getElementById('acc-brand').value,
      package_type: document.getElementById('acc-package').value,
      mounting_type: document.getElementById('acc-mounting').value,
      category: document.getElementById('acc-category').value,
    };
  }

  collectComposition() {
    const items = document.querySelectorAll('.composition-item');
    const composition = [];

    items.forEach(item => {
      const material = item.querySelector('.composition-material').value;
      const percent = parseFloat(item.querySelector('.composition-percent').value) || 0;

      if (material) {
        composition.push({ material, percentage: percent });
      }
    });

    return composition;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.productFormHandler = new ProductFormHandler();
});
