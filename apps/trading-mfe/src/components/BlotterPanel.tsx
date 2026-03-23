import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Chip,
  FilterListIcon,
  IconButton,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  KeyboardArrowDownIcon,
  StatusChip,
  tableRowSx,
} from "@pulsedesk/ui";
import { useOrdersQuery } from "../hooks/useOrdersQuery";
import { PositionsPanel } from "./PositionsPanel";
import type { OrderStatus } from "../api/types";

type MainTab = "ORDERS" | "POSITIONS";
type StatusFilter = "ALL" | "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface BlotterPanelProps {
  accountId: string;
  /** When provided, a collapse toggle button appears in the tab bar */
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "All",
  PENDING: "Open",
  FILLED: "Filled",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function BlotterPanel({
  accountId,
  isCollapsed,
  onCollapseToggle,
}: BlotterPanelProps) {
  const [mainTab, setMainTab] = useState<MainTab>("ORDERS");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [filterOpen, setFilterOpen] = useState(false);

  const queryStatus: OrderStatus | undefined =
    statusFilter === "FILLED"
      ? "FILLED"
      : statusFilter === "CANCELLED"
        ? "CANCELLED"
        : statusFilter === "REJECTED"
          ? "REJECTED"
          : undefined;

  const {
    data: page,
    isLoading,
    isError,
  } = useOrdersQuery(
    accountId,
    mainTab === "POSITIONS" ? undefined : queryStatus,
  );

  const allOrders = page?.orders ?? [];

  // "Open" = PENDING (risk not yet checked) + ACCEPTED (risk-approved, awaiting fill)
  const openOrders = allOrders.filter(
    (o) => o.status === "PENDING" || o.status === "ACCEPTED",
  );
  const orders = statusFilter === "PENDING" ? openOrders : allOrders;
  const pendingCount = openOrders.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Toolbar: tab nav + filter toggle + collapse ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          pr: 0.5,
          bgcolor: "var(--pd-bg-surface)",
        }}
      >
        <Tabs
          value={mainTab}
          onChange={(_, v: MainTab) => {
            setMainTab(v);
            setFilterOpen(false);
            setStatusFilter("ALL");
          }}
          aria-label="blotter panels"
          sx={{
            flex: 1,
            minHeight: 48,
            "& .MuiTab-root": {
              minHeight: 48,
              px: 3,
              fontSize: "0.8125rem",
              fontWeight: 500,
              textTransform: "none",
              letterSpacing: 0,
              color: "text.secondary",
              "&.Mui-selected": { color: "text.primary", fontWeight: 600 },
            },
            "& .MuiTabs-indicator": { height: 2 },
          }}
        >
          <Tab label="Orders" value="ORDERS" />
          <Tab label="Positions" value="POSITIONS" />
        </Tabs>

        {/* Active-filter summary chip — visible only when filter bar is collapsed */}
        {mainTab === "ORDERS" && !filterOpen && statusFilter !== "ALL" && (
          <Chip
            label={STATUS_LABELS[statusFilter]}
            size="small"
            onDelete={() => setStatusFilter("ALL")}
            sx={{
              mr: 1,
              height: 22,
              fontSize: "0.6875rem",
              fontWeight: 600,
              bgcolor: "primary.main",
              color: (t) => t.palette.getContrastText(t.palette.primary.main),
              "& .MuiChip-deleteIcon": {
                color: "inherit",
                opacity: 0.7,
                fontSize: 14,
                "&:hover": { opacity: 1 },
              },
            }}
          />
        )}

        {/* Filter toggle — only on Orders tab */}
        {mainTab === "ORDERS" && (
          <Tooltip title={filterOpen ? "Hide filters" : "Show filters"}>
            <IconButton
              size="small"
              onClick={() => setFilterOpen((p) => !p)}
              aria-label={
                filterOpen ? "hide order filters" : "show order filters"
              }
              sx={{
                color:
                  statusFilter !== "ALL" ? "primary.main" : "text.secondary",
                mr: 0.25,
              }}
            >
              <Badge
                variant="dot"
                color="primary"
                invisible={statusFilter === "ALL" || filterOpen}
              >
                <FilterListIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        {/* Collapse panel toggle */}
        {onCollapseToggle && (
          <Tooltip title={isCollapsed ? "Expand panel" : "Collapse panel"}>
            <IconButton
              size="small"
              onClick={onCollapseToggle}
              aria-label={
                isCollapsed ? "expand bottom panel" : "collapse bottom panel"
              }
              sx={{ color: "text.secondary" }}
            >
              <KeyboardArrowDownIcon
                fontSize="small"
                sx={{
                  transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Collapsible filter strip ── */}
      {mainTab === "ORDERS" && (
        <Box
          sx={{
            flexShrink: 0,
            maxHeight: filterOpen ? 80 : 0,
            overflow: "hidden",
            transition: "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 2,
              bgcolor: "var(--pd-bg-raised)",
              borderBottom: 1,
              borderColor: "divider",
              overflowX: "auto",
              mb: 2,
            }}
          >
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v: StatusFilter) => {
                if (v) setStatusFilter(v);
              }}
              aria-label="filter by status"
              sx={{
                gap: 2,
                display: "flex",
                "& .MuiToggleButtonGroup-grouped": {
                  border: "1px solid !important",
                  borderColor: "divider !important",
                  borderRadius: "6px !important",
                  px: 1.75,
                  py: 0,
                  height: 30,
                  minWidth: "auto",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "none",
                  letterSpacing: "0.01em",
                  color: "text.secondary",
                  lineHeight: 1,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    borderColor: "primary.main",
                    color: (t) =>
                      t.palette.getContrastText(t.palette.primary.main),
                    fontWeight: 700,
                  },
                  "&:hover:not(.Mui-selected)": {
                    bgcolor: "action.hover",
                    borderColor: "text.secondary",
                    color: "text.primary",
                  },
                },
              }}
            >
              <ToggleButton value="ALL">All</ToggleButton>
              <ToggleButton value="PENDING">
                <Badge
                  badgeContent={pendingCount || undefined}
                  color="warning"
                  sx={{
                    "& .MuiBadge-badge": {
                      right: -10,
                      top: -1,
                      fontSize: "0.6rem",
                      minWidth: 15,
                      height: 15,
                      px: 0.25,
                    },
                  }}
                >
                  <Box component="span" sx={{ pr: pendingCount ? 1.25 : 0 }}>
                    Open
                  </Box>
                </Badge>
              </ToggleButton>
              <ToggleButton value="FILLED">Filled</ToggleButton>
              <ToggleButton value="REJECTED">Rejected</ToggleButton>
              <ToggleButton value="CANCELLED">Cancelled</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* ── Content ── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Positions panel */}
        {mainTab === "POSITIONS" && <PositionsPanel accountId={accountId} />}

        {/* Orders table */}
        {mainTab === "ORDERS" && (
          <>
            {isError && orders.length === 0 && (
              <Alert severity="error" sx={{ m: 1 }}>
                Failed to load orders. Retrying…
              </Alert>
            )}

            <Table
              size="small"
              sx={{
                "& .MuiTableBody-root .MuiTableCell-root": {
                  height: 44,
                  py: 0,
                  verticalAlign: "middle",
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
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Time
                  </TableCell>
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
                    sx={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "text.disabled",
                      py: 1,
                    }}
                  >
                    Side
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "text.disabled",
                      py: 1,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Type
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
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Qty
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
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    Limit
                  </TableCell>
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
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading &&
                  orders.length === 0 &&
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <TableCell key={j}>
                          <Skeleton
                            height={14}
                            width={`${40 + ((i * j * 13) % 40)}%`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!isLoading && orders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ color: "text.disabled", py: 3 }}
                    >
                      {statusFilter === "PENDING"
                        ? "No open orders."
                        : "No orders matching filter."}
                    </TableCell>
                  </TableRow>
                )}

                {orders.map((order, index) => (
                  <TableRow
                    key={order.id}
                    sx={tableRowSx(index)}
                  >
                    <TableCell
                      sx={{
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      {formatTime(order.createdAt)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {order.symbol}
                    </TableCell>
                    <TableCell
                      sx={{
                        color:
                          order.side === "BUY"
                            ? "trading.uptick"
                            : "trading.downtick",
                        fontWeight: 700,
                      }}
                    >
                      {order.side}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "text.secondary",
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      {order.type}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      {order.quantity}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                        display: { xs: "none", md: "table-cell" },
                      }}
                    >
                      {order.limitPrice != null
                        ? order.limitPrice.toFixed(2)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          </>
        )}
      </Box>
    </Box>
  );
}
