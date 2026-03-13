import { describe, it, expect, vi } from 'vitest';
import { Semaphore } from './semaphore';

describe('Semaphore', () => {
  it('Given max=3, When fewer than 3 acquired, Should resolve immediately', async () => {
    const sem = new Semaphore(3);
    await expect(sem.acquire()).resolves.toBeUndefined();
    await expect(sem.acquire()).resolves.toBeUndefined();
    await expect(sem.acquire()).resolves.toBeUndefined();
    expect(sem.free).toBe(0);
  });

  it('Given full semaphore, When another acquires, Should queue until released', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();
    expect(sem.free).toBe(0);

    let resolved = false;
    const p = sem.acquire().then(() => { resolved = true; });
    expect(resolved).toBe(false);
    expect(sem.pending).toBe(1);

    sem.release();
    await p;
    expect(resolved).toBe(true);
  });

  it('Given max=2, When released, Should allow next waiter to proceed', async () => {
    const sem = new Semaphore(2);
    await sem.acquire();
    await sem.acquire();

    const order: number[] = [];
    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));

    sem.release();
    sem.release();
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it('Given empty queue, When released, Should increment free count', () => {
    const sem = new Semaphore(2);
    sem.release();
    expect(sem.free).toBe(3);
  });

  it('Given max concurrency, Should limit parallel in-flight to max', async () => {
    const MAX = 3;
    const sem = new Semaphore(MAX);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 10 }, async () => {
      await sem.acquire();
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((r) => setTimeout(r, 5));
      active--;
      sem.release();
    });

    await Promise.all(tasks);
    expect(maxActive).toBeLessThanOrEqual(MAX);
  });
});
