from bs4 import BeautifulSoup
import pandas as pd
import requests
import os
import sys
from pathlib import Path
import time
import logging
from typing import Tuple, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
REQUEST_TIMEOUT = 30  # seconds
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', '.'))
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def create_secure_headers() -> dict:
    return {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nycgovparks.org/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document"
    }

def fetch_court_availability(court_id: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    url = f"https://www.nycgovparks.org/tennisreservation/availability/{court_id}"
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(
                url,
                headers=create_secure_headers(),
                allow_redirects=True,
                timeout=REQUEST_TIMEOUT
            )
            
            if response.url != url:
                logger.warning(f"Redirect detected for court_id {court_id}, skipping.")
                return pd.DataFrame(), pd.DataFrame()

            response.raise_for_status()
            
            # Validate content type
            if 'text/html' not in response.headers.get('Content-Type', ''):
                logger.error(f"Invalid content type for court_id {court_id}")
                return pd.DataFrame(), pd.DataFrame()

            soup = BeautifulSoup(response.text, "html.parser")

            # Basic content validation
            if not soup.find("h1"):
                logger.error(f"Invalid page structure for court_id {court_id}")
                return pd.DataFrame(), pd.DataFrame()

            park_name = soup.find("h1").get_text(strip=True)
            location_details_div = soup.find(id="location_details")
            park_details = location_details_div.get_text(separator="\n", strip=True) if location_details_div else None

            logger.info(f"Processing park: {park_name}")

            courts = pd.DataFrame([{
                "court_id": court_id,
                "park_name": park_name,
                "park_details": park_details
            }])

            court_availability_div = soup.find(id="court-availability")
            if not court_availability_div:
                logger.warning(f"No availability data found for court_id {court_id}")
                return courts, pd.DataFrame()

            tab_links = court_availability_div.find_all("a")
            dates = [a["href"].replace("#", "") for a in tab_links]

            records = []
            tab_content = soup.find("div", class_="tab-content")
            for tab in tab_content.find_all("div", class_="tab-pane"):
                date_id = tab["id"]
                table = tab.find("table")
                if not table:
                    continue
                
                headers = [th.get_text(strip=True) for th in table.find("thead").find_all("th")]
                for row in table.find("tbody").find_all("tr"):
                    time = row.find("td").get_text(strip=True)
                    cells = row.find_all("td")[1:]
                    for i, cell in enumerate(cells):
                        link = None
                        if cell.find("a"):
                            status = cell.find("a").get_text(strip=True)
                            link = cell.find("a")["href"]
                            if link and not link.startswith("http"):
                                link = "https://www.nycgovparks.org/" + link.lstrip("/")
                        else:
                            status = cell.get_text(strip=True)
                        records.append({
                            "court_id": court_id,
                            "date": date_id,
                            "time": time,
                            "court": headers[i+1],
                            "status": status,
                            "reservation_link": link
                        })

            court_availability = pd.DataFrame(records)
            return courts, court_availability

        except requests.RequestException as e:
            logger.error(f"Error fetching court {court_id} (attempt {attempt + 1}/{MAX_RETRIES}): {str(e)}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                return pd.DataFrame(), pd.DataFrame()
        except Exception as e:
            logger.error(f"Unexpected error processing court {court_id}: {str(e)}")
            return pd.DataFrame(), pd.DataFrame()

def main():
    try:
        # Ensure output directory exists
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        master_courts = pd.DataFrame()
        master_availability = pd.DataFrame()

        for court_id in range(1, 14):
            courts, court_availability = fetch_court_availability(str(court_id))
            if not courts.empty:
                master_courts = pd.concat([master_courts, courts], ignore_index=True)
            if not court_availability.empty:
                master_availability = pd.concat([master_availability, court_availability], ignore_index=True)
            
            # Add delay between requests
            time.sleep(1)

        # Save availability data
        availability_path = OUTPUT_DIR / "nyc_tennis_court_availability.csv"
        master_availability.to_csv(availability_path, index=False)
        logger.info(f"Saved availability data to {availability_path}")

        # Courts data is constant, commented out to prevent updates
        # courts_path = OUTPUT_DIR / "nyc_tennis_courts.csv"
        # master_courts.to_csv(courts_path, index=False)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()