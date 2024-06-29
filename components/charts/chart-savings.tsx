import React, { useMemo, useState } from "react";
import { useActions } from 'ai/rsc'

import { ChartComposed } from "./chart-composed";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "../ui/button";
import dayjs from "dayjs";
import { IconSpinner } from "../ui/icons";

export interface ConsumptionDataPoint {
  date: number; // <- Unix
  consumption: number;
  generation: number;
}

export interface SavingsDataPoint {
  date: number; // <- Unix
  costBefore: number;
  costAfter: number;
}

export interface RecommendationItem {
  consumptionData: ConsumptionDataPoint[];
  savingsData: SavingsDataPoint[];
  upfrontCost: number;
  incentives: number;
  paybackPeriod: number;
  revenue5yrs: number;
}


export interface RecommendationOption {
  title: string;
  description: string;
  valueRange: string;
  source: string;
  citationUrl: string;
}
export interface ChartSavingsProps {
  props: {
    recommendations: RecommendationItem[];
    options: RecommendationOption[];
  }
}


export const ChartSavings: React.FC<ChartSavingsProps> = ({ props: { options, recommendations } }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationItem, setRecommendationItem] = useState<RecommendationItem>(recommendations[0]);
  const { submitUserMessage } = useActions();

  const getSelectedOptions = (selectedIndex: number) => {
    const selectedOptions: number[] = [];
    const optionValues = [4, 2, 1];
    let indexRemainder = selectedIndex;
    for (let i = 0; i < optionValues.length; i++) {
      if (indexRemainder / optionValues[i] >= 1) {
        selectedOptions.push(optionValues[i]);
        indexRemainder = indexRemainder - optionValues[i];
      }
    }
    return selectedOptions;
  }

  const { selectedOptions, consumptionData, savingsData, areas, bars, summary, totalCostSavings, totalConsumptionSaved } = useMemo(
    () => {
      const currentSolution = recommendationItem;
      const selectedOptions: number[] = getSelectedOptions(selectedIndex);

      return {
        selectedOptions,
        consumptionData: currentSolution.consumptionData,
        savingsData: currentSolution.savingsData,
        totalConsumptionSaved: currentSolution.consumptionData.reduce((acc, curr) => acc + curr.generation - curr.consumption, 0),
        totalCostSavings: currentSolution.savingsData.reduce((acc, curr) => acc + curr.costBefore - curr.costAfter, 0),
        summary: {
          upfrontCost: currentSolution.upfrontCost,
          incentives: currentSolution.incentives,
          paybackPeriod: currentSolution.paybackPeriod,
          revenue5yrs: currentSolution.revenue5yrs,
        },
        areas: [
          {
            dataKey: 'costBefore',
            fill: '#fdbf6f',
            stroke: '#ff7f00',
          },
          {
            dataKey: 'costAfter',
            fill: '#a6cee3',
            stroke: '#1f78b4',
          },
        ],
        bars: [
          {
            dataKey: 'consumption',
            fill: '#fdbf6f',
            stroke: '#ff7f00',
          },
          {
            dataKey: 'generation',
            fill: '#a6cee3',
            stroke: '#1f78b4',
          },
        ],
      };
    }
    , [recommendations, recommendationItem, selectedIndex, options]
  );

  const handleOptionsChange = async (newSelectedIndex: number) => {
    setIsLoading(true);
    setSelectedIndex(newSelectedIndex);
    try {
      const newSelectedOptionIndexes = getSelectedOptions(newSelectedIndex);

      const newSelectedOptions = newSelectedOptionIndexes.map(i => options[i]);
      const prompt = `Update my chart data so I can see what happens when I wanted to make the following changes: ${newSelectedOptions.map(o => `${o.title}\n${o.description}`).join(',\n\n')}`
      const result = await submitUserMessage(prompt, false);

      setRecommendationItem(result);
    } catch (error) {
      console.log('error :>> ', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col space-y-4 w-full">
      {isLoading && (
        <div className="absolute z-50 w-full h-full top-0 left-0 flex flex-row items-center justify-center bg-white/50 backdrop-blur-sm">
          <IconSpinner className="mr-2 size-12 animate-spin" />
        </div>
      )}
      <div className="flex flex-col w-full gap-4">
        <ChartComposed
          legend
          data={consumptionData}
          containerClassName='h-72 w-full'
          header={{
            title: 'Potential Consumption Data',
            subTitle: `Estimated Savings: ${Math.abs(totalConsumptionSaved)} Kwh`,
          }}
          xAxisProps={{
            dataKey: 'date',
            hide: false,
            tickFormatter: (value) => dayjs(value * 1000).format('ha'),
          }}
          tooltipProps={{
            dateFormat: 'ha',
          }}
          yAxisProps={{ hide: true }}
          bars={bars}
        />
        <ChartComposed
          legend
          data={savingsData}
          containerClassName='h-72 w-full'
          header={{
            title: 'Potential Utility Costs',
            subTitle: `Estimated Savings per Month: ${formatNumber(totalCostSavings)}`,
            // subTitleExtension: '/Mwh',
          }}
          xAxisProps={{
            dataKey: 'date',
            hide: false,
            tickFormatter: (value) => dayjs(value * 1000).format('MMM, \'YY'),
          }}
          yAxisProps={{ hide: true }}
          areas={areas}
        />
      </div>
      <div className="flex flex-row justify-between flex-wrap xl:flex-nowrap gap-8">
        <div className="flex flex-col w-1/2 gap-2">
          <h3>Options:</h3>
          {options.map((option, index) => {
            const optionValue = 2 ** index;
            const isSelected = selectedOptions.includes(optionValue);
            const newSelectedIndex = isSelected ? selectedIndex - optionValue : selectedIndex + optionValue;

            return (
              <button
                key={option.title}
                onClick={() => handleOptionsChange(newSelectedIndex)}
                className={cn('text-left p-2 space-y-2 rounded-md border-2 shadow-md bg-background text-foreground ', isSelected ? 'border-primary' : 'border-background')}
              >
                <h4 className="font-medium">{option.title}</h4>
                <p>{option.description}</p>
                <p className="bold text-green-500">{option.valueRange}</p>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col w-1/2 gap-2">
          <h3 className="font-medium">Summary</h3>
          <div className="flex justify-between w-full">
            <h4>Upfront Cost</h4>
            <p>{formatNumber(summary.upfrontCost)}</p>
          </div>
          <div className="flex justify-between w-full">
            <h4>Incentives</h4>
            <p>{formatNumber(summary.incentives)}</p>
          </div>
          <div className="flex justify-between w-full">
            <h4>Payback Period</h4>
            <p>{summary.paybackPeriod} years</p>
          </div>
          <div className="flex justify-between w-full">
            <h4>Revenue in 5 years</h4>
            <p>{formatNumber(summary.revenue5yrs)}</p>
          </div>

          <Button className="mt-8">Get me Electrified!</Button>
          <p className="text-xs text-center w-full text-balance">Talk to a professional to upgrade your home.</p>
        </div>
      </div>
    </div>
  );
};