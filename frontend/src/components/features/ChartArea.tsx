import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType} from 'lightweight-charts';
import type { ISeriesApi, UTCTimestamp } from 'lightweight-charts';

import { useGame } from '../../context/GameContext';

const ChartArea = () => {
  const { currentPrice, isPlaying } = useGame();
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<any | null>(null);
  
  const [isChartReady, setIsChartReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Ref for data tracking
  const currentCandleRef = useRef<{
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  /**
   * INITIALIZATION EFFECT
   */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    setErrorMsg(null);

    try {
      // 1. Create Chart with TradingView Theme Colors
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#131722' }, // TradingView Dark Background
          textColor: '#d1d5db', // Light Gray Text
        },
        grid: {
          vertLines: { color: '#1f2937' }, // Subtle grid lines
          horzLines: { color: '#1f2937' },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderColor: '#2B2B43',
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
        },
      });

      chartRef.current = chart;

      // 2. Add Series (TradingView Candle Colors)
      let series: ISeriesApi<"Candlestick">;
      
      if (typeof chart.addCandlestickSeries === 'function') {
        series = chart.addCandlestickSeries({
          upColor: '#26a69a', // Classic TV Green
          downColor: '#ef5350', // Classic TV Red
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else {
        throw new Error("Library Mismatch: addCandlestickSeries not found.");
      }

      // 3. Generate Dummy Data
      const initialData: any[] = [];
      let time = (Math.floor(Date.now() / 1000) - 100 * 5) as UTCTimestamp;
      let price = 21500;
      
      for (let i = 0; i < 100; i++) {
        const open = price;
        const close = price + (Math.random() - 0.5) * 10;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        initialData.push({ time, open, high, low, close });
        price = close;
        time = (time + 5) as UTCTimestamp;
      }

      series.setData(initialData);
      chart.timeScale().fitContent();
      
      seriesRef.current = series;
      currentCandleRef.current = initialData[initialData.length - 1];
      setIsChartReady(true);

      // 4. Handle Resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error: any) {
      console.error("Chart Init Error:", error);
      setErrorMsg(error.message || "Unknown Chart Error");
    }
  }, []);

  /**
   * LIVE DATA EFFECT
   */
  useEffect(() => {
    if (!isPlaying || !seriesRef.current) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      const candleTime = (Math.floor(now / 5) * 5) as UTCTimestamp;
      let candle = currentCandleRef.current;

      if (!candle || candle.time !== candleTime) {
        candle = {
          time: candleTime,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
        };
      } else {
        candle.high = Math.max(candle.high, currentPrice);
        candle.low = Math.min(candle.low, currentPrice);
        candle.close = currentPrice;
      }

      currentCandleRef.current = candle;
      seriesRef.current.update(candle);
    } catch (err) {
      console.error("Update Error:", err);
    }
  }, [currentPrice, isPlaying]);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full w-full bg-[#131722] border-r border-gray-800 font-sans">
      {/* TRADING VIEW STYLE HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2B43] bg-[#131722]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-white font-bold text-lg tracking-wide">NIFTY 50</span>
             <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-500/20">INDEX</span>
          </div>
          
          {/* Vertical Divider */}
          <div className="h-4 w-[1px] bg-gray-700"></div>

          {/* Timeframes (Mock UI) */}
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
             <button className="hover:text-gray-300 transition-colors">1m</button>
             <button className="text-[#26a69a] bg-[#26a69a]/10 px-2 rounded">5m</button>
             <button className="hover:text-gray-300 transition-colors">15m</button>
             <button className="hover:text-gray-300 transition-colors">1h</button>
             <button className="hover:text-gray-300 transition-colors">4h</button>
          </div>
        </div>

        {/* Live Price Display */}
        <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <div className={`text-xl font-mono font-bold leading-none ${
                    currentPrice >= (currentCandleRef.current?.open ?? 0) ? 'text-[#26a69a]' : 'text-[#ef5350]'
                }`}>
                    {currentPrice.toFixed(2)}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                    {isPlaying ? 'MARKET OPEN' : 'PAUSED'}
                </div>
             </div>
        </div>
      </div>

      {/* CHART CONTENT */}
      <div className="flex-1 relative w-full h-full">
         {/* Error State */}
         {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722] z-50 p-4 text-center">
              <p className="text-[#ef5350] font-bold mb-2">System Error</p>
              <p className="text-gray-400 text-sm">{errorMsg}</p>
            </div>
         )}

         {/* Loading State */}
         {!isChartReady && !errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-50">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#26a69a]"></div>
            </div>
         )}

         {/* Actual Chart Canvas */}
         <div ref={chartContainerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default ChartArea;