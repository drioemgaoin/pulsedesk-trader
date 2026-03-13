import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { FeedRow } from '../hooks/useSimulator';

const STATUS_COLOURS: Record<FeedRow['status'], 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  ACCEPTED: 'info',
  FILLED: 'success',
  REJECTED: 'warning',
  ERROR: 'error',
};

const ROW_HEIGHT = 40;
const FEED_HEIGHT = 320;

interface LiveFeedProps {
  rows: FeedRow[];
}

export function LiveFeed({ rows }: LiveFeedProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Auto-scroll to bottom when new rows arrive
  useEffect(() => {
    if (!autoScroll || rows.length === 0) return;
    const el = parentRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length, autoScroll]);

  function handleScroll() {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    setAutoScroll(atBottom);
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Live Feed (last {rows.length} orders)
        </Typography>
        {!autoScroll && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setAutoScroll(true);
              const el = parentRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
            aria-label="scroll to bottom"
          >
            Scroll to bottom ↓
          </Button>
        )}
      </Stack>

      <Box
        ref={parentRef}
        onScroll={handleScroll}
        sx={{
          height: FEED_HEIGHT,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
        }}
        aria-label="live feed"
      >
        <Box style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            if (!row) return null;
            return (
              <Stack
                key={vi.key}
                direction="row"
                alignItems="center"
                spacing={1}
                style={{
                  position: 'absolute',
                  top: vi.start,
                  height: ROW_HEIGHT,
                  width: '100%',
                  padding: '0 8px',
                  boxSizing: 'border-box',
                }}
              >
                <Typography variant="caption" color="text.disabled" sx={{ minWidth: 72, fontFamily: 'monospace' }}>
                  {format(new Date(row.ts), 'HH:mm:ss.SSS')}
                </Typography>
                <Typography variant="caption" sx={{ minWidth: 44, fontWeight: 600 }}>{row.symbol}</Typography>
                <Typography variant="caption" sx={{ minWidth: 32 }}>{row.side}</Typography>
                <Typography variant="caption" sx={{ minWidth: 36 }}>{row.quantity ?? '—'}</Typography>
                <Chip label={row.status} size="small" color={STATUS_COLOURS[row.status]} />
                <Typography variant="caption" color="text.secondary">{row.latencyMs}ms</Typography>
                {row.errorMessage && (
                  <Typography variant="caption" color="error.main" noWrap sx={{ flex: 1 }}>
                    {row.errorMessage}
                  </Typography>
                )}
              </Stack>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
