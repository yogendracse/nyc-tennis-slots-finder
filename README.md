# NYC Tennis Slots Finder

A web application that helps you find available tennis court slots across NYC parks in one place.

## Features

- 🎾 Real-time availability checking for NYC public tennis courts
- 📅 Date-based slot searching
- 🗺️ Interactive map showing all tennis court locations
- 📊 Time-based slot categorization (Morning/Afternoon/Evening)
- 🔄 Cache system for quick data retrieval
- 📱 Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Map**: OpenStreetMap with react-leaflet
- **Data Fetching**: Python with BeautifulSoup4
- **Styling**: Tailwind CSS, HeadlessUI
- **Date Handling**: date-fns
- **Icons**: Heroicons

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nyc-tennis-slots-finder.git
   cd nyc-tennis-slots-finder
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env.local` file in the root directory:
   ```env
   NODE_ENV=development
   ```

## Running Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Updates

The application uses two CSV files:
- `nyc_tennis_courts.csv`: Static data about tennis court locations (included in repo)
- `nyc_tennis_court_availability.csv`: Dynamic availability data (generated when searching)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- Rate limiting implemented for API routes
- Security headers configured
- Input validation and sanitization
- Error handling and logging
- CORS protection

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- NYC Parks Department for providing the tennis court reservation system
- OpenStreetMap contributors for map data
