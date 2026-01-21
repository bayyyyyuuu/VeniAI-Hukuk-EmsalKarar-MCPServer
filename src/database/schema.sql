-- Yargıtay Karar Arama Database Schema
-- PostgreSQL 14+

-- Arama sonuçları tablosu
CREATE TABLE IF NOT EXISTS search_results (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  result_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1,
  is_popular BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for search_results
CREATE INDEX IF NOT EXISTS idx_query_hash ON search_results(query_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_at ON search_results(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular ON search_results(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_last_accessed ON search_results(last_accessed DESC);

-- Karar detayları tablosu
CREATE TABLE IF NOT EXISTS decisions (
  id SERIAL PRIMARY KEY,
  search_result_id INTEGER NOT NULL REFERENCES search_results(id) ON DELETE CASCADE,
  sira_no VARCHAR(50),
  daire TEXT,
  esas_no VARCHAR(100),
  karar_no VARCHAR(100),
  karar_tarihi VARCHAR(50),
  icerik TEXT,
  icerik_length INTEGER,
  position_in_results INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for decisions
CREATE INDEX IF NOT EXISTS idx_search_result ON decisions(search_result_id);
CREATE INDEX IF NOT EXISTS idx_esas_karar ON decisions(esas_no, karar_no);
CREATE INDEX IF NOT EXISTS idx_daire ON decisions(daire);
CREATE INDEX IF NOT EXISTS idx_karar_tarihi ON decisions(karar_tarihi);

-- Scraping istatistikleri tablosu
CREATE TABLE IF NOT EXISTS scraping_stats (
  id SERIAL PRIMARY KEY,
  query TEXT,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  source VARCHAR(50),
  result_count INTEGER DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for scraping_stats
CREATE INDEX IF NOT EXISTS idx_stats_scraped_at ON scraping_stats(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_stats_success ON scraping_stats(success);
CREATE INDEX IF NOT EXISTS idx_stats_source ON scraping_stats(source);

-- Popular queries view
CREATE OR REPLACE VIEW popular_queries AS
SELECT 
  query,
  access_count,
  result_count,
  last_accessed,
  scraped_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - scraped_at)) / 3600 AS age_hours
FROM search_results
WHERE is_popular = TRUE OR access_count >= 5
ORDER BY access_count DESC, last_accessed DESC
LIMIT 100;

-- Analytics view
CREATE OR REPLACE VIEW search_analytics AS
SELECT 
  DATE_TRUNC('day', scraped_at) AS date,
  COUNT(*) AS total_searches,
  COUNT(DISTINCT query) AS unique_queries,
  AVG(duration_ms) AS avg_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_searches,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_searches,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate
FROM scraping_stats
GROUP BY DATE_TRUNC('day', scraped_at)
ORDER BY date DESC;

-- Function to update last_accessed and increment access_count
CREATE OR REPLACE FUNCTION update_search_access(p_query_hash VARCHAR(64))
RETURNS VOID AS $$
BEGIN
  UPDATE search_results
  SET 
    last_accessed = CURRENT_TIMESTAMP,
    access_count = access_count + 1,
    is_popular = CASE WHEN access_count + 1 >= 5 THEN TRUE ELSE is_popular END
  WHERE query_hash = p_query_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old records
CREATE OR REPLACE FUNCTION cleanup_old_records(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM search_results
    WHERE 
      last_accessed < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
      AND access_count < 3
      AND is_popular = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE search_results IS 'Stores search queries and their metadata';
COMMENT ON TABLE decisions IS 'Stores individual Yargıtay decision details';
COMMENT ON TABLE scraping_stats IS 'Tracks scraping performance and errors';
COMMENT ON COLUMN search_results.query_hash IS 'MD5 hash of normalized query for fast lookups';
COMMENT ON COLUMN search_results.is_popular IS 'Automatically set to TRUE when access_count >= 5';
COMMENT ON COLUMN decisions.icerik_length IS 'Length of decision content for quick stats';
