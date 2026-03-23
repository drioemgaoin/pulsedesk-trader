import { Chip as MuiChip } from '@mui/material';
import type { ChipProps as MuiChipProps } from '@mui/material';

// label is optional in MUI but a chip without text is meaningless — make it required.
export type ChipProps = Omit<MuiChipProps, 'label'> & {
  label: NonNullable<MuiChipProps['label']>;
};

export function Chip(props: ChipProps) {
  return <MuiChip {...props} />;
}
