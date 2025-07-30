import pytest
from unittest.mock import patch, MagicMock
from src.court_availability_finder import (
    get_availability_data, save_availability_data,
    get_court_id_from_url, parse_availability_table,
    main
)
from datetime import datetime
import os
import pandas as pd

@pytest.fixture
def mock_response():
    """Create a mock response with sample HTML."""
    mock = MagicMock()
    mock.text = """
    <table class="table table-striped">
        <tr>
            <th>Time</th>
            <th>Court 1</th>
            <th>Court 2</th>
        </tr>
        <tr>
            <td>9:00 a.m.</td>
            <td><a href="https://www.nycgovparks.org/tennisreservation/reserve/123">Reserve this time</a></td>
            <td>Not available</td>
        </tr>
        <tr>
            <td>10:00 a.m.</td>
            <td>Not available</td>
            <td><a href="https://www.nycgovparks.org/tennisreservation/reserve/456">Reserve this time</a></td>
        </tr>
    </table>
    """
    return mock

def test_get_court_id_from_url():
    """Test extracting court ID from URL."""
    url = "https://www.nycgovparks.org/tennisreservation/facility/12"
    assert get_court_id_from_url(url) == "12"

def test_parse_availability_table(mock_response):
    """Test parsing availability table from HTML."""
    availability = parse_availability_table(mock_response.text)
    
    assert len(availability) == 4  # 2 time slots × 2 courts
    assert availability[0]['time'] == '9:00 a.m.'
    assert availability[0]['court'] == 'Court 1'
    assert availability[0]['status'] == 'Reserve this time'
    assert availability[0]['reservation_link'] == 'https://www.nycgovparks.org/tennisreservation/reserve/123'
    
    assert availability[1]['time'] == '9:00 a.m.'
    assert availability[1]['court'] == 'Court 2'
    assert availability[1]['status'] == 'Not available'
    assert availability[1]['reservation_link'] is None

@patch('requests.get')
def test_get_availability_data(mock_get, mock_response):
    """Test fetching availability data."""
    mock_get.return_value = mock_response
    
    data = get_availability_data('12', '2025-08-01')
    
    assert len(data) == 4
    assert all(d['court_id'] == '12' for d in data)
    assert all(d['date'] == '2025-08-01' for d in data)

def test_save_availability_data(tmp_path):
    """Test saving availability data to CSV."""
    data = [
        {
            'court_id': '12',
            'date': '2025-08-01',
            'time': '9:00 a.m.',
            'court': 'Court 1',
            'status': 'Reserve this time',
            'reservation_link': 'https://www.nycgovparks.org/tennisreservation/reserve/123'
        }
    ]
    
    # Create a temporary directory for output
    output_dir = tmp_path / "data" / "court_availability" / "raw_files"
    output_dir.mkdir(parents=True)
    
    # Save data
    save_availability_data(data, str(output_dir))
    
    # Check that file was created
    files = list(output_dir.glob('court_availability_*.csv'))
    assert len(files) == 1
    
    # Check file contents
    df = pd.read_csv(files[0])
    assert len(df) == 1
    assert df.iloc[0]['court_id'] == '12'
    assert df.iloc[0]['status'] == 'Reserve this time'

@patch('src.court_availability_finder.get_availability_data')
def test_main(mock_get_data, tmp_path):
    """Test the main function."""
    # Mock availability data
    mock_get_data.return_value = [
        {
            'court_id': '12',
            'date': '2025-08-01',
            'time': '9:00 a.m.',
            'court': 'Court 1',
            'status': 'Reserve this time',
            'reservation_link': 'https://www.nycgovparks.org/tennisreservation/reserve/123'
        }
    ]
    
    # Create a temporary directory for output
    output_dir = tmp_path / "data" / "court_availability" / "raw_files"
    output_dir.mkdir(parents=True)
    
    # Run main with test data
    with patch('src.court_availability_finder.OUTPUT_DIR', str(output_dir)):
        main()
    
    # Check that file was created
    files = list(output_dir.glob('court_availability_*.csv'))
    assert len(files) == 1
    
    # Check file contents
    df = pd.read_csv(files[0])
    assert len(df) == 1
    assert df.iloc[0]['court_id'] == '12'
    assert df.iloc[0]['status'] == 'Reserve this time' 