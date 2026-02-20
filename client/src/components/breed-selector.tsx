import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { getBreedsForSpecies } from "@/lib/breeds";
import { Search, ChevronDown, X } from "lucide-react";

interface BreedSelectorProps {
  species: "dog" | "cat";
  value: string;
  onChange: (breed: string) => void;
}

export function BreedSelector({ species, value, onChange }: BreedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allBreeds = useMemo(() => getBreedsForSpecies(species), [species]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allBreeds;
    const q = search.toLowerCase();
    return allBreeds.filter(b => b.toLowerCase().includes(q));
  }, [allBreeds, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  const handleSelect = (breed: string) => {
    onChange(breed);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-breed-selector"
      >
        <span className={`flex-1 truncate ${value ? "" : "text-muted-foreground"}`}>
          {value || `Select breed *`}
        </span>
        {value ? (
          <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" onClick={handleClear} data-testid="button-clear-breed" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg" data-testid="dropdown-breed-list">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Type to search breeds..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-breed-search"
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center" data-testid="text-no-breeds">
                No breeds found
              </div>
            ) : (
              filtered.map((breed) => (
                <div
                  key={breed}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover-elevate ${
                    breed === value ? "bg-primary/10 font-medium" : ""
                  }`}
                  onClick={() => handleSelect(breed)}
                  data-testid={`option-breed-${breed.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {breed}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
