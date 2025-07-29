from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Date, DECIMAL, JSON, Table, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geography
from datetime import datetime
from .config import Base

# Raw Files Schema
class FileRegistry(Base):
    __tablename__ = 'file_registry'
    __table_args__ = {'schema': 'raw_files'}

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    load_timestamp = Column(DateTime, default=datetime.utcnow)
    file_hash = Column(String(64), nullable=False)
    status = Column(String(50), nullable=False)

# Staging Schema
class StagingTennisCourt(Base):
    __tablename__ = 'tennis_courts'
    __table_args__ = {'schema': 'staging'}

    id = Column(Integer, primary_key=True)
    court_id = Column(String(255), nullable=False)
    court_name = Column(String(255))
    location = Column(String(255))
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    raw_data = Column(JSONB)
    file_id = Column(Integer, ForeignKey('raw_files.file_registry.id'))
    loaded_at = Column(DateTime, default=datetime.utcnow)

# DWH Schema
class DwhTennisCourt(Base):
    __tablename__ = 'tennis_courts'
    __table_args__ = {'schema': 'dwh'}

    court_id = Column(String(255), primary_key=True)
    court_name = Column(String(255))
    location = Column(String(255))
    coordinates = Column(Geography('POINT'))
    court_metadata = Column(JSONB)
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class CourtAvailabilityHistory(Base):
    __tablename__ = 'court_availability_history'
    __table_args__ = {'schema': 'dwh'}

    id = Column(Integer, primary_key=True)
    court_id = Column(String(255), ForeignKey('dwh.tennis_courts.court_id'))
    availability_date = Column(Date, nullable=False)
    time_slot = Column(String(50), nullable=False)
    is_available = Column(Boolean, nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow) 