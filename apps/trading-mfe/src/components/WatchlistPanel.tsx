import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  InputAdornment,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type {
  MarketTick,
  WatchlistSnapshot,
} from "../hooks/useMarketStream";
import type { ShellState } from "../types/store";
import { setSelectedSymbol } from "../store/terminalActions";

type FlashDir = "up" | "down" | null;

function useTickFlash(snapshot: WatchlistSnapshot): Record<string, FlashDir> {
  const prevRef = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, FlashDir>>({});

  useEffect(() => {
    const updates: Record<string, FlashDir> = {};
    for (const [sym, tick] of Object.entries(snapshot)) {
      const prev = prevRef.current[sym];
      if (prev !== undefined && tick.last !== prev) {
        updates[sym] = tick.last > prev ? "up" : "down";
      }
      prevRef.current[sym] = tick.last;
    }
    if (Object.keys(updates).length === 0) return;

    const leadId = setTimeout(() => setFlash((f) => ({ ...f, ...updates })), 0);
    const trailId = setTimeout(() => {
      setFlash((f) => {
        const next = { ...f };
        for (const sym of Object.keys(updates)) delete next[sym];
        return next;
      });
    }, 600);
    return () => {
      clearTimeout(leadId);
      clearTimeout(trailId);
    };
  }, [snapshot]);

  return flash;
}

/** Compact volume: 5 000 000 → 5.0M, 125 000 → 125K */
function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toString();
}

interface WatchlistPanelProps {
  snapshot: WatchlistSnapshot;
  isLoading?: boolean;
}

export interface WatchlistPanelHandle {
  focusSearch(): void;
}

export const WatchlistPanel = forwardRef<
  WatchlistPanelHandle,
  WatchlistPanelProps
>(function WatchlistPanel({ snapshot, isLoading }, ref) {
  const dispatch = useDispatch();
  const selectedSymbol = useSelector(
    (s: ShellState) => s.terminal.selectedSymbol,
  );
  const [search, setSearch] = useState("");
  const flash = useTickFlash(snapshot);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  const allTicks = Object.values(snapshot).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
  const ticks = search
    ? allTicks.filter((t) => t.symbol.startsWith(search.toUpperCase()))
    : allTicks;

  const handleSelect = (symbol: string) => dispatch(setSelectedSymbol(symbol));

  function handleRowKeyDown(
    e: KeyboardEvent<HTMLTableRowElement>,
    tick: MarketTick,
    idx: number,
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(tick.symbol);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      rowRefs.current[idx + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx === 0) searchRef.current?.focus();
      else rowRefs.current[idx - 1]?.focus();
    } else if (e.key === "Escape") {
      setSearch("");
      searchRef.current?.focus();
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Header — search field ── */}
      <Box
        sx={{
          px: 1,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Filter symbols…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearch("");
            if (e.key === "ArrowDown") {
              e.preventDefault();
              rowRefs.current[0]?.focus();
            }
          }}
          inputProps={{ "aria-label": "Filter symbols" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 13, color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          fullWidth
        />
      </Box>

      {/* ── Body ── */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {isLoading && ticks.length === 0 ? (
          <Box sx={{ p: 1.5 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={26} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        ) : ticks.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", p: 2 }}
          >
            {search ? "No symbols match." : "Waiting for market data…"}
          </Typography>
        ) : (
          <Table
            size="small"
            aria-label="Watchlist"
            role="grid"
            sx={{
              '& .MuiTableBody-root .MuiTableCell-root': {
                height: 44,
                py: 0,
                verticalAlign: 'middle',
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    py: 1,
                  }}
                >
                  Symbol
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    py: 1,
                  }}
                >
                  Last
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    py: 1,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  <Tooltip title="Total shares traded today" placement="top">
                    <span>Vol</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticks.map((tick, idx) => {
                const isSelected = tick.symbol === selectedSymbol;
                const dir = flash[tick.symbol] ?? null;

                return (
                  <TableRow
                    key={tick.symbol}
                    ref={(el) => {
                      rowRefs.current[idx] = el;
                    }}
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelect(tick.symbol)}
                    onKeyDown={(e) => handleRowKeyDown(e, tick, idx)}
                    selected={isSelected}
                    hover
                    sx={{
                      cursor: "pointer",
                      outline: "none",
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected ? "primary.main" : "transparent",
                      "&:focus-visible": {
                        outline: "none",
                        boxShadow: (t) =>
                          `inset 0 0 0 2px ${t.palette.primary.main}`,
                      },
                    }}
                  >
                    <TableCell
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                    >
                      {tick.symbol}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        transition: "color 0.6s",
                        color:
                          dir === "up"
                            ? "trading.uptick"
                            : dir === "down"
                              ? "trading.downtick"
                              : "text.primary",
                      }}
                      aria-label={`${tick.symbol} last price ${tick.last.toFixed(2)}`}
                    >
                      {tick.last.toFixed(2)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: "text.disabled",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.75rem",
                        display: { xs: 'none', sm: 'table-cell' },
                      }}
                    >
                      {fmtVol(tick.volume)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
});
