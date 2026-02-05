const fs = require('fs');

const source = 'c:\\Users\\bazar\\OneDrive\\Рабочий стол\\Все файлы клауд\\Заполнение меню кнопки Каталог товаров 3\\catalog_taxonomy_full_fixed.json';
const dest = 'frontend\\js\\catalog\\catalog_taxonomy_full_generated.json';

console.log('Копирование файла таксономии...');
console.log('Источник:', source);
console.log('Назначение:', dest);

try {
    if (!fs.existsSync(source)) {
        console.error('ОШИБКА: Файл-источник не найден:', source);
        process.exit(1);
    }
    
    const content = fs.readFileSync(source, 'utf8');
    const parsed = JSON.parse(content);
    
    console.log('✓ Файл прочитан успешно');
    console.log('✓ Первая секция:', parsed.children[0].title);
    console.log('✓ Всего секций:', parsed.children.length);
    
    fs.writeFileSync(dest, content, 'utf8');
    console.log('✓ Файл скопирован успешно!');
    console.log('✓ Путь:', dest);
    
} catch (error) {
    console.error('✗ Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
}
