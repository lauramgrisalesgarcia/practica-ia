#!/bin/sh
# Crea la base de datos de tests con el mismo usuario (tomado del entorno, nunca escrito aquí).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	CREATE DATABASE ${POSTGRES_DB}_test OWNER "$POSTGRES_USER";
SQL
