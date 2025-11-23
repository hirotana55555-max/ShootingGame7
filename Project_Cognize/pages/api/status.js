export default function handler(req, res) {
  res.status(200).json({
    status: "operational",
    system: "Project_Cognize",
    port: 3000,
    timestamp: new Date().toISOString(),
    version: "1.0"
  });
}
