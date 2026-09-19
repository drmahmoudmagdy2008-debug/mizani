export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'أكل وشرب', icon: 'restaurant', color: '#f97316', type: 'expense' },
  { id: 'transport', name: 'مواصلات', icon: 'directions_car', color: '#3b82f6', type: 'expense' },
  { id: 'bills', name: 'فواتير', icon: 'receipt_long', color: '#8b5cf6', type: 'expense' },
  { id: 'shopping', name: 'تسوق', icon: 'shopping_bag', color: '#ec4899', type: 'expense' },
  { id: 'health', name: 'صحة', icon: 'health_and_safety', color: '#ef4444', type: 'expense' },
  { id: 'education', name: 'تعليم', icon: 'school', color: '#06b6d4', type: 'expense' },
  { id: 'entertainment', name: 'ترفيه', icon: 'sports_esports', color: '#a855f7', type: 'expense' },
  { id: 'home', name: 'بيت', icon: 'home', color: '#14b8a6', type: 'expense' },
  { id: 'family', name: 'أسرة', icon: 'family_restroom', color: '#f43f5e', type: 'expense' },
  { id: 'gifts', name: 'هدايا', icon: 'featured_seasonal_and_gifts', color: '#e11d48', type: 'expense' },
  { id: 'subscriptions', name: 'اشتراكات', icon: 'subscriptions', color: '#6366f1', type: 'expense' },
  { id: 'other_exp', name: 'مصروف تاني', icon: 'more_horiz', color: '#64748b', type: 'expense' },
  { id: 'salary', name: 'مرتب', icon: 'payments', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'شغل حر', icon: 'work', color: '#22c55e', type: 'income' },
  { id: 'business', name: 'مشروع', icon: 'storefront', color: '#84cc16', type: 'income' },
  { id: 'gift_in', name: 'هدية', icon: 'redeem', color: '#34d399', type: 'income' },
  { id: 'other_inc', name: 'دخل تاني', icon: 'add_card', color: '#059669', type: 'income' },
]

export const DEFAULT_WALLETS = [
  { id: 'cash', name: 'كاش', icon: 'payments', color: '#10b981', balance: 0 },
  { id: 'bank', name: 'حساب بنكي', icon: 'account_balance', color: '#3b82f6', balance: 0 },
  { id: 'card', name: 'فيزا', icon: 'credit_card', color: '#8b5cf6', balance: 0 },
  { id: 'ewallet', name: 'محفظة إلكترونية', icon: 'account_balance_wallet', color: '#f59e0b', balance: 0 },
]

export const CURRENCIES = [
  { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي' },
  { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
  { code: 'USD', symbol: '$', name: 'دولار' },
  { code: 'EUR', symbol: '€', name: 'يورو' },
]

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
