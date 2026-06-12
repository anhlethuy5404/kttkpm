"""
Merge all Amazon product CSV files from data/amazon/ folder
"""
import os
import pandas as pd
import numpy as np
from pathlib import Path


def clean_price(price_str):
    """Convert price strings like '₹32,999' or '₹32999' to float"""
    if pd.isna(price_str) or price_str == '':
        return 0.0
    
    if isinstance(price_str, (int, float)):
        return float(price_str)
    
    # Remove currency symbols and commas
    price_str = str(price_str).replace('₹', '').replace(',', '').strip()
    try:
        return float(price_str)
    except:
        return 0.0


def merge_amazon_products():
    """Load and merge all Amazon product CSVs from amazon/ folder"""
    
    # Load all Amazon CSVs from amazon/ folder
    print("📦 Loading Amazon datasets from amazon/...")
    amazon_files = sorted(Path('amazon').glob('products_part*.csv'))
    amazon_dfs = []
    
    for file in amazon_files:
        print(f"  - {file.name}")
        df = pd.read_csv(file)
        amazon_dfs.append(df)
    
    if not amazon_dfs:
        print("❌ No Amazon CSV files found in amazon/")
        return None
    
    # Combine all Amazon CSVs
    merged = pd.concat(amazon_dfs, ignore_index=True)
    print(f"\n✓ Total products before dedup: {len(merged)}")
    
    # Normalize columns - keep rich metadata for Product model
    merged_norm = pd.DataFrame({
        'product_id': range(1, len(merged) + 1),
        'name': merged['name'],
        'price': merged['actual_price'].apply(clean_price),
        'discount_price': merged['discount_price'].apply(clean_price),
        'cat_level_1': merged['main_category'],
        'cat_level_2': merged['sub_category'],
        'rating': pd.to_numeric(merged['ratings'], errors='coerce').fillna(0),
        'no_of_ratings': pd.to_numeric(merged['no_of_ratings'].astype(str).str.replace(',', ''), errors='coerce').fillna(0),
        'image_url': merged['image'],
        'product_link': merged['link'],
        'seller_id': 1,  # All Amazon
        'source': 'amazon'
    })
    
    # Remove duplicates by name
    merged_norm = merged_norm.drop_duplicates(subset=['name'], keep='first').reset_index(drop=True)
    print(f"After dedup by name: {len(merged_norm)}")
    
    # Re-assign sequential product_id
    merged_norm['product_id'] = range(1, len(merged_norm) + 1)
    
    # Select all useful columns for Product model
    final = merged_norm[[
        'product_id', 'name', 'price', 'discount_price',
        'cat_level_1', 'cat_level_2', 'rating', 'no_of_ratings',
        'image_url', 'product_link', 'seller_id', 'source'
    ]].copy()
    
    # Save
    output_path = 'products_amazon.csv'
    final.to_csv(output_path, index=False)
    
    print(f"\n✅ Saved to {output_path}")
    print(f"\nDataset Summary:")
    print(f"  Total products: {len(final)}")
    print(f"  Source: Amazon India")
    
    print(f"\nColumns included:")
    for col in final.columns:
        print(f"  - {col}")
    
    print(f"\nTop 5 categories:")
    print(final['cat_level_1'].value_counts().head(5))
    
    print(f"\nPrice stats:")
    print(f"  Actual price: {final['price'].describe()}")
    
    print(f"\nRating stats:")
    print(f"  Avg rating: {final['rating'].mean():.2f}")
    print(f"  Avg no_of_ratings: {final['no_of_ratings'].mean():.0f}")
    
    print(f"\nMissing values:")
    print(final.isnull().sum())
    
    return final


if __name__ == '__main__':
    merge_amazon_products()
