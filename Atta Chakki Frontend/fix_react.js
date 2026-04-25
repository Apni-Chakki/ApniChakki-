const fs = require('fs');
const file = 'src/components/admin/OrdersRecord.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace corrupted search input block
const searchCode = \
                <div className="relative group" style={{ flex: "1 1 auto", minWidth: "250px" }}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-green-600" />
                  <Input
                    placeholder="Search by name, phone, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-14 text-base h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-green-500 focus-visible:border-green-500 shadow-sm transition-all transition-colors duration-200"
                  />
                </div>
                
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-12 items-center cursor-pointer justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ width: "150px", flexShrink: 0 }}
                >\;

const regex = /<div className="relative group"\\s*style=\{\{ flex: "1 1 auto",\\s*minWidth: "250px" \}\}>[\\s\\S]*?(?=<option value="all">)/m;
content = content.replace(regex, searchCode);

fs.writeFileSync(file, content);
