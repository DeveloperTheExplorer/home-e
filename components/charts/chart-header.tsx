import React from 'react';
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button';

export interface ChartBtn {
  active?: boolean;
  label: string;
  className?: string;
  value?: string | number | boolean;
  onClick: (value?: string | number | boolean) => void;
}

export interface ChartHeaderProps {
  className?: string;
  /**
   * Title of the chart
   */
  title?: string;

  /**
   * Subtitle of the chart
   */
  subTitle?: string;

  /**
   * Addiotional text for subtitle
   */
  subTitleExtension?: string;

  /**
   * Buttons to be displayed on the top right corner of the chart
   */
  btns?: ChartBtn[];
}

const ChartHeader: React.FC<ChartHeaderProps> = ({ className, title, subTitle, subTitleExtension, btns }) => {
  const containerClasses = cn('flex flex-row justify-between items-start py-2', className);

  return (
    <div className={containerClasses}>
      <div className='flex flex-col gap-2'>
        {title && <h3 className='font-body text-lg font-semibold uppercase leading-none text-text'>{title}</h3>}
        {subTitle && (
          <h2 className='flex flex-row items-end gap-1 leading-none'>
            {subTitle}
            {subTitleExtension && (
              <span className='font-body text-base font-light leading-none text-text'>{subTitleExtension}</span>
            )}
          </h2>
        )}
      </div>

      <div className='flex flex-row gap-2 justify-self-end'>
        {btns?.map(btn => (
          <Button
            key={btn.label}
            className={cn('px-4', !btn.active && 'opacity-75')}
            variant='default'
            size='sm'
            onClick={() => btn.onClick(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ChartHeader;
