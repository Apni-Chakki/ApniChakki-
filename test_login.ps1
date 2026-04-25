$body = '{"phone":"0300-1234567","password":"customer123","login_type":"customer"}'
try {
    $r = Invoke-WebRequest -Uri 'http://localhost/atta_chakki_api/login.php' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Host "HTTP Status: $($r.StatusCode)"
    Write-Host "Response: $($r.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "HTTP Status: $statusCode"
    Write-Host "Response: $responseBody"
}
