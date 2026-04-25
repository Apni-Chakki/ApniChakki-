const fs = require('fs');
const file = 'Atta Chakki Frontend/src/components/admin/OrdersRecord.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/duration-200"[\s]*<select/, 'duration-200"\n                />\n              </div>\n              \n              <select');
fs.writeFileSync(file, content);
