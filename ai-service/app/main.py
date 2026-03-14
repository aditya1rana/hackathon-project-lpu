"""
Smart Inventory Management System — AI Prediction Microservice
FastAPI application providing ML-powered demand forecasting,
stockout prediction, and restock recommendations.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime, timedelta
import json
import os
from google import genai
from google.genai import types

# Initialize Gemini Client
# Assumes GEMINI_API_KEY is available in the environment
try:
    gemini_client = genai.Client()
except Exception as e:
    gemini_client = None
    print(f"Warning: Failed to initialize Gemini Client. Check your GEMINI_API_KEY. Error: {e}")

app = FastAPI(
    title="Smart Inventory AI Service",
    description="ML-powered predictions for inventory management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Schemas ──────────────────────────────────────────────────

class UsageDataPoint(BaseModel):
    quantity: int
    date: str
    action: Optional[str] = None


class DemandRequest(BaseModel):
    item_id: str
    usage_data: List[UsageDataPoint]


class StockoutRequest(BaseModel):
    item_id: str
    current_stock: int
    min_stock: int
    usage_data: List[UsageDataPoint]


class RestockItem(BaseModel):
    id: str
    name: str
    quantity: int
    min_stock: int
    unit_price: Optional[float] = 0
    supplier_name: Optional[str] = None
    lead_time_days: Optional[int] = None
    category_name: Optional[str] = None


class RestockRequest(BaseModel):
    items: List[RestockItem]


class QueryRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None


class DemandPredictionOutput(BaseModel):
    predicted_demand: float
    daily_rate: float
    weighted_average: float
    trend: str
    trend_slope: float
    confidence: float
    predicted_for: str
    data_points_used: int
    period_days: int

class StockoutPredictionOutput(BaseModel):
    days_until_stockout: float
    days_until_min_stock: float
    stockout_date: Optional[str]
    daily_consumption_rate: float
    risk_level: str
    confidence: float
    recommended_reorder_point: int
    recommended_order_quantity: int

class RestockSuggestionItemOutput(BaseModel):
    item_id: str
    item_name: str
    current_stock: int
    min_stock: int
    suggested_quantity: int
    unit_price: float
    estimated_cost: float
    priority_score: int
    priority_label: str
    supplier: Optional[str]
    lead_time_days: Optional[int]
    category: Optional[str]

class RestockSuggestionOutput(BaseModel):
    suggestions: List[RestockSuggestionItemOutput]
    total_items: int
    total_estimated_cost: float
    critical_count: int
    high_count: int
    generated_at: str

# ─── Prediction Engine ───────────────────────────────────────

class PredictionEngine:
    """
    Lightweight prediction engine using numpy-based statistical methods.
    For production, replace with trained scikit-learn models.
    """

    @staticmethod
    def predict_demand(usage_data: List[UsageDataPoint], days_ahead: int = 30) -> Dict:
        """Predict future demand using Gemini AI with fallback to linear trend."""
        if len(usage_data) < 3:
            raise ValueError("Need at least 3 data points")

        if gemini_client:
            try:
                prompt_data = [{"date": d.date, "quantity": d.quantity} for d in usage_data]
                prompt = (
                    f"Analyze the following historic daily usage data for an inventory item "
                    f"and predict the demand for the next {days_ahead} days.\n"
                    f"Usage Data (JSON):\n{json.dumps(prompt_data)}\n\n"
                    "Calculate the overall daily_rate, weighted_average, trend ('increasing', 'decreasing', or 'stable'), trend_slope, and a confidence score (0.0 to 1.0). "
                    "Also provide the predicted_demand based on these trends. "
                    "Format the response perfectly matching the JSON schema."
                )
                
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=DemandPredictionOutput,
                        temperature=0.1,
                    )
                )
                return json.loads(response.text)
            except Exception as e:
                print(f"Gemini AI Error (fallback to stats): {e}")

        # Fallback: Parse dates and quantities
        quantities = np.array([d.quantity for d in usage_data], dtype=float)
        dates = [datetime.fromisoformat(d.date.replace("Z", "+00:00")) for d in usage_data]

        # Calculate daily usage rate
        if len(dates) >= 2:
            total_days = max(1, (dates[-1] - dates[0]).days)
            total_quantity = float(np.sum(quantities))
            daily_rate = total_quantity / total_days
        else:
            daily_rate = float(np.mean(quantities))

        # Weighted moving average (recent data weighted more)
        weights = np.exp(np.linspace(0, 1, len(quantities)))
        weights /= weights.sum()
        weighted_avg = float(np.dot(quantities, weights))

        # Linear trend using numpy polyfit
        x = np.arange(len(quantities))
        if len(quantities) >= 2:
            slope, intercept = np.polyfit(x, quantities, 1)
            trend = "increasing" if slope > 0.1 else "decreasing" if slope < -0.1 else "stable"
        else:
            slope, intercept = 0.0, float(quantities[0])
            trend = "stable"

        # Predicted demand for the next period
        predicted_demand = max(0, daily_rate * days_ahead)

        # Confidence based on data consistency (lower std = higher confidence)
        std = float(np.std(quantities)) if len(quantities) > 1 else 0
        mean = float(np.mean(quantities)) if float(np.mean(quantities)) != 0 else 1
        cv = std / abs(mean) if mean != 0 else 1  # coefficient of variation
        confidence = max(0.1, min(0.95, 1.0 - cv * 0.5))

        return {
            "predicted_demand": round(predicted_demand, 2),
            "daily_rate": round(daily_rate, 4),
            "weighted_average": round(weighted_avg, 2),
            "trend": trend,
            "trend_slope": round(float(slope), 4),
            "confidence": round(confidence, 4),
            "predicted_for": (datetime.utcnow() + timedelta(days=days_ahead)).isoformat(),
            "data_points_used": len(usage_data),
            "period_days": days_ahead,
        }

    @staticmethod
    def predict_stockout(
        current_stock: int,
        min_stock: int,
        usage_data: List[UsageDataPoint],
    ) -> Dict:
        """Predict days until stockout using Gemini AI with fallback patterns."""
        if gemini_client and len(usage_data) >= 3:
            try:
                prompt_data = [{"date": d.date, "quantity": d.quantity} for d in usage_data]
                prompt = (
                    f"Analyze the following inventory status and historic usage data:\n"
                    f"Current Stock: {current_stock}\n"
                    f"Minimum Stock Threshold: {min_stock}\n"
                    f"Usage Data (JSON):\n{json.dumps(prompt_data)}\n\n"
                    "Predict the exact days_until_stockout and days_until_min_stock. "
                    "Assess the risk_level ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'). "
                    "Provide a confidence score (0.0 to 1.0), recommended_reorder_point, and recommended_order_quantity. "
                    "Format the response perfectly matching the JSON schema."
                )
                
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=StockoutPredictionOutput,
                        temperature=0.1,
                    )
                )
                return json.loads(response.text)
            except Exception as e:
                print(f"Gemini AI Error (fallback to stats): {e}")
                
        quantities = np.array([d.quantity for d in usage_data], dtype=float)
        dates = [datetime.fromisoformat(d.date.replace("Z", "+00:00")) for d in usage_data]

        # Calculate consumption rate
        total_days = max(1, (dates[-1] - dates[0]).days) if len(dates) >= 2 else 1
        total_consumed = float(np.sum(quantities))
        daily_consumption = total_consumed / total_days

        if daily_consumption <= 0:
            return {
                "days_until_stockout": 999,
                "stockout_date": None,
                "daily_consumption_rate": 0,
                "confidence": 0.5,
                "risk_level": "LOW",
                "recommended_reorder_point": min_stock,
            }

        # Days until stock hits zero
        days_until_stockout = current_stock / daily_consumption

        # Days until stock hits minimum
        effective_stock = max(0, current_stock - min_stock)
        days_until_min = effective_stock / daily_consumption if daily_consumption > 0 else 999

        # Risk level
        if days_until_stockout <= 7:
            risk_level = "CRITICAL"
        elif days_until_stockout <= 14:
            risk_level = "HIGH"
        elif days_until_stockout <= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Confidence
        std = float(np.std(quantities))
        mean = float(np.mean(quantities))
        cv = std / abs(mean) if mean != 0 else 1
        confidence = max(0.1, min(0.95, 1.0 - cv * 0.4))

        return {
            "days_until_stockout": round(days_until_stockout, 1),
            "days_until_min_stock": round(days_until_min, 1),
            "stockout_date": (datetime.utcnow() + timedelta(days=days_until_stockout)).isoformat(),
            "daily_consumption_rate": round(daily_consumption, 4),
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
            "recommended_reorder_point": max(min_stock, int(daily_consumption * 14)),
            "recommended_order_quantity": max(min_stock, int(daily_consumption * 30)),
        }

    @staticmethod
    def generate_restock_suggestions(items: List[RestockItem]) -> Dict:
        """Generate restock suggestions using Gemini AI with fallback priority scoring."""
        if not items:
            return {
                "suggestions": [],
                "total_items": 0,
                "total_estimated_cost": 0.0,
                "critical_count": 0,
                "high_count": 0,
                "generated_at": datetime.utcnow().isoformat(),
            }

        if gemini_client:
            try:
                items_data = [item.model_dump() for item in items]
                prompt = (
                    f"Analyze the following list of inventory items to generate strict restock suggestions:\n"
                    f"Items Data (JSON):\n{json.dumps(items_data)}\n\n"
                    "For each item, if current_stock is near or below min_stock, suggest a restock quantity "
                    "(target roughly 2x min_stock). Assess a priority_score (0-100) and priority_label "
                    "('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'). "
                    "Calculate the total items to restock and total_estimated_cost. "
                    "Format the response perfectly matching the JSON schema."
                )
                
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=RestockSuggestionOutput,
                        temperature=0.2,
                    )
                )
                return json.loads(response.text)
            except Exception as e:
                print(f"Gemini AI Error (fallback to logic): {e}")

        suggestions = []
        total_cost = 0

        for item in items:
            if item.quantity > item.min_stock * 1.5:
                continue

            # Calculate restock quantity (target 2x min stock)
            restock_qty = max(item.min_stock * 2 - item.quantity, item.min_stock)

            # Priority score (0-100)
            stock_ratio = item.quantity / max(item.min_stock, 1)
            if stock_ratio <= 0:
                priority = 100
            elif stock_ratio <= 0.25:
                priority = 90
            elif stock_ratio <= 0.5:
                priority = 70
            elif stock_ratio <= 1.0:
                priority = 50
            else:
                priority = 30

            line_cost = restock_qty * (item.unit_price or 0)
            total_cost += line_cost

            suggestions.append({
                "item_id": item.id,
                "item_name": item.name,
                "current_stock": item.quantity,
                "min_stock": item.min_stock,
                "suggested_quantity": restock_qty,
                "unit_price": item.unit_price,
                "estimated_cost": round(line_cost, 2),
                "priority_score": priority,
                "priority_label": "CRITICAL" if priority >= 90 else "HIGH" if priority >= 70 else "MEDIUM" if priority >= 50 else "LOW",
                "supplier": item.supplier_name,
                "lead_time_days": item.lead_time_days,
                "category": item.category_name,
            })

        # Sort by priority (highest first)
        suggestions.sort(key=lambda x: x["priority_score"], reverse=True)

        return {
            "suggestions": suggestions,
            "total_items": len(suggestions),
            "total_estimated_cost": round(total_cost, 2),
            "critical_count": sum(1 for s in suggestions if s["priority_label"] == "CRITICAL"),
            "high_count": sum(1 for s in suggestions if s["priority_label"] == "HIGH"),
            "generated_at": datetime.utcnow().isoformat(),
        }


engine = PredictionEngine()


# ─── API Endpoints ──────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-prediction", "timestamp": datetime.utcnow().isoformat()}


@app.post("/predict/demand")
async def predict_demand(request: DemandRequest):
    """Predict future demand for an inventory item."""
    try:
        result = engine.predict_demand(request.usage_data)
        return {**result, "item_id": request.item_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/stockout")
async def predict_stockout(request: StockoutRequest):
    """Predict when an item will go out of stock."""
    try:
        result = engine.predict_stockout(
            request.current_stock,
            request.min_stock,
            request.usage_data,
        )
        return {**result, "item_id": request.item_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/restock")
async def predict_restock(request: RestockRequest):
    """Get AI-powered restock suggestions."""
    try:
        result = engine.generate_restock_suggestions(request.items)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restock prediction failed: {str(e)}")


@app.post("/query")
async def ai_query(request: QueryRequest):
    """
    Natural language query endpoint.
    Answers questions about inventory predictions using context data.
    Example: "What items will run out next month?"
    """
    try:
        question = request.question.lower()
        context = request.context or {}

        try:
            # Check if Gemini is configured
            if not gemini_client:
                return {
                    "answer": "Error: Gemini AI is not configured on the server. Please check the GEMINI_API_KEY.",
                    "confidence": 0,
                }
            
            # Format context for Gemini
            system_instruction = (
                "You are an intelligent Inventory Management Assistant. "
                "You will be provided with a user's question and JSON context data regarding their inventory "
                "such as low stock items, most used items, and recent predictions. "
                "Base your answer ONLY on the provided context. If the context does not contain the answer, "
                "say that you do not have enough data to answer clearly.\n"
                "Provide a helpful, precise, and concise response. Do not use markdown backticks around the whole response."
            )
            
            prompt = (
                f"Question: {question}\n\n"
                f"Context Data:\n{json.dumps(context, indent=2)}\n\n"
                "Answer the question directly based on the context data."
            )
            
            # Call Gemini using google-genai SDK
            response = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2, # Low temperature for more factual, context-based answers
                )
            )

            return {
                "answer": response.text,
                "confidence": 0.9, # Arbitrary confidence score for LLM generated response
                "model": "gemini-2.5-flash",
                "recommendation": "Review the full context data in the dashboard for more details."
            }
            
        except Exception as e:
            return {
                "answer": f"Error interacting with AI Assistant: {str(e)}",
                "confidence": 0,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
