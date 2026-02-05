#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертер catalog.md в catalog_taxonomy_full_generated.json
Преобразует данные из формата catalog.md в иерархическую структуру
"""

import json
import re
from pathlib import Path

def transliterate(text):
    """Транслитерация русского текста в slug"""
    translit_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ы': 'Y', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    }

    result = ''.join(translit_map.get(char, char) for char in text)
    result = result.lower().replace('_', '-')
    result = re.sub(r'[^a-z0-9-]', '', result)
    result = re.sub(r'-+', '-', result)
    return result.strip('-')

def format_title(text):
    """Форматирование названия"""
    words = text.split('_')
    return ' '.join(word.capitalize() for word in words)

# Чит catalog.md напрямую как текстовый файл и исправим ошибки
catalog_md_path = r'C:\Users\bazar\OneDrive\Рабочий стол\сайт\Раюоты по сайту\Промт по сайту\Кнопка Каталог товаров и все что связанно с товарами\catalog.md'

with open(catalog_md_path, 'r', encoding='utf-8') as f:
    content = f.read()
    # Исправляем известную ошибку на строке 29
    content = content.replace('"принтованный""с_вышивкой"', '"принтованный", "с_вышивкой"')
    catalog_data = json.loads(content)

# Преобразуем структуру
result = {
    "title": "Каталог товаров",
    "slug": "catalog",
    "children": []
}

# Обрабатываем каждый раздел
for section_key, section_data in catalog_data['catalog'].items():
    section = {
        "title": format_title(section_key),
        "slug": transliterate(section_key),
        "children": []
    }

    # Обрабатываем каждый тип внутри раздела
    for type_key, subtypes in section_data.items():
        type_obj = {
            "title": format_title(type_key),
            "slug": transliterate(type_key),
            "children": []
        }

        # Обрабатываем подтипы
        if isinstance(subtypes, list) and len(subtypes) > 0:
            for subtype in subtypes:
                type_obj["children"].append({
                    "title": format_title(subtype),
                    "slug": transliterate(subtype)
                })

        section["children"].append(type_obj)

    result["children"].append(section)

# Записываем результат
output_path = Path(__file__).parent / 'frontend' / 'js' / 'catalog' / 'catalog_taxonomy_full_generated.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('✓ Файл catalog_taxonomy_full_generated.json успешно создан')
print('Статистика:')
print(f'- Разделов: {len(result["children"])}')
total_types = sum(len(section["children"]) for section in result["children"])
print(f'- Типов: {total_types}')
total_subtypes = sum(
    sum(len(type_obj["children"]) for type_obj in section["children"])
    for section in result["children"]
)
print(f'- Подтипов: {total_subtypes}')