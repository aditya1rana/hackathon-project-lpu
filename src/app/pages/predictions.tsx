import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Brain,
  TrendingDown,
  AlertTriangle,
  Bell,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "sonner";

const demandForecastData = [
  { week: "Week 1", predicted: 420, actual: 410, lower: 390, upper: 450 },
  { week: "Week 2", predicted: 445, actual: 438, lower: 415, upper: 475 },
  { week: "Week 3", predicted: 480, actual: 472, lower: 450, upper: 510 },
  { week: "Week 4", predicted: 510, actual: null, lower: 480, upper: 540 },
  { week: "Week 5", predicted: 530, actual: null, lower: 500, upper: 560 },
  { week: "Week 6", predicted: 485, actual: null, lower: 455, upper: 515 },
];

const trendPredictionData = [
  { month: "Jan", historical: 380, predicted: 385 },
  { month: "Feb", historical: 420, predicted: 425 },
  { month: "Mar", historical: 450, predicted: 455 },
  { month: "Apr", historical: null, predicted: 490 },
  { month: "May", historical: null, predicted: 520 },
  { month: "Jun", historical: null, predicted: 505 },
];

const smartAlerts = [
  {
    id: 1,
    type: "Stock Depletion",
    severity: "Critical",
    message: "Resistor Pack stock will deplete in 7 days",
    action: "Order 50 units immediately",
    confidence: "95%",
  },
  {
    id: 2,
    type: "Demand Spike",
    severity: "High",
    message: "Electronics Lab demand expected to increase by 25%",
    action: "Prepare additional stock for next week",
    confidence: "88%",
  },
  {
    id: 3,
    type: "Seasonal Trend",
    severity: "Medium",
    message: "Historical data shows exam season spike approaching",
    action: "Increase inventory by 15% in 2 weeks",
    confidence: "82%",
  },
];

export default function Predictions() {
  const [stockDepletionData, setStockDepletionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const data = await api.getStockoutPredictions();
        setStockDepletionData(data);
      } catch (error) {
        toast.error("Failed to load AI predictions");
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  const getUrgencyColor = (urgency: string) => {
    const config = {
      Critical: "bg-[#EF4444]/10 text-[#EF4444]",
      High: "bg-[#F59E0B]/10 text-[#F59E0B]",
      Medium: "bg-[#06B6D4]/10 text-[#06B6D4]",
      Low: "bg-[#10B981]/10 text-[#10B981]",
    };
    return config[urgency as keyof typeof config];
  };

  const getSeverityColor = (severity: string) => {
    const config = {
      Critical: "border-[#EF4444] bg-[#EF4444]/5",
      High: "border-[#F59E0B] bg-[#F59E0B]/5",
      Medium: "border-[#06B6D4] bg-[#06B6D4]/5",
    };
    return config[severity as keyof typeof config];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-[#4F46E5]" />
          AI Predictions & Forecasting
        </h1>
        <p className="text-muted-foreground">
          Machine learning powered predictions for stock levels, demand, and trends.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Items</p>
                <p className="text-3xl font-bold">
                  {stockDepletionData.filter((i) => i.urgency === "Critical").length}
                </p>
                <p className="text-sm text-[#EF4444] mt-1">Needs immediate action</p>
              </div>
              <div className="bg-[#EF4444]/10 text-[#EF4444] p-3 rounded-lg">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold">{smartAlerts.length}</p>
                <p className="text-sm text-[#F59E0B] mt-1">AI-generated insights</p>
              </div>
              <div className="bg-[#F59E0B]/10 text-[#F59E0B] p-3 rounded-lg">
                <Bell className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-3xl font-bold">86%</p>
                <p className="text-sm text-[#10B981] mt-1">Prediction accuracy</p>
              </div>
              <div className="bg-[#10B981]/10 text-[#10B981] p-3 rounded-lg">
                <Target className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Forecast Range</p>
                <p className="text-3xl font-bold">6w</p>
                <p className="text-sm text-[#06B6D4] mt-1">Advanced planning</p>
              </div>
              <div className="bg-[#06B6D4]/10 text-[#06B6D4] p-3 rounded-lg">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Alerts Panel */}
      <Card className="border-[#4F46E5]">
        <CardHeader className="bg-[#4F46E5]/5">
          <CardTitle className="flex items-center gap-2 text-[#4F46E5]">
            <Bell className="w-6 h-6" />
            Smart Alerts & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {smartAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-5 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getUrgencyColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium">{alert.type}</span>
                    </div>
                    <p className="text-lg font-semibold mb-2">{alert.message}</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Recommended: {alert.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {alert.confidence}
                    </p>
                  </div>
                  <Button className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => toast.success("Action initiated: " + alert.action)}>
                    Take Action
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Depletion Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-[#F59E0B]" />
            Stock Depletion Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stockDepletionData.map((item, index) => (
              <div key={index} className="p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{item.item}</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Estimated depletion: <strong>{item.days} days</strong>
                      </span>
                      <Badge className={getUrgencyColor(item.urgency)}>
                        {item.urgency}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">
                      Confidence
                    </p>
                    <p className="text-2xl font-bold text-[#4F46E5]">
                      {item.confidence}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.urgency === "Critical"
                        ? "bg-[#EF4444]"
                        : item.urgency === "High"
                        ? "bg-[#F59E0B]"
                        : item.urgency === "Medium"
                        ? "bg-[#06B6D4]"
                        : "bg-[#10B981]"
                    }`}
                    style={{ width: `${item.confidence}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prediction Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>6-Week Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={demandForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#4F46E5"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ fill: "#4F46E5", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Prediction */}
        <Card>
          <CardHeader>
            <CardTitle>Historical vs Predicted Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendPredictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "#4F46E5", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
