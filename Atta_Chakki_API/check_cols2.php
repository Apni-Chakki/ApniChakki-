<?php
require 'c:\Users\sb850\Desktop\Apni Chakki\Atta_Chakki_API\config\connect.php'; 
$res = $conn->query("SHOW COLUMNS FROM payments");
while($row = $res->fetch_assoc()) {
    echo $row['Field'] . "\n";
}
?>
