const fs = require('fs');
const file = 'Atta Chakki Frontend/src/components/admin/OrdersRecord.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the Search box wrapper
content = content.replace(
  '<div className="relative w-full flex-1 group">',
  '<div className="relative group" style={{ flex: "1 1 auto", minWidth: "250px" }}>'
);

// Replace the select class
content = content.replace(
  'className="flex-shrink-0 h-12 w-full sm:w-56 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"',
  'className="h-12 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" style={{ width: "150px", flexShrink: 0 }}'
);

fs.writeFileSync(file, content);
