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
  title: string;
  description: string;
  valueRange: string;
  consumptionData: ConsumptionDataPoint[];
  savingsData: SavingsDataPoint[];
  upfrontCost: number;
  incentives: number;
  paybackPeriod: number;
  revenue5yrs: number;
  source: string;
  citationUrl: string;
}

export interface Solutions {
  [key: string]: RecommendationItem;
}

export interface ChartSavingsProps {
  data: Solutions;
}

export const ChartSavings: React.FC<ChartSavingsProps> = ({ data }) => {
  const [currentSolution, setCurrentSolution] = useState<RecommendationItem>(Object.values(data)[0]);
  const { consumptionData, savingsData, areas, bars, summary, totalCostSavings, totalConsumptionSaved } = useMemo(
    () => {
      return {
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
            fill: '#FFDC00',
            stroke: '#DFDA00',
          },
          {
            dataKey: 'costAfter',
            fill: '#2ECC40',
            stroke: '#0EAC20',
          },
        ],
        bars: [
          {
            dataKey: 'consumption',
            fill: '#FFDC00',
            stroke: '#DFDA00',
          },
          {
            dataKey: 'generation',
            fill: '#2ECC40',
            stroke: '#0EAC20',
          },
        ],
      };
    }
    , [currentSolution, data]
  )

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-row justify-between flex-wrap">
        <ChartComposed
          data={consumptionData}
          containerClassName='h-72 w-1/2'
          header={{
            title: 'Potential Consumption Data',
            subTitle: `Estimated Savings: ${totalConsumptionSaved} Kwh`,
          }}
          xAxisProps={{
            dataKey: 'date',
            axisLine: false,
          }}
          yAxisProps={{ hide: true }}
          bars={bars}
        />
        <ChartComposed
          data={savingsData}
          containerClassName='h-72 w-1/3'
          header={{
            title: 'Potential Utility Costs',
            subTitle: `Estimated Savings: ${formatNumber(totalCostSavings)}`,
            // subTitleExtension: '/Mwh',
          }}
          xAxisProps={{
            dataKey: 'date',
            axisLine: false,
          }}
          yAxisProps={{ hide: true }}
          areas={areas}
        />
      </div>
      <div className="flex flex-row justify-between flex-wrap">
        <div className="flex flex-col w-1/2">
          <h3>Options:</h3>
          {Object.entries(data).map(([key, solution]) => (
            <button
              key={key}
              onClick={() => setCurrentSolution(solution)}
              className={cn('p-2 rounded-md border shadow-md', currentSolution === solution ? 'bg-primary text-primary-foreground' : 'bg-background text-primary')}
            >
              <h4>{solution.title}</h4>
              <p>{solution.description}</p>
              <p className="bold text-green-500">{solution.valueRange}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-col w-1/3">
          <h3>Summary</h3>
          <div>
            <h4>Upfront Cost</h4>
            <p>{formatNumber(summary.upfrontCost)}</p>
          </div>
          <div>
            <h4>Incentives</h4>
            <p>{formatNumber(summary.incentives)}</p>
          </div>
          <div>
            <h4>Payback Period</h4>
            <p>{summary.paybackPeriod} years</p>
          </div>
          <div>
            <h4>Revenue in 5 years</h4>
            <p>{formatNumber(summary.revenue5yrs)}</p>
          </div>

          <Button>Get me home-ed</Button>
        </div>
      </div>
    </div>
  );
};