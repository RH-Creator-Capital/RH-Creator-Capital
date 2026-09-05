"use client";

import { createChart, ColorType, ISeriesApi, Time, CandlestickSeries } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

export const ChartComponent = ({ marketId, resolution = "1m" }: { marketId: string, resolution?: string }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Chart Configuration for modern dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        visible: true,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 12,
      },
      rightPriceScale: {
        visible: true,
        autoScale: true,
      }
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', // text-color-buy
      downColor: '#ef4444', // text-color-sell
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 9,
        minMove: 0.000000001,
      },
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Fetch initial historical candles
    const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
    fetch(`${API_URL}/api/markets/${marketId}/candles?resolution=${resolution}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.candles) {
          const formattedData = data.candles.map((c: any) => ({
            time: Math.floor(new Date(c.timestamp).getTime() / 1000) as Time,
            open: Number(c.open) / 1e18,
            high: Number(c.high) / 1e18,
            low: Number(c.low) / 1e18,
            close: Number(c.close) / 1e18,
          }));
          candlestickSeries.setData(formattedData);
          if (formattedData.length > 0) {
            setIsEmpty(false);
            // Prevent extreme zoom when there are very few data points
            const minBarsToShow = 60; // Show a minimum of 60 periods (e.g. 60 mins for 1m resolution)
            if (formattedData.length < minBarsToShow) {
              chart.timeScale().setVisibleLogicalRange({
                from: formattedData.length - minBarsToShow,
                to: formattedData.length + 5,
              });
            } else {
              chart.timeScale().fitContent();
            }
          } else {
            setIsEmpty(true);
          }
          setIsLoading(false);
        } else {
          setIsEmpty(true);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load historical candles:", err);
        setIsLoading(false);
      });

    // Connect WebSocket
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL as string;
    const WS_URL = baseUrl.endsWith('/ws') ? baseUrl : `${baseUrl}/ws`;
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      // Subscribe to the market
      ws.send(JSON.stringify({ type: "subscribe", marketId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "candle_update" && msg.data) {
          const c = msg.data;
          try {
            candlestickSeries.update({
              time: Math.floor(new Date(c.timestamp).getTime() / 1000) as Time,
              open: Number(c.open) / 1e18,
              high: Number(c.high) / 1e18,
              low: Number(c.low) / 1e18,
              close: Number(c.close) / 1e18,
            });
            setIsEmpty(false);
          } catch (updateErr) {
            console.warn("Skipping outdated candle update");
          }
        }
      } catch (e) {
        console.error("Failed to process websocket message", e);
      }
    };

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      chart.remove();
    };
  }, [marketId, resolution]);

  return (
    <div className="relative w-full h-[300px] md:h-[400px]">
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Hide the TradingView watermark/logo */
        #tv-attr-logo { display: none !important; }
        .tv-lightweight-charts table ~ div > a { display: none !important; }
      `}} />
      <div className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} ref={chartContainerRef} />

      {isLoading && (
        <div className="absolute inset-0 p-4">
          <div className="w-full h-full bg-white/5 rounded-lg animate-pulse" />
        </div>
      )}
      {!isLoading && isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-color-border flex items-center justify-center text-color-muted mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg">No Chart Data Yet</h3>
            <p className="text-color-muted text-sm max-w-sm text-center">
              The chart will appear here once the first trade occurs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
