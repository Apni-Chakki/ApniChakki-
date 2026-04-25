const fs = require('fs');
const file = 'src/components/admin/DigitalKhata.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove static categories maps
content = content.replace(/\/\/ Must match your MySQL ENUM exactly for the API[\s\S]*?const EXPENSE_CATEGORIES_DISPLAY = Object\.keys\(EXPENSE_CATEGORIES_DB_MAP\);\n\n/, '');

// Fix fetchExpenses data map
content = content.replace(
  /category: Object\.keys\(EXPENSE_CATEGORIES_DB_MAP\)\.find\(k => EXPENSE_CATEGORIES_DB_MAP\[k\] === record\.category\) \|\| record\.category,/,
  'category: record.category || "Uncategorized",'
);

// Add dynamic categories array derivation
content = content.replace(
  /const getPeriodLabel = \(\) => \{/,
  "const dynamicCategories = Array.from(new Set(expenses.map(e => e.category))).filter(Boolean);\n\n  const getPeriodLabel = () => {"
);

// Fix handleAddExpense payload
content = content.replace(
  /category: EXPENSE_CATEGORIES_DB_MAP\[category\], \/\/ Send ENUM format/,
  'category: category.trim(), // Send user-typed string directly'
);

// Replace Select with Input + Datalist
const oldSelect =               <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES_DISPLAY.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>;

const newSelect =               <div className="relative">
                <Input 
                  id="category"
                  placeholder="Type or select a category..." 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  list="category-options"
                  disabled={isSaving}
                  autoComplete="off"
                />
                <datalist id="category-options">
                  {dynamicCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                  {dynamicCategories.length === 0 && (
                    <>
                      <option value="Wheat Bags" />
                      <option value="Rice Bags" />
                      <option value="Utility Bills" />
                      <option value="Maintenance" />
                      <option value="Miscellaneous" />
                    </>
                  )}
                </datalist>
              </div>;

content = content.replace(oldSelect, newSelect);

fs.writeFileSync(file, content);
