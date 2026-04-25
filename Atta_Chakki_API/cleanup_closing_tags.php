<?php
/**
 * Script to remove closing PHP tags from all API files
 * This prevents JSON response corruption
 */

function removeClosingTags($directory) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    $removed = 0;
    foreach ($files as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $path = $file->getPathname();
            $content = file_get_contents($path);
            
            // Check if file ends with closing tag
            if (preg_match('/\?>\s*$/s', $content)) {
                // Remove closing tag
                $newContent = preg_replace('/\?>\s*$/s', '', $content);
                file_put_contents($path, $newContent);
                echo "✓ " . str_replace(dirname(__FILE__), '', $path) . "\n";
                $removed++;
            }
        }
    }
    
    return $removed;
}

echo "Removing closing PHP tags from all API files...\n\n";
$count = removeClosingTags(__DIR__);
echo "\n✅ Removed closing tags from $count files\n";
