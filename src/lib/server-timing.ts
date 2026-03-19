function getNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

type TimingEntry = {
  name: string;
  duration: number;
  description?: string;
};

function formatDuration(duration: number) {
  return Number(duration.toFixed(1));
}

export function createServerTiming() {
  const entries: TimingEntry[] = [];

  function record(name: string, duration: number, description?: string) {
    entries.push({
      name,
      duration: formatDuration(duration),
      description,
    });
  }

  return {
    async measure<T>(name: string, fn: () => Promise<T> | T, description?: string) {
      const startedAt = getNow();
      try {
        return await fn();
      } finally {
        record(name, getNow() - startedAt, description);
      }
    },
    apply<T extends Response>(response: T) {
      if (entries.length === 0) {
        return response;
      }

      response.headers.set(
        "Server-Timing",
        entries
          .map((entry) => {
            const descriptionPart = entry.description ? `;desc="${entry.description}"` : "";
            return `${entry.name};dur=${entry.duration}${descriptionPart}`;
          })
          .join(", ")
      );

      return response;
    },
  };
}
