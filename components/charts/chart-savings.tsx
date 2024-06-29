import React, { useMemo, useState } from "react";
import { ChartComposed } from "./chart-composed";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "../ui/button";

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
  console.log('options, recommendations :>> ', options, recommendations);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { selectedOptions, consumptionData, savingsData, areas, bars, summary, totalCostSavings, totalConsumptionSaved } = useMemo(
    () => {
      const currentSolution = recommendations[selectedIndex];
      const selectedOptions: number[] = [];
      const optionValues = [4, 2, 1, 0];
      for (let i = 0; i < optionValues.length; i++) {
        if (selectedIndex % optionValues[i] > 0) {
          selectedOptions.push(optionValues[i]);
        }
      }

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
    , [recommendations, selectedIndex, options]
  )

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex flex-row justify-between flex-wrap w-full">
        <ChartComposed
          data={consumptionData}
          containerClassName='h-72 w-3/5'
          header={{
            title: 'Potential Consumption Data',
            subTitle: `Estimated Savings: ${totalConsumptionSaved} Kwh`,
          }}
          xAxisProps={{
            dataKey: 'date',
            hide: false,
          }}
          yAxisProps={{ hide: true }}
          bars={bars}
        />
        <ChartComposed
          data={savingsData}
          containerClassName='h-72 w-2/5'
          header={{
            title: 'Potential Utility Costs',
            subTitle: `Estimated Savings: ${formatNumber(totalCostSavings)}`,
            // subTitleExtension: '/Mwh',
          }}
          xAxisProps={{
            dataKey: 'date',
            hide: false,
          }}
          yAxisProps={{ hide: true }}
          areas={areas}
        />
      </div>
      <div className="flex flex-row justify-between flex-wrap">
        <div className="flex flex-col w-1/2">
          <h3>Options:</h3>
          {options.map((option, index) => {
            const optionValue = 2 ** index;
            const isSelected = selectedOptions.includes(optionValue);
            const newSelectedIndex = isSelected ? selectedIndex - optionValue : selectedIndex + optionValue;

            return (
              <button
                key={option.title}
                onClick={() => setSelectedIndex(newSelectedIndex)}
                className={cn('text-left p-2 space-y-2 rounded-md border-2 shadow-md bg-background text-foreground ', isSelected ? 'border-primary' : 'border-background')}
              >
                <h4 className="font-medium">{option.title}</h4>
                <p>{option.description}</p>
                <p className="bold text-green-500">{option.valueRange}</p>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col w-1/3 space-y-2">
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

          <Button>Get me home-ed</Button>
        </div>
      </div>
    </div>
  );
};