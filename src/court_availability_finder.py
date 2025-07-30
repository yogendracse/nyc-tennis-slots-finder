from bs4 import BeautifulSoup
import requests
import pandas as pd
from datetime import datetime, timedelta
import os
from pathlib import Path

# Constants
BASE_URL = "https://www.nycgovparks.org/tennisreservation"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "court_availability", "raw_files")

def get_court_id_from_url(url: str) -> str:
    """Extract court ID from facility URL."""
    return url.split('/')[-1]

def parse_availability_table(html: str) -> list[dict]:
    """Parse availability table from HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table', class_='table')
    if not table:
        return []
    
    availability = []
    
    # Get court names from header
    headers = table.find_all('th')
    court_names = [h.text.strip() for h in headers[1:]]  # Skip 'Time' column
    
    # Parse rows
    for row in table.find_all('tr')[1:]:  # Skip header row
        cells = row.find_all(['td', 'th'])
        if not cells:
            continue
        
        time = cells[0].text.strip()
        
        # Process each court's availability
        for i, cell in enumerate(cells[1:], 0):
            court = court_names[i]
            link = cell.find('a')
            
            if link and 'Reserve this time' in link.text:
                status = 'Reserve this time'
                reservation_link = link['href']
            else:
                status = 'Not available'
                reservation_link = None
            
            availability.append({
                'time': time,
                'court': court,
                'status': status,
                'reservation_link': reservation_link
            })
    
    return availability

def get_availability_data(court_id: str, date: str) -> list[dict]:
    """Get availability data for a specific court and date."""
    url = f"{BASE_URL}/facility/{court_id}"
    response = requests.get(url)
    
    availability = parse_availability_table(response.text)
    
    # Add court_id and date to each record
    for record in availability:
        record['court_id'] = str(court_id)  # Ensure court_id is string
        record['date'] = date
    
    return availability

def save_availability_data(data: list[dict], output_dir: str) -> str:
    """Save availability data to CSV file."""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Ensure court_id is string
    df['court_id'] = df['court_id'].astype(str)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"court_availability_{timestamp}.csv"
    file_path = os.path.join(output_dir, filename)
    
    # Save to CSV
    df.to_csv(file_path, index=False)
    return file_path

def main() -> str:
    """Main function to fetch and save availability data."""
    # Get tomorrow's date
    tomorrow = datetime.now() + timedelta(days=1)
    date_str = tomorrow.strftime('%Y-%m-%d')
    
    # Get court IDs from CSV
    courts_file = os.path.join(os.path.dirname(__file__), "..", "nyc_tennis_courts.csv")
    courts_df = pd.read_csv(courts_file)
    
    # Fetch availability for each court
    all_availability = []
    for court_id in courts_df['court_id']:
        try:
            availability = get_availability_data(str(court_id), date_str)
            all_availability.extend(availability)
        except Exception as e:
            print(f"Error fetching data for court {court_id}: {str(e)}")
    
    # Save data
    if all_availability:
        return save_availability_data(all_availability, OUTPUT_DIR)
    return ""

if __name__ == "__main__":
    main()