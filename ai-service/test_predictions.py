import os
os.environ['GEMINI_API_KEY'] = "AIzaSyBpsUEbA9WCBrQ2N_mLxFygY1EP21MK4-o"

from app.main import PredictionEngine, UsageDataPoint, RestockItem

print("Testing Demand Prediction...")
engine = PredictionEngine()
usage = [
    UsageDataPoint(date='2023-10-01', quantity=5),
    UsageDataPoint(date='2023-10-02', quantity=10),
    UsageDataPoint(date='2023-10-03', quantity=8)
]
print(engine.predict_demand(usage))

print("\nTesting Stockout Prediction...")
print(engine.predict_stockout(current_stock=10, min_stock=20, usage_data=usage))

print("\nTesting Restock Suggestions...")
items = [
    RestockItem(id="1", name="Resistors", quantity=5, min_stock=20, unit_price=0.5, supplier_name="DigiKey", lead_time_days=2, category_name="Electronics")
]
print(engine.generate_restock_suggestions(items))
