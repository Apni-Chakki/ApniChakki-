<?php
/**
 * Remove CORS includes from all controller files
 * CORS should only be included in root proxy files, not controllers
 */

function removeCorsfromControllers($directory) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    $removed = 0;
    foreach ($files as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $path = $file->getPathname();
            $content = file_get_contents($path);
            
            // Check if file has CORS require
            if (preg_match('/require_once\s+__DIR__\s*\.\s*[\'"]\/\.\.\/.*?cors\.php[\'"]\s*;?\s*\n/i', $content)) {
                // Remove the CORS require line
                $newContent = preg_replace('/require_once\s+__DIR__\s*\.\s*[\'"]\/\.\.\/.*?cors\.php[\'"]\s*;?\s*\n/i', '', $content);
                file_put_contents($path, $newContent);
                $fileName = basename($path);
                echo "✓ Removed CORS from $fileName\n";
                $removed++;
            }
        }
    }
    
    return $removed;
}

$controllersDir = __DIR__ . '/controllers';
echo "Removing CORS includes from controller files...\n\n";
$count = removeCorsfromControllers($controllersDir);
echo "\n✅ Removed CORS includes from $count controller files\n";
?>