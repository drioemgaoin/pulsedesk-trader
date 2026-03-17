import { TableCell, TableSortLabel, Tooltip } from '@pulsedesk/ui';
import type { SortKey, SortState } from '../lib/portfolioCalc';

export interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  align?: 'left' | 'right';
  tooltip?: string;
  sx?: object;
  sort: SortState;
  onSort: (key: SortKey) => void;
}

export function SortableHeader({
  label,
  sortKey,
  align = 'right',
  tooltip,
  sx: extraSx,
  sort,
  onSort,
}: SortableHeaderProps) {
  return (
    <TableCell
      align={align}
      sortDirection={sort.key === sortKey ? sort.direction : false}
      sx={{
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        py: 1,
        ...extraSx,
      }}
    >
      <TableSortLabel
        active={sort.key === sortKey}
        direction={sort.key === sortKey ? sort.direction : 'asc'}
        onClick={() => onSort(sortKey)}
      >
        {tooltip ? (
          <Tooltip title={tooltip} placement="top">
            <span aria-label={label}>{label}</span>
          </Tooltip>
        ) : label}
      </TableSortLabel>
    </TableCell>
  );
}
