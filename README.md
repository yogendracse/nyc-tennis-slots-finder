# NYC Tennis Slots Finder

Find available tennis courts across NYC parks in one place.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Python, PostgreSQL
- ETL: Python (pandas, SQLAlchemy)

## Features

- Interactive map showing all tennis courts in NYC
- Real-time availability data from NYC Parks
- Filter by time preference (Morning, Afternoon, Evening)
- Filter by court type (Hard, Clay)
- Direct links to reserve available slots

## Data Pipeline

The application uses a three-layer data architecture:

1. Raw Layer: CSV files from NYC Parks website
2. Staging Layer: Direct copy of CSV data in PostgreSQL
3. Data Warehouse (DWH): Processed data with timestamps and constraints

### ETL Process

1. Courts Data (One-time load):
   - Load `nyc_tennis_courts.csv` into staging
   - Merge into DWH with court types and timestamps

2. Availability Data (Periodic updates):
   - Download availability CSVs
   - Register files in `raw_files.file_registry`
   - Load into staging with file references
   - Merge into DWH with timestamps

### Data Validation & Cleanup

1. Court Data Validation:
   - Coordinate validation (lat/lon within valid ranges)
   - Court type validation (Hard/Clay)
   - Duplicate court ID prevention
   - Required field checks

2. Availability Data Validation:
   - Future date validation
   - Time format validation
   - Required field checks
   - Foreign key constraints

3. Automated Cleanup:
   - Expired availability slot removal
   - Old processed file cleanup
   - Failed file record cleanup
   - Physical file cleanup

## Development Setup

1. Install dependencies:
   ```bash
   # Python dependencies
   pip install -r requirements.txt
   pip install -r requirements-test.txt  # For testing

   # Node.js dependencies
   npm install
   ```

2. Set up PostgreSQL database:
   ```bash
   createdb nyc_tennis
   alembic upgrade head
   ```

3. Create `.env` file:
   ```
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nyc_tennis
   ```

4. Run the ETL process:
   ```bash
   python -c "from src.etl.csv_loader import run_courts_etl; run_courts_etl()"
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Testing

The project includes a comprehensive test suite for the ETL pipeline:

1. Run tests:
   ```bash
   python -m pytest tests/ -v
   ```

2. Test Coverage:
   ```bash
   python -m pytest tests/ --cov=src
   ```

The test suite includes:

- Unit tests for courts ETL:
  - Loading data to staging
  - Merging to DWH
  - Handling updates
  - NULL value handling
  - Data validation
  - Coordinate validation
  - Court type validation

- Unit tests for availability ETL:
  - File registration
  - Loading to staging
  - Merging to DWH
  - Foreign key constraints
  - Unique constraints
  - Date/time validation
  - File cleanup

- Error handling tests:
  - Invalid CSV formats
  - Invalid data values
  - Transaction rollbacks
  - Cleanup processes

The tests use a separate test database (`nyc_tennis_test`) to avoid affecting production data.

## License

MIT
