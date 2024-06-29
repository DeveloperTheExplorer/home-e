import React from 'react';
import dayjs from 'dayjs';

import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { cn, formatCompactNumber } from '@/lib/utils';

export type ChartToolTip<TValue extends ValueType, TName extends NameType> = TooltipProps<TValue, TName> & {
  dateFormat?: string;
};

const ChartToolTip = <TValue extends ValueType, TName extends NameType>({
  active,
  payload,
  label,
  labelFormatter,
  dateFormat,
  ...rest
}: ChartToolTip<TValue, TName>) => {
  if (!active || !payload?.length) {
    return null;
  }
  let formattedLabel = label;
  const isDate = dayjs(formattedLabel).isValid();

  if (labelFormatter) {
    formattedLabel = labelFormatter(label, payload);
  }
  if (label === '--/--/--') {
    formattedLabel = '';
  }
  if (isDate) {
    if (!isNaN(formattedLabel)) {
      formattedLabel = Number(formattedLabel) * 1000;
    }
    formattedLabel = dayjs(formattedLabel).format(dateFormat ?? 'MMM DD, YYYY');
  }

  return (
    <div
      className={cn('rounded-md border-bg2 !bg-white/70 p-4 shadow-md backdrop-blur-sm', rest.wrapperClassName)}
    >
      {formattedLabel ? <p className='text-md font-medium uppercase'>{formattedLabel}</p> : null}
      {payload.map(({ dataKey, value, color, unit, payload }) => {
        const { fill, unit: pUnit } = payload;
        const displayColor = fill || color;
        const displayUnit = unit || pUnit;
        let formattedValue = formatCompactNumber(Math.abs(value as number), 3);

        if (displayUnit === 'Loading...') {
          formattedValue = '';
        }

        return (
          <div key={`tooltip-payload-${dataKey}-${color}`} className='flex flex-row items-center gap-2'>
            <span
              className={`h-2 w-2`}
              style={{
                backgroundColor: displayColor,
              }}
            />
            <p className=''>
              {formattedValue} {displayUnit}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default ChartToolTip;
