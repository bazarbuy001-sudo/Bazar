/**
 * Конвертер catalog.md в catalog_taxonomy_full_generated.json
 *
 * Преобразует данные из формата catalog.md в иерархическую структуру
 * с полями title, slug, children для MegaMenu
 */

const fs = require('fs');
const path = require('path');

// Функция транслитерации русского текста в slug
function transliterate(text) {
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
        'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    return text
        .split('')
        .map(char => map[char] || char)
        .join('')
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Функция форматирования названия (первая буква заглавная)
function formatTitle(text) {
    return text
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Читаем исходный файл (исправленная версия)
const catalogMdPath = 'C:\\Users\\bazar\\OneDrive\\Рабочий стол\\сайт\\Раюоты по сайту\\Промт по сайту\\Кнопка Каталог товаров и все что связанно с товарами\\catalog_fixed.json';
const catalogData = JSON.parse(fs.readFileSync(catalogMdPath, 'utf8'));

// Преобразуем структуру
const result = {
    title: "Каталог товаров",
    slug: "catalog",
    children: []
};

// Обрабатываем каждый раздел
for (const [sectionKey, sectionData] of Object.entries(catalogData.catalog)) {
    const section = {
        title: formatTitle(sectionKey),
        slug: transliterate(sectionKey),
        children: []
    };

    // Обрабатываем каждый тип внутри раздела
    for (const [typeKey, subtypes] of Object.entries(sectionData)) {
        const type = {
            title: formatTitle(typeKey),
            slug: transliterate(typeKey),
            children: []
        };

        // Обрабатываем подтипы
        if (Array.isArray(subtypes) && subtypes.length > 0) {
            for (const subtype of subtypes) {
                type.children.push({
                    title: formatTitle(subtype),
                    slug: transliterate(subtype)
                });
            }
        }

        section.children.push(type);
    }

    result.children.push(section);
}

// Записываем результат
const outputPath = path.join(__dirname, 'frontend', 'js', 'catalog', 'catalog_taxonomy_full_generated.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

console.log('✓ Файл catalog_taxonomy_full_generated.json успешно создан');
console.log('Статистика:');
console.log(`- Разделов: ${result.children.length}`);
console.log(`- Типов: ${result.children.reduce((sum, section) => sum + section.children.length, 0)}`);
console.log(`- Подтипов: ${result.children.reduce((sum, section) =>
    sum + section.children.reduce((subsum, type) => subsum + type.children.length, 0), 0)}`);