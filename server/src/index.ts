import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Import handlers (You'll need to adapt these from the original files
// to standard Express (req, res) handlers instead of createServerFn)
import { handlePlanRoute, handlePlanRouteWithTransport, handleSimulateDisruption, handleApplyWhatIf, handleOptimizeRoute } from "./supply-chain.js";
import { handleGeminiChat } from "./gemini.js";
import { handleSaveShipment, handleLogAnalyticsEvent, handleGetShipments, handleGetShipmentById, handleDeleteShipment, handleGetDashboardStats } from "./db-functions.js";

app.post("/api/planRoute", handlePlanRoute);
app.post("/api/planRouteWithTransport", handlePlanRouteWithTransport);
app.post("/api/simulateDisruption", handleSimulateDisruption);
app.post("/api/applyWhatIf", handleApplyWhatIf);
app.post("/api/optimizeRoute", handleOptimizeRoute);
app.post("/api/geminiChat", handleGeminiChat);
app.post("/api/saveShipment", handleSaveShipment);
app.post("/api/logAnalyticsEvent", handleLogAnalyticsEvent);
app.get("/api/getShipments", handleGetShipments);
app.get("/api/getShipmentById", handleGetShipmentById);
app.post("/api/deleteShipment", handleDeleteShipment);
app.get("/api/getDashboardStats", handleGetDashboardStats);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
