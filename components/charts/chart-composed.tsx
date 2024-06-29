import React, { useMemo } from 'react';

import { camelCase } from '@/lib/utils';
import dayjs from 'dayjs';

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LineProps,
  BarProps,
  AreaProps,
  XAxisProps,
  YAxisProps,
  TooltipProps,
  Bar,
  Area,
} from 'recharts';
import ChartHeader, { ChartHeaderProps } from './chart-header';
import { CompStatusData } from '@/lib/types';

export type LineConfig<T> = Omit<LineProps, 'dataKey' | 'ref'> & {
  dataKey: keyof T | string;
};
export type BarConfig<T> = Omit<BarProps, 'dataKey' | 'ref'> & {
  dataKey: keyof T | string;
};
export type AreaConfig<T> = Omit<AreaProps, 'dataKey' | 'ref'> & {
  dataKey: keyof T | string;
};

export interface ChartComposedProps<T> extends CompStatusData {
  className?: string;

  containerClassName?: string;

  /**
   * Data to be displayed in the chart
   */
  data?: T[];

  /**
   * Whether to display the grid or not
   */
  grid?: boolean;

  xAxisProps?: XAxisProps;
  yAxisProps?: YAxisProps;

  /**
   * Whether to display the reference line or not
   */
  refLine?: boolean;

  /**
   * Whether to display the legend or not
   */
  legend?: boolean;

  /**
   * Whether to display the tooltip or not
   */
  tooltip?: boolean;

  /**
   * Configuration for the areas | Actual lines/areas seen in the chart
   */
  areas?: AreaConfig<T>[];

  /**
   * Configuration for the bars | Actual bars seen in the chart
   */
  bars?: BarConfig<T>[];

  /**
   * Configuration for the lines | Actual lines seen in the chart
   */
  lines?: LineConfig<T>[];

  /**
   * Header config of the chart
   */
  header?: ChartHeaderProps;

  /**
   * Tooltip config of the chart
   * @default {}
   * @see https://recharts.org/en-US/api/Tooltip
   */
  tooltipProps?: TooltipProps<any, string>;

  children?: React.ReactNode;

  /**
   * Only for storybook
   */
  testMode?: boolean;
}

const formatDateTick = (formatter?: XAxisProps['tickFormatter']) => (tick: string, index: number) => {
  if (tick === '--/--/--') {
    return tick;
  }

  if (formatter) {
    return formatter(tick, index);
  }

  const isDate = dayjs(tick).isValid();

  if (!isDate) {
    return tick;
  }
  return dayjs(tick).format('MMM, YYYY');
};

export function ChartComposed<T extends object>({
  className,
  containerClassName,
  data,
  header,
  xAxisProps,
  yAxisProps,
  refLine = false,
  grid = false,
  legend = false,
  tooltip = true,
  tooltipProps,
  areas,
  bars,
  lines,
  children,
  testMode = false,
  ...status
}: ChartComposedProps<T>) {
  const isLoading = !data || status.isLoading;
  const { memoizedData, memoizedLines, memoizedAreas, memoizedBars } = useMemo(() => {
    return {
      memoizedData: data || [],
      memoizedAreas: [
        ...(areas || []),
      ],
      memoizedLines: [
        ...(lines || []),
      ],
      memoizedBars: [
        ...(bars || []),
      ],
    };
  }, [data, lines, isLoading]);

  return (
    <>
      {header && <ChartHeader {...header} />}
      <ResponsiveContainer width={testMode ? 750 : '100%'} height={testMode ? 500 : '100%'}>
        <ComposedChart
          data={memoizedData}
          margin={{
            right: 5,
            left: 5,
            bottom: 20,
          }}
        >
          <defs>
            {areas?.map(({ dataKey, fill }) => {
              const fillId = camelCase(dataKey as string);

              return (
                <linearGradient key={fillId} id={`color-${fillId}`} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor={fill} stopOpacity={0.75} />
                  <stop offset='80%' stopColor={fill} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          {grid && <CartesianGrid strokeDasharray='3 3' />}
          <XAxis
            axisLine={false}
            tickLine={false}
            {...xAxisProps}
            tickFormatter={formatDateTick(xAxisProps?.tickFormatter)}
            style={{ transform: 'translateY(10px)' }}
          />
          <YAxis
            {...yAxisProps}
            label={
              yAxisProps?.label && {
                value: yAxisProps.label,
                rotate: -90,
                position: 'insideLeft',
              }
            }
          />
          {tooltip && <Tooltip {...tooltipProps} />}
          {/* {tooltip && <Tooltip content={<ChartToolTip />} {...tooltipProps} />} */}
          {legend && <Legend verticalAlign='top' />}
          {refLine && <ReferenceLine y={0} stroke='#000' />}
          {memoizedLines?.map(line => {
            const { dataKey, ...lineProps } = line;

            return <Line {...lineProps} key={dataKey as string} dataKey={dataKey as string} strokeWidth={2} />;
          })}
          {memoizedBars?.map(bar => {
            return (
              <Bar
                key={bar.dataKey as string}
                stackId='stack'
                {...bar}
                maxBarSize={32}
                dataKey={bar.dataKey as string}
              />
            );
          })}
          {memoizedAreas?.map(({ dataKey, ...rest }) => {
            const id = dataKey as string;
            const fillId = camelCase(id);

            return (
              <Area
                {...rest}
                key={dataKey as string}
                type='monotone'
                dataKey={dataKey as string}
                fillOpacity={1}
                fill={`url(#color-${fillId})`}
              />
            );
          })}
          {children}
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}
