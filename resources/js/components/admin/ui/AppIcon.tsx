/**
 * 管理画面用 MUI Icons マップ（Phase 4）
 * name でよく使うアイコンを @mui/icons-material から統一
 */
import React from 'react';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  WarningAmber as WarningIcon,
  Info as InfoIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Category as CategoryIcon,
  List as ListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material/SvgIcon';

export type AppIconName =
  | 'add'
  | 'edit'
  | 'delete'
  | 'search'
  | 'close'
  | 'check'
  | 'warning'
  | 'info'
  | 'calendar'
  | 'person'
  | 'filter'
  | 'refresh'
  | 'visibility'
  | 'visibilityOff'
  | 'schedule'
  | 'money'
  | 'category'
  | 'list'
  | 'grid';

const ICON_MAP: Record<AppIconName, React.ComponentType<SvgIconProps>> = {
  add: AddIcon,
  edit: EditIcon,
  delete: DeleteIcon,
  search: SearchIcon,
  close: CloseIcon,
  check: CheckIcon,
  warning: WarningIcon,
  info: InfoIcon,
  calendar: CalendarIcon,
  person: PersonIcon,
  filter: FilterIcon,
  refresh: RefreshIcon,
  visibility: VisibilityIcon,
  visibilityOff: VisibilityOffIcon,
  schedule: ScheduleIcon,
  money: AttachMoneyIcon,
  category: CategoryIcon,
  list: ListIcon,
  grid: ViewModuleIcon,
};

export interface AppIconProps extends SvgIconProps {
  name: AppIconName;
}

/**
 * 管理画面でよく使うアイコンを name で指定して表示
 */
const AppIcon: React.FC<AppIconProps> = ({ name, ...props }) => {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent fontSize="inherit" {...props} />;
};

export default AppIcon;
