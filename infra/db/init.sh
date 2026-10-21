
#!/usr/bin/env bash

# Stop script execution if an error occurs.
set -Eeuo pipefail

# ==========================================
# CONFIGURATION
# ==========================================

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
SERVER="sqlserver,1433"

# SQLCMDPASSWORD prevents passing the SA password
# as a command-line argument.
export SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:?Missing SA password}"

# Validate the environment variables required
# by the security initialization script.
: "${CAMUNDA_DB_PASSWORD:?Missing Camunda password}"
: "${BUSINESS_DB_PASSWORD:?Missing Business password}"
: "${LIQUIBASE_DB_PASSWORD:?Missing Liquibase password}"

# ==========================================
# WAIT FOR SQL SERVER
# ==========================================

echo "Waiting for SQL Server..."

READY=false

for attempt in $(seq 1 60); do

  if "$SQLCMD" \
      -S "$SERVER" \
      -U sa \
      -C \
      -l 3 \
      -Q "SELECT 1" \
      > /dev/null 2>&1; then

    READY=true
    break
  fi

  echo "SQL Server not ready ($attempt/60)"
  sleep 2

done

if [ "$READY" != "true" ]; then
  echo "ERROR: SQL Server is unavailable."
  exit 1
fi

echo "SQL Server is ready."

# ==========================================
# EXECUTE SQL SCRIPTS
# ==========================================

echo "Starting database initialization..."

for file in /scripts/*.sql; do

  if [ ! -f "$file" ]; then
    echo "ERROR: No SQL scripts found."
    exit 1
  fi

  echo "Executing: $(basename "$file")"

  if [[ "$(basename "$file")" == "03-create-security.sql" ]]; then

    # This script requires the passwords
    # for the three database logins.

    "$SQLCMD" \
      -S "$SERVER" \
      -U sa \
      -C \
      -b \
      -r 1 \
      -v \
        "CAMUNDA_DB_PASSWORD=$CAMUNDA_DB_PASSWORD" \
        "BUSINESS_DB_PASSWORD=$BUSINESS_DB_PASSWORD" \
        "LIQUIBASE_DB_PASSWORD=$LIQUIBASE_DB_PASSWORD" \
      -i "$file"

  else

    # Scripts responsible for creating
    # the database and its schemas.

    "$SQLCMD" \
      -S "$SERVER" \
      -U sa \
      -C \
      -b \
      -r 1 \
      -i "$file"

  fi

  echo "Completed: $(basename "$file")"

done

# ==========================================
# FINISH
# ==========================================

echo "======================================="
echo "Database initialization completed."
echo "======================================="
