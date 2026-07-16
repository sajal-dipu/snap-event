/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Calculates pagination values
 */
export interface PaginationResult {
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pages: number[];
}

export function getPaginationData(
  totalItems: number,
  pageSize: number,
  currentPage: number
): PaginationResult {
  const totalPages = Math.ceil(totalItems / pageSize);
  const current = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const startIndex = (current - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);
  
  // Create an array of page numbers to display in UI controls
  const maxPagesToShow = 5;
  let startPage = Math.max(1, current - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );
  
  return {
    totalPages,
    startIndex,
    endIndex,
    pages,
  };
}

/**
 * Generates reliable premium placeholder image URLs from Unsplash
 */
export function getPlaceholderImage(
  type: "avatar" | "wedding" | "portrait" | "event" | "scenery",
  index: number = 0
): string {
  const images = {
    avatar: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop", // Female 1
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop", // Male 1
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&fit=crop", // Female 2
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&fit=crop", // Male 2
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=256&h=256&fit=crop", // Female 3
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&h=256&fit=crop", // Male 3
    ],
    wedding: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1519225495810-7517c319b53b?q=80&w=800&fit=crop",
    ],
    portrait: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=800&fit=crop",
    ],
    event: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=800&fit=crop",
    ],
    scenery: [
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1472214222555-d4047587877e?q=80&w=800&fit=crop",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=800&fit=crop",
    ],
  };

  const pool = images[type];
  return pool[index % pool.length];
}
