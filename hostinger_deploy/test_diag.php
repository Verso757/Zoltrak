<?php
/**
 * Test de diagnóstico y verificación de entorno PHP & MySQL
 * Dominio: https://zoltrak.websolutionsgarcia.com/test_diag.php
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Diagnóstico del Servidor - RutaControl</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
        .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
        .ok { color: #4ade80; font-weight: bold; }
        .err { color: #f87171; font-weight: bold; }
        pre { background: #020617; padding: 1rem; border-radius: 8px; overflow-x: auto; color: #38bdf8; }
    </style>
</head>
<body>
    <h1>🔍 Diagnóstico de Servidor Hostinger - RutaControl</h1>
    
    <div class="card">
        <h2>1. Versión de PHP</h2>
        <p>PHP Version: <span class="ok"><?= phpversion() ?></span></p>
        <p>PDO Extension: <?= extension_loaded('pdo') ? '<span class="ok">Instalado ✅</span>' : '<span class="err">No Instalado ❌</span>' ?></p>
        <p>PDO MySQL Driver: <?= extension_loaded('pdo_mysql') ? '<span class="ok">Instalado ✅</span>' : '<span class="err">No Instalado ❌</span>' ?></p>
    </div>

    <div class="card">
        <h2>2. Prueba de Conexión a Base de Datos</h2>
        <?php
        require_once __DIR__ . '/config/db.php';
        
        $actionMsg = "";
        if (isset($_POST['action']) && $_POST['action'] === 'repair_tables') {
            try {
                $pdo = getDBConnection();
                $sqlCreate = file_get_contents(__DIR__ . '/schema.sql');
                // Quitar sentencias USE si existen
                $sqlCreate = preg_replace('/USE\s+`?[a-zA-Z0-9_]+`?;/i', '', $sqlCreate);
                $pdo->exec($sqlCreate);
                $actionMsg = "<div class='ok' style='padding:1rem; background:#064e3b; border-radius:8px; margin-bottom:1rem;'>✅ ¡Tablas creadas y actualizadas exitosamente en MySQL!</div>";
            } catch (Exception $e) {
                $actionMsg = "<div class='err' style='padding:1rem; background:#7f1d1d; border-radius:8px; margin-bottom:1rem;'>❌ Error al crear tablas: " . htmlspecialchars($e->getMessage()) . "</div>";
            }
        }

        echo $actionMsg;

        try {
            $pdo = getDBConnection();
            echo "<p class='ok'>✅ Conexión exitosa a la base de datos MySQL <code>" . DB_NAME . "</code> con el usuario <code>" . DB_USER . "</code>.</p>";
            
            // Comprobar tablas
            $tables = ['drivers', 'devices', 'telemetry_points', 'driver_cash_shifts', 'ticket_sales', 'fuel_refuels', 'apk_releases', 'fleet_settings', 'route_stops'];
            $missingTables = 0;
            echo "<h3>Verificación de Tablas:</h3><ul style='line-height: 1.8;'>";
            foreach ($tables as $t) {
                try {
                    $q = $pdo->query("SELECT COUNT(*) as c FROM $t");
                    $cnt = $q->fetch()['c'];
                    echo "<li>Tabla <code>$t</code>: <span class='ok'>Existe ($cnt registros) ✅</span></li>";
                } catch (Exception $e) {
                    $missingTables++;
                    echo "<li>Tabla <code>$t</code>: <span class='err'>FALTA ❌</span></li>";
                }
            }
            echo "</ul>";

            if ($missingTables > 0) {
                echo "
                <form method='POST' style='margin-top:1.5rem;'>
                    <input type='hidden' name='action' value='repair_tables'>
                    <button type='submit' style='background:#4f46e5; color:white; font-weight:bold; padding:0.75rem 1.5rem; border:none; border-radius:8px; cursor:pointer; font-size:14px;'>
                        🛠️ Crear / Reparar las $missingTables Tablas Faltantes en 1 Clic
                    </button>
                </form>
                ";
            }
        } catch (Exception $e) {
            echo "<p class='err'>❌ Error conectando a MySQL: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        ?>
    </div>

    <div class="card">
        <h2>3. Permisos de Directorio</h2>
        <p>Directorio de Cargas (uploads/apks): 
            <?php
            $apkDir = __DIR__ . '/uploads/apks';
            if (!is_dir($apkDir)) {
                @mkdir($apkDir, 0755, true);
            }
            if (is_writable($apkDir)) {
                echo "<span class='ok'>Escribible ✅</span>";
            } else {
                echo "<span class='err'>Sin permisos de escritura ❌</span>";
            }
            ?>
        </p>
    </div>
</body>
</html>
