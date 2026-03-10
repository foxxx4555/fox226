import re
import os

def find_duplicates(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    keys = {}
    duplicates = []
    
    # Simple regex to catch keys at the start of lines (indented)
    # e.g., "    key: 'value'," or "    key: \"value\","
    key_pattern = re.compile(r'^\s*([a-zA-Z0-9_]+)\s*:')
    
    for i, line in enumerate(lines):
        match = key_pattern.match(line)
        if match:
            key = match.group(1)
            if key in keys:
                duplicates.append((key, keys[key], i + 1))
            else:
                keys[key] = i + 1
    
    return duplicates

ar_path = r'd:\Fox3-main\src\i18n\ar.ts'
en_path = r'd:\Fox3-main\src\i18n\en.ts'

print("--- Arabic Duplicates ---")
ar_dupes = find_duplicates(ar_path)
for key, first, second in ar_dupes:
    print(f"Duplicate key '{key}' found at lines {first} and {second}")

print("\n--- English Duplicates ---")
en_dupes = find_duplicates(en_path)
for key, first, second in en_dupes:
    print(f"Duplicate key '{key}' found at lines {first} and {second}")
