import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Cards can have different padding sizes
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;  // Is optional that the card has a hover effect
}

// Card main style
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles for all cards
    const baseStyles = 
      'bg-white rounded-xl border border-gray-100 shadow-card';

    // Padding variants
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    // Optional hover effect
    const hoverStyles = hover 
      ? 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer' 
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          paddingStyles[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Sub-components for semantic card structure
// These make card content easier to organize (cleanerand self-documenting), eg:

// <Card>
//   <CardHeader>
//     <CardTitle>Title</CardTitle>
//     <CardDescription>Description</CardDescription>
//   </CardHeader>
//   <CardContent>
//     Content
//   </CardContent>
// </Card>

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-heading text-xl font-semibold text-gray-900',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('font-body text-sm text-gray-500', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Export all card components
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };