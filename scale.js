const fs = require('fs');
const file = 'Atta Chakki Frontend/src/components/admin/OrdersRecord.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('left-3.5 top-1/2 -translate-y-1/2 h-4 w-4', 'left-4 top-1/2 -translate-y-1/2 h-5 w-5');
content = content.replace('pl-10 text-sm h-10 w-full', 'pl-11 text-base h-12 w-full');
fs.writeFileSync(file, content);
