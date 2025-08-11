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

## Branching Strategy

The project follows a three-tier branching strategy:

1. Development (`dev`)
   - All feature branches merge into `dev` first
   - Feature branches should follow naming: `feature/description`
   - Bug fix branches should follow naming: `fix/description`
   - Initial testing and code review happens here

2. Quality Assurance (`qa`)
   - Changes are promoted from `dev` to `qa` using `promote/dev-to-qa` branch
   - QA team performs thorough testing
   - No direct merges to `qa` except through promotion

3. Production (`main`)
   - Only tested and approved code from `qa` gets merged to `main`
   - Represents production-ready code
   - Protected branch - requires approvals

### Branch Naming Conventions
- Features: `feature/description`
- Bug Fixes: `fix/description`
- Promotions: `promote/source-to-target`

### Workflow Example
```
feature/add-map → dev → qa → main
       ↑          ↑    ↑     ↑
    Development   |    |    Production
                  |    |
                  |   QA Testing
                  |
              Integration Testing
```

## 🚨 **Deployment Process**

**IMPORTANT:** All deployments must follow the proper PR process with CI checks!

### Required Steps:
1. **Feature Branch** → **PR to Dev** (with CI checks)
2. **Dev** → **PR to QA** (with CI checks)  
3. **QA** → **PR to Main** (with CI checks)
4. **Main** → **Production Deployment**

### ⚠️ **Never Skip:**
- Pull Requests
- CI/CD checks
- Code reviews
- Branch protection rules

**📖 [Full Deployment Workflow](DEPLOYMENT_WORKFLOW.md)**

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

### Test Data Handling

The test suite uses a separate database (`nyc_tennis_test`) to prevent test data from affecting production data. Important notes:

1. Test Data Isolation:
   - All tests should use the test database defined in `tests/conftest.py`
   - Never run tests against the production database
   - Test data should be clearly marked (e.g., "Test Park", "123 Test St")

2. Data Cleanup:
   If test data appears in production, use the cleanup script:
   ```bash
   ./scripts/fix_court_data.sh
   ```
   This script will:
   - Remove any test data from both staging and production tables
   - Reload the correct court data from `nyc_tennis_courts.csv`

3. Data Validation:
   - The ETL process validates court data before loading
   - Test data patterns are detected and rejected in production
   - Court IDs and coordinates are validated for accuracy

The tests use a separate test database (`nyc_tennis_test`) to avoid affecting production data.

## License

MIT
