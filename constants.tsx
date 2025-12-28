
import { Category, Priority, Status } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.ACADEMICS]: 'bg-[#231942] text-[#E0E0E0] border-[#5E548E]/20',
  [Category.DSWS]: 'bg-[#BEB4D6] text-[#231942] border-[#231942]/10',
  [Category.BANDA]: 'bg-[#5E548E] text-[#E0E0E0] border-[#E0E0E0]/30',
  [Category.PERSONAL]: 'bg-white text-[#5E548E] border-[#5E548E]/50',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.URGENT]: 'bg-[#231942] text-[#E0E0E0] border border-[#BEB4D6]/20',
  [Priority.HIGH]: 'bg-[#5E548E] text-[#E0E0E0] border border-[#231942]/20',
  [Priority.MEDIUM]: 'bg-[#BEB4D6] text-[#231942]',
  [Priority.LOW]: 'bg-white text-[#231942] border border-gray-200',
};

export const STATUS_COLORS: Record<Status, string> = {
  [Status.PENDING]: 'bg-[#231942]/20 text-[#231942] border-[#231942]/10',
  [Status.BEGAN]: 'bg-[#5E548E] text-[#E0E0E0] border-[#5E548E]/30',
  [Status.FINISHED]: 'bg-[#BEB4D6] text-[#231942] border-[#BEB4D6]/20',
};
