const fs = require('fs');
const file = 'src/components/admin/OrdersRecord.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<Input[\s\S]*?className="pl-12 text-base h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all transition-colors duration-200"[\s\S]*?className="h-12 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" style={{ width: "150px", flexShrink: 0 }}/;

const replacement = <Input
                    placeholder="Search by name, phone, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-14 text-base h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all transition-colors duration-200"
                  />
                </div>
                
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-12 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" style={{ width: "150px", flexShrink: 0 }};

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
