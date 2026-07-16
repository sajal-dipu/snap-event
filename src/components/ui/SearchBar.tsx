import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface SearchBarProps extends React.FormHTMLAttributes<HTMLFormElement> {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmitSearch?: (value: string) => void;
}

export function SearchBar({
  placeholder = "Search...",
  value,
  onValueChange,
  onSubmitSearch,
  className,
  ...props
}: SearchBarProps) {
  const [searchValue, setSearchValue] = React.useState(value || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setSearchValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    onValueChange?.(val);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmitSearch?.(searchValue);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full items-center gap-2 max-w-md", className)}
      {...props}
    >
      <div className="relative flex-grow">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </span>
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
          className="pl-9 pr-4"
        />
      </div>
      <Button type="submit" variant="default">
        Search
      </Button>
    </form>
  );
}
export default SearchBar;
