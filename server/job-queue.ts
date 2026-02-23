import { randomUUID } from "crypto";

export interface Job {
  id: string;
  type: "generate" | "edit" | "batch";
  status: "queued" | "processing" | "completed" | "failed";
  progress: { current: number; total: number };
  payload: any;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

type JobWorker = (job: Job) => Promise<any>;

const jobs = new Map<string, Job>();
const pendingQueue: string[] = [];
let processing = 0;
const MAX_CONCURRENT = 10;
let workerFn: JobWorker | null = null;

const CLEANUP_INTERVAL = 5 * 60 * 1000;
const JOB_TTL = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL && (job.status === "completed" || job.status === "failed")) {
      jobs.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

export function registerWorker(fn: JobWorker): void {
  workerFn = fn;
}

export function enqueue(type: Job["type"], payload: any, total = 1): string {
  const id = randomUUID();
  const job: Job = {
    id,
    type,
    status: "queued",
    progress: { current: 0, total },
    payload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  pendingQueue.push(id);
  processNext();
  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function getJobs(ids: string[]): (Job | undefined)[] {
  return ids.map(id => jobs.get(id));
}

export function updateJob(id: string, updates: Partial<Pick<Job, "status" | "progress" | "result" | "error">>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, updates, { updatedAt: Date.now() });
}

function processNext(): void {
  if (!workerFn || processing >= MAX_CONCURRENT || pendingQueue.length === 0) return;

  const jobId = pendingQueue.shift()!;
  const job = jobs.get(jobId);
  if (!job || job.status !== "queued") {
    processNext();
    return;
  }

  processing++;
  job.status = "processing";
  job.updatedAt = Date.now();

  const worker = workerFn;
  worker(job)
    .then((result) => {
      job.status = "completed";
      job.result = result;
      job.progress = { current: job.progress.total, total: job.progress.total };
      job.updatedAt = Date.now();
    })
    .catch((err) => {
      job.status = "failed";
      job.error = err?.message || "Generation failed. Please try again.";
      job.updatedAt = Date.now();
      console.error(`[job-queue] Job ${jobId} failed:`, err?.message || err);
    })
    .finally(() => {
      processing--;
      processNext();
    });

  processNext();
}
