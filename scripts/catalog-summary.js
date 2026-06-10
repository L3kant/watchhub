const db = require('../database/db');

function printTitleCounts() {
  const rows = db
    .prepare(`
      SELECT
        media_type,
        COUNT(*) AS count
      FROM media_titles
      GROUP BY media_type
      ORDER BY media_type
    `)
    .all();

  console.log('');
  console.log('Titles by media type:');
  console.table(rows);
}

function printServiceCounts() {
  const rows = db
    .prepare(`
      SELECT
        s.service_name,
        mt.media_type,
        COUNT(*) AS count
      FROM title_services ts
      JOIN streaming_services s
        ON s.service_id = ts.service_id
      JOIN media_titles mt
        ON mt.title_id = ts.title_id
      GROUP BY
        s.service_name,
        mt.media_type
      ORDER BY
        s.service_name,
        mt.media_type
    `)
    .all();

  console.log('');
  console.log('Title availability by service:');
  console.table(rows);
}

function printMultiServiceTitles() {
  const rows = db
    .prepare(`
      SELECT
        mt.title_id,
        mt.display_title,
        mt.media_type,
        COUNT(ts.service_id) AS service_count,
        group_concat(s.service_name, ', ') AS services
      FROM media_titles mt
      JOIN title_services ts
        ON ts.title_id = mt.title_id
      JOIN streaming_services s
        ON s.service_id = ts.service_id
      GROUP BY
        mt.title_id,
        mt.display_title,
        mt.media_type
      HAVING COUNT(ts.service_id) > 1
      ORDER BY
        service_count DESC,
        mt.display_title
      LIMIT 30
    `)
    .all();

  console.log('');
  console.log('Titles available on multiple services:');
  console.table(rows);
}

function main() {
  console.log('Catalog summary');

  printTitleCounts();
  printServiceCounts();
  printMultiServiceTitles();
}

main();