import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn("flex items-center justify-center gap-1.5 mt-8", className)}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page) => {
        const isCurrent = page === currentPage;
        return (
          <Button
            key={page}
            variant={isCurrent ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(isCurrent && "pointer-events-none")}
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
export default Pagination;
