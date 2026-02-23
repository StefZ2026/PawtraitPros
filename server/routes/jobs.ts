import type { Express, Response } from "express";
import { isAuthenticated } from "../auth";
import { getJob, getJobs } from "../job-queue";

export function registerJobRoutes(app: Express): void {
  app.get("/api/jobs/:jobId", isAuthenticated, (req: any, res: Response) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.get("/api/jobs", isAuthenticated, (req: any, res: Response) => {
    const ids = (req.query.ids as string || "").split(",").filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: "Provide ?ids=id1,id2,..." });
    if (ids.length > 50) return res.status(400).json({ error: "Max 50 job IDs per request" });
    const results = getJobs(ids).map((j, i) => j || { id: ids[i], status: "not_found" });
    res.json(results);
  });
}
