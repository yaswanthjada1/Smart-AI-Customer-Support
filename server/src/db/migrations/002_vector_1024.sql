-- Migration: 002_vector_1024.sql
-- Description: Standardize document_chunks embedding to vector(1024)

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    ) THEN
        BEGIN
            ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1024);
        EXCEPTION
            WHEN OTHERS THEN
                -- If existing vectors have incompatible dimensions, reset chunks to allow type migration
                DELETE FROM document_chunks;
                ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1024);
        END;
    END IF;
END $$;
