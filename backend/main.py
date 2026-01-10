# Add to backend/main.py
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
import pandas as pd
from minio import Minio
import io

app = FastAPI()

# Database and MinIO clients
engine = create_engine("postgresql://user:password@db:5432/tradeshift")
minio_client = Minio("minio:9000", "minioadmin", "minioadmin", secure=False)

@app.get("/instruments")
def list_instruments():
    """Get all available instruments"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT instrument, start_date, end_date, rows_count FROM index_metadata"))
        return [dict(row) for row in result]

@app.get("/data/{instrument}")
def get_instrument_data(instrument: str, limit: int = 1000):
    """Get data for specific instrument"""
    # First check if instrument exists
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT object_name FROM index_metadata WHERE instrument = :instrument"),
            {"instrument": instrument}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Instrument not found")
        
        object_name = row[0]
    
    # Fetch from MinIO
    response = minio_client.get_object("market-data", object_name)
    df = pd.read_parquet(io.BytesIO(response.read()))
    
    # Convert to list of dicts
    return df.head(limit).to_dict(orient="records")

@app.get("/data/{instrument}/range")
def get_data_range(instrument: str, start: str, end: str):
    """Get data for specific date range"""
    # Similar implementation with date filtering
    pass
