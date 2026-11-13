/**
 * Balanceador de cargas simple para tareas pesadas del backend
 * (generación de reportes, importaciones masivas, agregaciones).
 *
 * Mantiene N "workers" lógicos. Cada tarea se despacha al worker
 * sano con menor carga. Si un worker falla de forma repetida se
 * marca como no saludable y se recupera tras un período de enfriamiento.
 */
class LoadBalancer {
  constructor(workerCount = Number(process.env.LB_WORKERS) || 4) {
    this.workers = Array.from({ length: workerCount }, (_, i) => ({
      id: i,
      inFlight: 0,
      failures: 0,
      healthy: true,
      lastFailureAt: null,
      totalTasks: 0,
    }));
    this.cursor = 0;
    this.cooldownMs = 30_000;
  }

  _recoverWorkers() {
    const now = Date.now();
    for (const w of this.workers) {
      if (!w.healthy && w.lastFailureAt && now - w.lastFailureAt > this.cooldownMs) {
        w.healthy = true;
        w.failures = 0;
      }
    }
  }

  _pickWorker() {
    this._recoverWorkers();
    const healthy = this.workers.filter((w) => w.healthy);
    const pool = healthy.length ? healthy : this.workers;
    // Round-robin entre los sanos, desempatando por menor carga en vuelo
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const idx = (this.cursor + i) % pool.length;
      const w = pool[idx];
      if (!best || w.inFlight < best.inFlight) best = w;
      if (w.inFlight === 0) { best = w; this.cursor = idx + 1; break; }
    }
    this.cursor = (this.workers.indexOf(best) + 1) % this.workers.length;
    return best;
  }

  async dispatch(label, task) {
    const worker = this._pickWorker();
    worker.inFlight += 1;
    worker.totalTasks += 1;
    try {
      const result = await task();
      worker.failures = Math.max(0, worker.failures - 1);
      return result;
    } catch (err) {
      worker.failures += 1;
      worker.lastFailureAt = Date.now();
      if (worker.failures >= 3) worker.healthy = false;
      throw err;
    } finally {
      worker.inFlight -= 1;
    }
  }

  status() {
    this._recoverWorkers();
    return {
      workers: this.workers.map(({ id, inFlight, failures, healthy, totalTasks }) => ({
        id, inFlight, failures, healthy, totalTasks,
      })),
      healthyWorkers: this.workers.filter((w) => w.healthy).length,
    };
  }
}

const loadBalancer = new LoadBalancer();
module.exports = { loadBalancer, LoadBalancer };
