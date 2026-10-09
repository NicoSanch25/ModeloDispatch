export function withTimeout<T>(request: PromiseLike<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    Promise.resolve(request).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
