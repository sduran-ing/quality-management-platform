import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  // Optional badge for alerts (e.g., "3 overdue")
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  badge,
}: StatCardProps) {

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4 hover:shadow-card-hover transition-shadow duration-200">
      {/* Header - Title and Icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-body text-lg font-semibold text-gray-600">
          {title}
        </h3>
        
        {/* Icon with background */}
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <p className="font-heading text-3xl font-bold text-gray-900">
          {value}
        </p>
      </div>

      {/* Subtitle or Trend */}
      <div className="flex items-center justify-between">
        {/* Left side - Subtitle or Trend */}
        <div className="flex items-center gap-2">
          {trend && (
            <>
              {/* Trend arrow */}
              <span className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}
              </span>
              
              {/* Trend label */}
              <span className="text-sm text-gray-600">
                {trend.label}
              </span>
            </>
          )}
          
          {!trend && subtitle && (
            <span className="text-sm text-gray-600">
              {subtitle}
            </span>
          )}
        </div>

        {/* Right side - Optional badge */}
        {badge && (
          <Badge variant={badge.variant}>
            {badge.text}
          </Badge>
        )}
      </div>
    </div>
  );
}