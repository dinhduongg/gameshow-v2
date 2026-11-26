export type PackageKind = "mcq" | "scenario";

export interface LockedPackagesState {
  mcq: string[];
  scenario: string[];
}

const STORAGE_KEY = "gameshow_locked_packages_v1";
const CHANNEL_NAME = "gameshow-locked-packages-sync";

export const EMPTY_LOCKED_PACKAGES: LockedPackagesState = {
  mcq: [],
  scenario: [],
};

function sanitize(raw: unknown): LockedPackagesState {
  if (!raw || typeof raw !== "object") return { mcq: [], scenario: [] };
  const obj = raw as { mcq?: unknown; scenario?: unknown };
  return {
    mcq: Array.isArray(obj.mcq)
      ? Array.from(
          new Set(obj.mcq.filter((x): x is string => typeof x === "string"))
        )
      : [],
    scenario: Array.isArray(obj.scenario)
      ? Array.from(
          new Set(
            obj.scenario.filter((x): x is string => typeof x === "string")
          )
        )
      : [],
  };
}

export function readLockedPackages(): LockedPackagesState {
  if (typeof window === "undefined") return EMPTY_LOCKED_PACKAGES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mcq: [], scenario: [] };
    return sanitize(JSON.parse(raw));
  } catch {
    return { mcq: [], scenario: [] };
  }
}

function writeAndBroadcast(next: LockedPackagesState): LockedPackagesState {
  const clean = sanitize(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage(clean);
      ch.close();
    } catch {
      // Fallback qua sự kiện storage
    }
  }
  return clean;
}

export function lockPackage(
  kind: PackageKind,
  packageName: string
): LockedPackagesState {
  const current = readLockedPackages();
  const list = current[kind];
  if (list.includes(packageName)) return current;
  return writeAndBroadcast({
    ...current,
    [kind]: [...list, packageName],
  });
}

export function unlockPackage(
  kind: PackageKind,
  packageName: string
): LockedPackagesState {
  const current = readLockedPackages();
  return writeAndBroadcast({
    ...current,
    [kind]: current[kind].filter((name) => name !== packageName),
  });
}

export function unlockAllPackages(kind?: PackageKind): LockedPackagesState {
  const current = readLockedPackages();
  if (kind === "mcq") {
    return writeAndBroadcast({ ...current, mcq: [] });
  }
  if (kind === "scenario") {
    return writeAndBroadcast({ ...current, scenario: [] });
  }
  return writeAndBroadcast({ mcq: [], scenario: [] });
}

export function subscribeLockedPackages(
  onChange: (state: LockedPackagesState) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      onChange(sanitize(event.data));
    };
  } catch {
    channel = null;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange(readLockedPackages());
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
