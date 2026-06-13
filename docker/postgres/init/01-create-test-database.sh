#!/bin/sh
set -eu

case "$POSTGRES_TEST_DB" in
  ''|*[!a-zA-Z0-9_]*)
    echo "POSTGRES_TEST_DB must contain only letters, numbers, and underscores" >&2
    exit 1
    ;;
esac

if [ "$POSTGRES_TEST_DB" = "$POSTGRES_DB" ]; then
  echo "POSTGRES_TEST_DB must differ from POSTGRES_DB" >&2
  exit 1
fi

psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set test_database="$POSTGRES_TEST_DB" <<'SQL'
SELECT format('CREATE DATABASE %I', :'test_database')
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = :'test_database'
)\gexec
SQL
