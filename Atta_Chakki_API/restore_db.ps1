Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Remove-Item -Path "c:\xampp\mysql\data\*" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Copy-Item -Path "c:\xampp\mysql\backup\*" -Destination "c:\xampp\mysql\data\" -Recurse -Force
Start-Process -FilePath "c:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=c:\xampp\mysql\bin\my.ini" -WindowStyle Hidden
Start-Sleep -Seconds 5

$mysql = "c:\xampp\mysql\bin\mysql.exe"
& $mysql -u root -e "CREATE DATABASE IF NOT EXISTS atta_chakki;"
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\database_complete.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\delivery_tracking_migration.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\order_scheduling_migration.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\payment_migration.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\rental_migration.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"C:\Users\sb850\OneDrive\Desktop\G3 Apni Chakki\G3 Apni Chakki Code\tracking_tokens_migration.sql`""
& cmd.exe /c "$mysql -u root atta_chakki < `"c:\xampp\htdocs\Atta_Chakki_API\migrations\00_add_indexes.sql`""

php "c:\xampp\htdocs\Atta_Chakki_API\migrations\migrate_db.php"

Write-Host "Database restored and migrated successfully."
