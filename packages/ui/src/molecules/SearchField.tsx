import { TextField, InputAdornment, type TextFieldProps } from '../atoms';
import { SearchIcon } from '../icons';

export type SearchFieldProps = TextFieldProps;

export function SearchField({ slotProps, ...props }: SearchFieldProps) {
  return (
    <TextField
      placeholder="Search…"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        },
        ...slotProps,
      }}
      {...props}
    />
  );
}
