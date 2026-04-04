class BackgroundQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(job) {
    this.queue.push(job);
    if (!this.processing) {
      // Start processing on next tick to not block the response
      setImmediate(() => this.process());
    }
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await job();
      } catch (err) {
        console.error("[BackgroundQueue] Job failed:", err.message);
      }
    }

    this.processing = false;
  }

  get pendingCount() {
    return this.queue.length;
  }
}

const bgQueue = new BackgroundQueue();

module.exports = { bgQueue };
