<?php
/**
 * One-time setup helper: generates a bcrypt hash for a given password
 * Open this file in browser: http://localhost/boarding-house-cms/php/generate_hash.php?password=yourpassword
 * Then use the hash in phpMyAdmin to create users
 */

$password = $_GET['password'] ?? 'password';
$hash = password_hash($password, PASSWORD_BCRYPT);

header('Content-Type: text/plain');
echo "Password: $password\n";
echo "BCrypt Hash: $hash\n\n";
echo "Verification: " . (password_verify($password, $hash) ? "OK ✓" : "FAILED ✗") . "\n\n";
echo "SQL to create admin:\n";
echo "INSERT INTO users (username, email, password, name, role) VALUES ('admin', 'admin@boardinghouse.com', '$hash', 'System Administrator', 'admin');\n";
echo "\n-- DELETE THIS FILE AFTER SETUP! --";
