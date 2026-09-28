-- Add SKU column to products table if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku TEXT DEFAULT NULL;
    COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit identifier (e.g. OPT-AV-890)';
  END IF;
END
$$;

-- Create a unique partial index so SKU values are unique (but allow multiple NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'products' AND indexname = 'products_sku_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX products_sku_unique_idx
      ON products (sku)
      WHERE sku IS NOT NULL;
  END IF;
END
$$;
