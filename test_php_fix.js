const fs = require('fs');

const phpPath = 'c:/Users/sb850/Desktop/Apni Chakki/Atta_Chakki_API/controllers/orders/track_order.php';
let code = fs.readFileSync(phpPath, 'utf8');

if (!code.includes('logged_in_user_id')) {
    code = code.replace(
        'try {\r\n',
        'try {\r\n     = isset([\'user_id\']) ? intval([\'user_id\']) : 0;\r\n    if ( <= 0) {\r\n        echo json_encode(["success" => false, "message" => "Unauthorized access."]);\r\n        exit;\r\n    }\r\n\r\n'
    );
    code = code.replace(
        'try {\n',
        'try {\n     = isset([\'user_id\']) ? intval([\'user_id\']) : 0;\n    if ( <= 0) {\n        echo json_encode(["success" => false, "message" => "Unauthorized access."]);\n        exit;\n    }\n\n'
    );
    
    code = code.replace(
        /"SELECT \* FROM orders WHERE id = \?"/g,
        '"SELECT * FROM orders WHERE id = ? AND user_id = ?"'
    );
    
    code = code.replace(
        /\->bind_param\("i", \\);/g,
        '->bind_param("ii", , );'
    );
    
    code = code.replace(
        /\ = \\['id'\];/g,
        ' = [\'id\'];\n                if ( != ) continue;'
    );
    
    fs.writeFileSync(phpPath, code);
    console.log('Fixed PHP');
} else {
    console.log('Already fixed PHP');
}
