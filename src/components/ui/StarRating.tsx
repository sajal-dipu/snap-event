import * as React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  onChange,
  interactive = false,
  size = "md",
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const starSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  const handleStarClick = (val: number) => {
    if (interactive && onChange) {
      onChange(val);
    }
  };

  const handleMouseEnter = (val: number) => {
    if (interactive) {
      setHoverRating(val);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div 
      className={`flex items-center gap-1 ${interactive ? "cursor-pointer" : ""} ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= currentDisplayRating;

        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            className={`transition-all duration-150 transform ${
              interactive 
                ? "hover:scale-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-md p-0.5" 
                : ""
            }`}
            aria-label={`Rate ${starValue} out of ${maxStars}`}
          >
            <Star
              className={`${starSizes[size]} ${
                isFilled
                  ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_1px_rgba(251,191,36,0.3)]"
                  : "text-zinc-300 dark:text-zinc-700 hover:text-amber-300/60"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
