-- Runs once when the Docker volume is first created.
-- The application schema itself is created by `npm run db:migrate`, not here.
CREATE DATABASE inquirydesk_test;
