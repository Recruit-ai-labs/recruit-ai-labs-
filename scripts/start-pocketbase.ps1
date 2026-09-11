$projectRoot = Split-Path -Parent $PSScriptRoot
$pbExecutable = Join-Path $projectRoot '.pocketbase/pocketbase.exe'
$pbData = Join-Path $projectRoot '.pocketbase/pb_data'
$pbHooks = Join-Path $projectRoot 'pb_hooks'
$pbMigrations = Join-Path $projectRoot 'pb_migrations'
& $pbExecutable serve --http=127.0.0.1:8090 --dir $pbData --hooksDir $pbHooks --migrationsDir $pbMigrations
