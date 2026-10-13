-- =====================================================================================
-- Esquema de la base de datos — Práctica IA
-- =====================================================================================
--
-- Script SQL equivalente a aplicar todas las migraciones de Alembic (de <base> a head)
-- sobre una base de datos PostgreSQL 16 vacía.
--
-- ARCHIVO GENERADO: no se edita a mano. La fuente de verdad son las migraciones de
-- migrations/versions/. Tras añadir o cambiar una migración, regenéralo (desde backend/):
--
--     uv run python -m migrations.export_schema
--
-- Un test (tests/migrations/test_schema_sql.py) falla si este archivo no está sincronizado.
--
-- Migraciones incluidas (en orden):
--   1. 8a4f785ce6ed  crea tabla users
--   2. 87098a3c027a  crea tabla student_profiles
--   3. 7656980f4a20  crea tabla lessons
--   4. 61d6a6db01cc  anade public_id uuid a users y lessons
--   5. 6dd94e633663  crea tablas de material de refuerzo
--
-- Tablas:
--   users                    Docentes y estudiantes (rol docente | estudiante).
--   student_profiles         Datos del estudiante: docente asignado, idioma natal y nivel MCER.
--   lessons                  Clases: fecha, tema, contexto, palabras clave, notas y PDF.
--   reinforcement_materials  Material de refuerzo de una clase (máx. 1) y la petición al LLM.
--   material_submissions     Único intento del estudiante para un material (máx. 1).
--   alembic_version          Control de versiones de Alembic.
--
-- Convenciones:
--   - "id" (SERIAL) es interno y nunca se expone en la API; "public_id" (UUID v4 aleatorio)
--     es el identificador público.
--   - Las reglas de integridad del negocio viven también en la BD (CHECK y UNIQUE):
--     un material por clase, un intento por material, 1-15 ejercicios, score 0-100...
--   - Todas las fechas son TIMESTAMP WITH TIME ZONE.
-- =====================================================================================

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 8a4f785ce6ed

CREATE TYPE user_role AS ENUM ('docente', 'estudiante');

CREATE TABLE users (
    id SERIAL NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (email)
);

INSERT INTO alembic_version (version_num) VALUES ('8a4f785ce6ed') RETURNING alembic_version.version_num;

-- Running upgrade 8a4f785ce6ed -> 87098a3c027a

CREATE TYPE student_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

CREATE TABLE student_profiles (
    user_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    native_language VARCHAR(2) NOT NULL,
    level student_level NOT NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT native_language_iso_639_1 CHECK (native_language ~ '^[a-z]{2}$'),
    FOREIGN KEY(teacher_id) REFERENCES users (id),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_student_profiles_teacher_id ON student_profiles (teacher_id);

UPDATE alembic_version SET version_num='87098a3c027a' WHERE alembic_version.version_num = '8a4f785ce6ed';

-- Running upgrade 87098a3c027a -> 7656980f4a20

CREATE TABLE lessons (
    id SERIAL NOT NULL,
    student_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    topic VARCHAR(200) NOT NULL,
    context TEXT NOT NULL,
    keywords VARCHAR(50)[] NOT NULL,
    notes TEXT,
    pdf_filename VARCHAR(255) NOT NULL,
    pdf_path VARCHAR(500) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT keywords_not_empty CHECK (cardinality(keywords) >= 1),
    CONSTRAINT duration_minutes_positive CHECK (duration_minutes > 0),
    FOREIGN KEY(student_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY(teacher_id) REFERENCES users (id)
);

CREATE INDEX ix_lessons_student_id_date ON lessons (student_id, date);

CREATE INDEX ix_lessons_teacher_id ON lessons (teacher_id);

UPDATE alembic_version SET version_num='7656980f4a20' WHERE alembic_version.version_num = '87098a3c027a';

-- Running upgrade 7656980f4a20 -> 61d6a6db01cc

ALTER TABLE lessons ADD COLUMN public_id UUID DEFAULT gen_random_uuid() NOT NULL;

ALTER TABLE lessons ADD CONSTRAINT uq_lessons_public_id UNIQUE (public_id);

ALTER TABLE users ADD COLUMN public_id UUID DEFAULT gen_random_uuid() NOT NULL;

ALTER TABLE users ADD CONSTRAINT uq_users_public_id UNIQUE (public_id);

UPDATE alembic_version SET version_num='61d6a6db01cc' WHERE alembic_version.version_num = '7656980f4a20';

-- Running upgrade 61d6a6db01cc -> 6dd94e633663

CREATE TABLE reinforcement_materials (
    id SERIAL NOT NULL,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    lesson_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    exercise_count INTEGER NOT NULL,
    llm_request JSONB NOT NULL,
    content JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT activity_type_supported CHECK (activity_type IN ('complete_sentence')),
    CONSTRAINT exercise_count_range CHECK (exercise_count BETWEEN 1 AND 15),
    FOREIGN KEY(lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
    UNIQUE (lesson_id),
    UNIQUE (public_id)
);

CREATE TABLE material_submissions (
    id SERIAL NOT NULL,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    material_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    answers JSONB NOT NULL,
    correct_count INTEGER NOT NULL,
    incorrect_count INTEGER NOT NULL,
    score NUMERIC(5, 2) NOT NULL,
    recommendations JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT counts_not_negative CHECK (correct_count >= 0 AND incorrect_count >= 0),
    CONSTRAINT score_range CHECK (score BETWEEN 0 AND 100),
    FOREIGN KEY(material_id) REFERENCES reinforcement_materials (id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (material_id),
    UNIQUE (public_id)
);

UPDATE alembic_version SET version_num='6dd94e633663' WHERE alembic_version.version_num = '61d6a6db01cc';

COMMIT;
