const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'customer', 'TrackOrder.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update to restrict to user
content = content.replace(/<Card className="p-3 mb-12 shadow-md border/g, `{!user ? (
          <Card className="p-8 text-center bg-card shadow-md border-border rounded-3xl max-w-2xl mx-auto">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-3">{t('Login Required')}</h3>
            <p className="text-muted-foreground text-lg mb-6">
              {t('Please login to track your placed orders.')}
            </p>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-12 rounded-xl text-lg"
              onClick={() => window.location.href = '/login'}
            >
              {t('Go to Login')}
            </Button>
          </Card>
        ) : (<Card className="p-3 mb-12 shadow-md border`);

content = content.replace(/<\/Card>\s*\{notFound && \(/g, `</Card>\n        )} \n\n        {notFound && (`);

// Clean up styles
content = content.replace(/bg-amber-600/g, 'bg-primary');
content = content.replace(/text-amber-600/g, 'text-primary');
content = content.replace(/border-amber-600/g, 'border-primary');
content = content.replace(/bg-amber-500/g, 'bg-primary/80');
content = content.replace(/border-amber-500/g, 'border-primary');
content = content.replace(/text-amber-800/g, 'text-foreground');
content = content.replace(/text-amber-700/g, 'text-primary');
content = content.replace(/text-amber-950/g, 'text-foreground');
content = content.replace(/border-amber-200/g, 'border-primary/30');
content = content.replace(/bg-amber-100/g, 'bg-primary/10');
content = content.replace(/text-amber-900\/40/g, 'text-muted-foreground');
content = content.replace(/text-amber-900\/60/g, 'text-muted-foreground');
content = content.replace(/text-amber-900\/80/g, 'text-foreground');
content = content.replace(/text-amber-900/g, 'text-primary');
content = content.replace(/bg-amber-50\/50/g, 'bg-muted/30');
content = content.replace(/bg-amber-50/g, 'bg-muted/50');
content = content.replace(/border-amber-100\/50/g, 'border-border');
content = content.replace(/border-amber-100/g, 'border-border');
content = content.replace(/border-amber-50\/50/g, 'border-border');
content = content.replace(/border-amber-50/g, 'border-border');
content = content.replace(/from-amber-400 to-amber-600/g, 'from-primary/80 to-primary');
content = content.replace(/from-amber-700 to-amber-600/g, 'from-primary to-primary/90');
content = content.replace(/shadow-amber-900\/5/g, 'shadow-sm');
content = content.replace(/bg-\[\#fcfaf7\]/g, 'bg-card');
content = content.replace(/bg-emerald-50 text-emerald-600/g, 'bg-primary/10 text-primary');
content = content.replace(/span className="ml-1 text-\[10px\] bg-emerald-100 text-emerald-700/g, 'span className="ml-1 text-[10px] bg-primary/20 text-primary');
content = content.replace(/ring-emerald-200/g, 'ring-primary/30');
content = content.replace(/text-amber-400/g, 'text-primary');

fs.writeFileSync(filePath, content);
console.log('Done mapping themes in TrackOrder.jsx and enforced login.');
