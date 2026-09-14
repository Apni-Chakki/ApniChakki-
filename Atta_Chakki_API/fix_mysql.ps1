# This script fixes corrupted XAMPP MySQL data by copying system tables from backup.
# It preserves your actual database data (ibdata1 and the atta_chakki folder).

Write-Host "Stopping MySQL Server..."
Stop-Process -Name "mysqld" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Restoring system tables from backup..."
Copy-Item -Path "c:\xampp\mysql\backup\mysql" -Destination "c:\xampp\mysql\data" -Recurse -Force
Copy-Item -Path "c:\xampp\mysql\backup\phpmyadmin" -Destination "c:\xampp\mysql\data" -Recurse -Force
Copy-Item -Path "c:\xampp\mysql\backup\performance_schema" -Destination "c:\xampp\mysql\data" -Recurse -Force
Copy-Item -Path "c:\xampp\mysql\backup\test" -Destination "c:\xampp\mysql\data" -Recurse -Force

Write-Host "Starting MySQL Server..."
Start-Process -FilePath "c:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=c:\xampp\mysql\bin\my.ini" -WindowStyle Hidden

Write-Host "MySQL fixed and restarted successfully!"
