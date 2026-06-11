ALTER TABLE streaming_services
ADD COLUMN motn_service_id TEXT;

ALTER TABLE title_services
ADD COLUMN external_url TEXT;

ALTER TABLE title_services
ADD COLUMN external_url_source TEXT;

ALTER TABLE title_services
ADD COLUMN external_url_synced_at TEXT;