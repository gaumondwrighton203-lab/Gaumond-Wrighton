import React, { useState } from 'react';
import { CalculatedReading, getShortMonthLabel } from '../utils/calculations';
import { Droplet, Flame, Zap, DollarSign, TrendingUp, BarChart3, PieChart } from 'lucide-react';

interface AnalyticsChartsProps {
  calculatedReadings: CalculatedReading[];
  currency: string;
}

type MetricType = 'coldWater' | 'hotWater' | 'electricity' | 'totalCost';

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  calculatedReadings,
  currency
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('totalCost');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Filter out the baseline first record for usage-based metrics (since it has 0 consumption)
  const readingsWithDiffs = calculatedReadings.filter(r => r.prevReading !== null);
  
  // For cost metric, we can show all or just calculated ones. Let's show those with previous readings since consumption is needed to have cost.
  const chartData = readingsWithDiffs;

  const getMetricDetails = (type: MetricType) => {
    switch (type) {
      case 'coldWater':
        return {
          label: 'Холодная вода №11',
          unit: 'м³',
          color: 'from-blue-500 to-cyan-400',
          lineColor: 'stroke-blue-400',
          bgColor: 'bg-blue-500/10 text-blue-500',
          icon: Droplet,
          getValue: (r: CalculatedReading) => r.coldDiff,
          getCost: (r: CalculatedReading) => r.coldCost
        };
      case 'hotWater':
        return {
          label: 'Горячая вода №13',
          unit: 'м³',
          color: 'from-red-500 to-orange-400',
          lineColor: 'stroke-red-400',
          bgColor: 'bg-red-500/10 text-red-500',
          icon: Flame,
          getValue: (r: CalculatedReading) => r.hotDiff,
          getCost: (r: CalculatedReading) => r.hotCost
        };
      case 'electricity':
        return {
          label: 'Электричество',
          unit: 'кВт·ч',
          color: 'from-yellow-500 to-amber-400',
          lineColor: 'stroke-yellow-400',
          bgColor: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
          icon: Zap,
          getValue: (r: CalculatedReading) => r.elecDiff + r.elecHalfPeakDiff + r.elecNightDiff,
          getCost: (r: CalculatedReading) => r.elecCost + r.elecHalfPeakCost + r.elecNightCost
        };
      case 'totalCost':
      default:
        return {
          label: 'Общая стоимость',
          unit: currency,
          color: 'from-emerald-500 to-teal-400',
          lineColor: 'stroke-emerald-400',
          bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          icon: BarChart3,
          getValue: (r: CalculatedReading) => r.totalCost,
          getCost: (r: CalculatedReading) => r.totalCost
        };
    }
  };

  const metric = getMetricDetails(activeMetric);

  // Math Calculations for Chart
  const values = chartData.map(r => metric.getValue(r));
  const maxVal = values.length > 0 ? Math.max(...values, 1) : 1;
  const avgVal = values.length > 0 ? parseFloat((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1)) : 0;
  const totalVal = values.length > 0 ? parseFloat(values.reduce((sum, v) => sum + v, 0).toFixed(1)) : 0;

  // Chart layout specs
  const chartHeight = 160;
  const paddingBottom = 25;
  const paddingTop = 15;
  const availableHeight = chartHeight - paddingTop - paddingBottom;

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] p-6 text-center border border-black/[0.04] dark:border-white/[0.05]">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mx-auto mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">Недостаточно данных</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
          Для построения аналитики необходимо ввести как минимум 2 показания в разные месяцы, чтобы рассчитать разницу потребления.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* iOS Segmented Control */}
      <div className="bg-gray-100 dark:bg-black/45 p-0.5 rounded-xl flex items-center shrink-0">
        {(['totalCost', 'coldWater', 'hotWater', 'electricity'] as MetricType[]).map((type) => {
          const isActive = activeMetric === type;
          const label = type === 'totalCost' ? 'Сумма' : type === 'coldWater' ? 'ХВ' : type === 'hotWater' ? 'ГВ' : 'Элек';
          return (
            <button
              key={type}
              onClick={() => setActiveMetric(type)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-ios-card-dark text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Stats Bento Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Metric Card */}
        <div className="bg-white dark:bg-[#1c1c1e] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Всего потреблено</span>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {totalVal.toLocaleString('ru-RU')}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">
              {metric.unit}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1.5">за весь период учета</span>
        </div>

        {/* Average Monthly Card */}
        <div className="bg-white dark:bg-[#1c1c1e] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] flex flex-col justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">В среднем за месяц</span>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {avgVal.toLocaleString('ru-RU')}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">
              {metric.unit}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1.5">типичный расход в месяц</span>
        </div>
      </div>

      {/* Main Bar Chart Panel */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`p-1.5 rounded-lg ${metric.bgColor}`}>
              <metric.icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              {metric.label} ({metric.unit})
            </span>
          </div>
          {hoveredBarIndex !== null && (
            <div className="text-[11px] font-extrabold text-ios-blue animate-fade-in">
              {getShortMonthLabel(chartData[hoveredBarIndex].reading.date)}:{' '}
              {metric.getValue(chartData[hoveredBarIndex]).toLocaleString('ru-RU')}{' '}
              {metric.unit}
            </div>
          )}
        </div>

        {/* SVG Render Frame */}
        <div className="relative h-[160px] w-full">
          <svg className="w-full h-full" viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            <line x1="0" y1={paddingTop} x2="100" y2={paddingTop} className="stroke-gray-100 dark:stroke-gray-800/60" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1={paddingTop + availableHeight / 2} x2="100" y2={paddingTop + availableHeight / 2} className="stroke-gray-100 dark:stroke-gray-800/60" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1={chartHeight - paddingBottom} x2="100" y2={chartHeight - paddingBottom} className="stroke-gray-200 dark:stroke-gray-800" strokeWidth="0.5" />

            {/* Average Indicator Line */}
            {avgVal > 0 && (
              <g>
                <line
                  x1="0"
                  y1={chartHeight - paddingBottom - (avgVal / maxVal) * availableHeight}
                  x2="100"
                  y2={chartHeight - paddingBottom - (avgVal / maxVal) * availableHeight}
                  className="stroke-ios-orange/60"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                />
              </g>
            )}

            {/* Bar Elements */}
            {chartData.map((item, index) => {
              const val = metric.getValue(item);
              const barHeight = (val / maxVal) * availableHeight;
              const colWidth = 100 / chartData.length;
              const barWidth = Math.min(colWidth * 0.5, 4); // max size 4% of svg width
              const barX = index * colWidth + (colWidth - barWidth) / 2;
              const barY = chartHeight - paddingBottom - barHeight;

              // Color gradients or classes
              const isHovered = hoveredBarIndex === index;

              return (
                <g key={item.reading.id}>
                  {/* Interactive Trigger area */}
                  <rect
                    x={index * colWidth}
                    y="0"
                    width={colWidth}
                    height={chartHeight - paddingBottom}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onTouchStart={() => setHoveredBarIndex(index)}
                  />

                  {/* Visual Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight > 1 ? barHeight : 1} // Ensure at least 1px visible
                    rx={barWidth / 2}
                    className={`transition-all duration-300 fill-url(#barGrad-${activeMetric}) ${
                      isHovered ? 'opacity-100' : 'opacity-85'
                    }`}
                  />
                </g>
              );
            })}

            {/* Color Gradients definitions */}
            <defs>
              <linearGradient id="barGrad-coldWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="barGrad-hotWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="barGrad-electricity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="barGrad-totalCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Month Labels overlay (HTML for pristine typography) */}
          <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2">
            {chartData.map((item, index) => {
              const colWidth = 100 / chartData.length;
              return (
                <div
                  key={item.reading.id}
                  style={{ width: `${colWidth}%` }}
                  className={`text-[9px] font-bold text-center select-none truncate ${
                    hoveredBarIndex === index
                      ? 'text-ios-blue'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {getShortMonthLabel(item.reading.date)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart Legend */}
        {avgVal > 0 && (
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800/60 pt-2">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t border-dashed border-ios-orange block" />
              <span>Среднее значение: {avgVal} {metric.unit}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] italic">
              <TrendingUp className="w-3 h-3 text-ios-blue" />
              <span>Тапните на столбец для просмотра деталей</span>
            </div>
          </div>
        )}
      </div>

      {/* Resource cost breakdown bento block */}
      {activeMetric === 'totalCost' && chartData.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.05]">
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider">
            Распределение затрат по месяцам (в {currency})
          </h4>
          <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar">
            {chartData.map((item) => {
              const totalCost = item.totalCost;
              if (totalCost === 0) return null;
              
              const coldPct = (item.coldCost / totalCost) * 100;
              const hotPct = (item.hotCost / totalCost) * 100;
              const elecTotalCost = item.elecCost + item.elecHalfPeakCost + item.elecNightCost;
              const elecPct = (elecTotalCost / totalCost) * 100;

              return (
                <div key={item.reading.id} className="text-xs flex flex-col gap-1 py-1.5 border-b border-gray-50 dark:border-gray-800/40 last:border-0">
                  <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-300">
                    <span>{new Date(item.reading.date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                    <span className="font-extrabold text-ios-green">{totalCost.toLocaleString('ru-RU')} {currency}</span>
                  </div>
                  {/* Visual percentage stacked bar */}
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800/50 mt-0.5">
                    {coldPct > 0 && <div style={{ width: `${coldPct}%` }} className="bg-blue-500 h-full" title={`ХВС: ${item.coldCost} ${currency}`} />}
                    {hotPct > 0 && <div style={{ width: `${hotPct}%` }} className="bg-red-500 h-full" title={`ГВС: ${item.hotCost} ${currency}`} />}
                    {elecPct > 0 && <div style={{ width: `${elecPct}%` }} className="bg-yellow-500 h-full" title={`Электро: ${elecTotalCost} ${currency}`} />}
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>💧 ХВ: {item.coldCost} ({coldPct.toFixed(0)}%)</span>
                    <span>🔥 ГВ: {item.hotCost} ({hotPct.toFixed(0)}%)</span>
                    <span>⚡ Электр: {elecTotalCost} ({elecPct.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
