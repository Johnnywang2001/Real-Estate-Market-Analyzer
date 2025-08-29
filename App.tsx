
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, TimePeriod, CityMarketData, TimeSeriesDataPoint, ZillowData } from './types';
import { generateReport } from './services/geminiService';
import { findCommonCities, transformCityData } from './services/zillowDataParser';
import { TIME_PERIODS } from './constants';
import StatCard from './components/StatCard';
import ReportChart, { ChartSeries } from './components/ReportChart';
import ChatInterface from './components/ChatInterface';
import ApiKeyModal from './components/ApiKeyModal';
import SharedReport from './components/SharedReport';
import ZillowDataUploader from './components/ZillowDataUploader';

// Chart Colors
const PRIMARY_COLOR = '#22d3ee'; // sky-400
const COMPARISON_COLOR = '#f472b6'; // pink-400
const NATIONAL_COLOR = '#a78bfa'; // violet-400

const calculateYoYChange = (series: TimeSeriesDataPoint[]): number | null => {
    if (series.length < 2) return null;

    const latestPoint = series[series.length - 1];
    if (latestPoint.value === null) return null;

    const latestDate = new Date(`${latestPoint.date}T00:00:00.000Z`);
    const oneYearAgoDate = new Date(latestDate);
    oneYearAgoDate.setUTCFullYear(latestDate.getUTCFullYear() - 1);
    
    let oneYearAgoPoint: TimeSeriesDataPoint | null = null;
    let minDateDiff = Infinity;

    for (let i = series.length - 1; i >= 0; i--) {
        const point = series[i];
        const pointDate = new Date(`${point.date}T00:00:00.000Z`);
        const diff = Math.abs(pointDate.getTime() - oneYearAgoDate.getTime());
        
        if (diff > minDateDiff && minDateDiff < (1000 * 60 * 60 * 24 * 60)) { break; }

        if (diff < minDateDiff) {
            minDateDiff = diff;
            oneYearAgoPoint = point;
        }
    }
    
    if (!oneYearAgoPoint || oneYearAgoPoint.value === null || oneYearAgoPoint.value === 0 || minDateDiff > (1000 * 60 * 60 * 24 * 90)) {
        return null;
    }
    
    const change = ((latestPoint.value - oneYearAgoPoint.value) / oneYearAgoPoint.value) * 100;
    return change;
};

// Utility to merge multiple time series for charting
const mergeDataForChart = (series: {name: string, data: TimeSeriesDataPoint[]}[]) => {
    const allPoints: { [date: string]: { [name: string]: number | null } } = {};

    series.forEach(s => {
        s.data.forEach(point => {
            if (!allPoints[point.date]) {
                allPoints[point.date] = {};
            }
            allPoints[point.date][s.name] = point.value;
        });
    });

    return Object.keys(allPoints)
        .map(date => ({ date, ...allPoints[date] }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


const App: React.FC = () => {
    const [geminiApiKey, setGeminiApiKey] = useState<string | null>(() => process.env.API_KEY || localStorage.getItem('geminiApiKey'));
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const [timePeriod, setTimePeriod] = useState<TimePeriod>('1Y');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [isParsing, setIsParsing] = useState<boolean>(false);

    const [sharedContent, setSharedContent] = useState<string | null>(null);
    
    const [zillowData, setZillowData] = useState<ZillowData | null>(null);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [comparisonCity, setComparisonCity] = useState<string | null>(null);

    // Derived market data
    const primaryCityData = useMemo(() => selectedCity && zillowData ? transformCityData(selectedCity, zillowData) : null, [selectedCity, zillowData]);
    const comparisonCityData = useMemo(() => comparisonCity && zillowData ? transformCityData(comparisonCity, zillowData) : null, [comparisonCity, zillowData]);
    const nationalData = useMemo(() => zillowData ? transformCityData('United States', zillowData) : null, [zillowData]);
    
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const shareData = urlParams.get('share');
        if (shareData) {
            try {
                setSharedContent(atob(shareData));
            } catch (error) {
                console.error("Failed to decode share data.", error);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, []);

    useEffect(() => {
        if (sharedContent) return;
        if (!geminiApiKey) {
            setIsSettingsModalOpen(true);
            setChatHistory([{ id: Date.now().toString(), sender: 'ai', text: 'Welcome! Please enter your Gemini API key in settings (⚙️) to get started.' }]);
        } else {
             setChatHistory([{ id: Date.now().toString(), sender: 'ai', text: "Welcome! I'm your AI real estate analyst. Please upload the required Zillow data files to begin." }]);
        }
    }, [geminiApiKey, sharedContent]);

    const handleSaveApiKey = (key: string) => {
        const trimmedKey = key.trim();
        localStorage.setItem('geminiApiKey', trimmedKey);
        setGeminiApiKey(trimmedKey);
        setIsSettingsModalOpen(false);
    };

    const handleZillowDataLoaded = (data: ZillowData) => {
        setIsParsing(true);
        try {
            const datasets = [data.salePrice.data, data.listPrice.data, data.saleToListRatio.data, data.daysToPending.data, data.newListings.data, data.inventory.data];
            const cities = findCommonCities(datasets);
            
            if (cities.length === 0) {
                setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: "I couldn't find any common cities across the uploaded files. Please ensure they cover the same geographic areas." }]);
                handleClearZillowData();
                return;
            }
            setZillowData(data);
            setAvailableCities(cities);
            setSelectedCity(cities[0]);
            setComparisonCity(null);
            setTimePeriod('1Y');
        } catch (error: any) {
            console.error("Error processing Zillow data:", error);
            setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: `An error occurred while processing the files: ${error.message}` }]);
            handleClearZillowData();
        } finally {
            setIsParsing(false);
        }
    };
    
    const handleClearZillowData = () => {
        setZillowData(null);
        setAvailableCities([]);
        setSelectedCity(null);
        setComparisonCity(null);
    };
    
    const handleSendMessage = useCallback(async (message: string) => {
        if (!primaryCityData || !geminiApiKey) {
            const errorText = !geminiApiKey 
                ? 'Please set your Gemini API key in settings first.'
                : 'Please upload data and select a city before asking for analysis.';
            setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: errorText }]);
            if (!geminiApiKey) setIsSettingsModalOpen(true);
            return;
        }

        setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: message }]);
        setIsAiLoading(true);

        try {
            const aiResponse = await generateReport(message, primaryCityData, comparisonCityData, nationalData, geminiApiKey);
            const aiMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                sender: 'ai', 
                text: aiResponse.text,
                sources: aiResponse.sources
            };
            setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error generating report:', error);
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: 'Sorry, I encountered an error. Please check your API key and try again.' };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsAiLoading(false);
        }
    }, [primaryCityData, comparisonCityData, nationalData, geminiApiKey]);

    const filterDataByTimePeriod = useCallback((data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] => {
        if (!data || data.length === 0) return [];
        if (timePeriod === 'Max') return data;
    
        const parseUTCDate = (dateString: string) => new Date(`${dateString}T00:00:00.000Z`);
    
        const lastDataPointDate = parseUTCDate(data[data.length - 1].date);
        const cutoffDate = new Date(lastDataPointDate.getTime());
    
        switch (timePeriod) {
            case '1M': cutoffDate.setUTCMonth(lastDataPointDate.getUTCMonth() - 1); break;
            case '3M': cutoffDate.setUTCMonth(lastDataPointDate.getUTCMonth() - 3); break;
            case '6M': cutoffDate.setUTCMonth(lastDataPointDate.getUTCMonth() - 6); break;
            case '1Y': cutoffDate.setUTCFullYear(lastDataPointDate.getUTCFullYear() - 1); break;
            case '3Y': cutoffDate.setUTCFullYear(lastDataPointDate.getUTCFullYear() - 3); break;
            case '5Y': cutoffDate.setUTCFullYear(lastDataPointDate.getUTCFullYear() - 5); break;
            case '10Y': cutoffDate.setUTCFullYear(lastDataPointDate.getUTCFullYear() - 10); break;
        }
        
        return data.filter(p => parseUTCDate(p.date) >= cutoffDate);
    }, [timePeriod]);

    const filteredPrimaryData = useMemo(() => {
        if (!primaryCityData) return null;
        return {
            ...primaryCityData,
            medianSalePrice: { ...primaryCityData.medianSalePrice, series: filterDataByTimePeriod(primaryCityData.medianSalePrice.series)},
            medianListPrice: { ...primaryCityData.medianListPrice, series: filterDataByTimePeriod(primaryCityData.medianListPrice.series)},
            saleToListRatio: { ...primaryCityData.saleToListRatio, series: filterDataByTimePeriod(primaryCityData.saleToListRatio.series)},
            medianDaysOnMarket: { ...primaryCityData.medianDaysOnMarket, series: filterDataByTimePeriod(primaryCityData.medianDaysOnMarket.series)},
            newListings: { ...primaryCityData.newListings, series: filterDataByTimePeriod(primaryCityData.newListings.series)},
            activeInventory: { ...primaryCityData.activeInventory, series: filterDataByTimePeriod(primaryCityData.activeInventory.series)},
        }
    }, [primaryCityData, filterDataByTimePeriod]);

    const getChartSeries = useCallback((
        primaryMetric: TimeSeriesDataPoint[], 
        comparisonMetric?: TimeSeriesDataPoint[], 
        nationalMetric?: TimeSeriesDataPoint[]
    ) => {
        const series: { name: string, data: TimeSeriesDataPoint[] }[] = [];
        if (primaryCityData) {
            series.push({ name: primaryCityData.cityName, data: primaryMetric });
        }
        if (comparisonCityData && comparisonMetric) {
            series.push({ name: comparisonCityData.cityName, data: comparisonMetric });
        }
        if (nationalData && nationalMetric) {
            series.push({ name: 'US Average', data: nationalMetric });
        }
        return series;
    }, [primaryCityData, comparisonCityData, nationalData]);
    
    if (sharedContent) {
        return <SharedReport content={sharedContent} />;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 font-sans p-4 lg:p-6">
            <ApiKeyModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSaveApiKey} currentKey={geminiApiKey} />
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-sky-400">Competitive Market Analyzer</h1>
                    <p className="text-slate-400 mt-1">AI-powered real estate intelligence using Zillow data</p>
                </div>
                <button onClick={() => setIsSettingsModalOpen(true)} className="text-slate-400 hover:text-sky-400 transition-colors p-2 rounded-full bg-slate-800 hover:bg-slate-700" aria-label="Settings">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </header>
            
            <main className="flex flex-col gap-6">
                <ZillowDataUploader onDataLoaded={handleZillowDataLoaded} onClearData={handleClearZillowData} isDataLoaded={!!zillowData} isParsing={isParsing} />
                
                {primaryCityData && filteredPrimaryData ? (
                    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
                        <div className="flex flex-col md:flex-row flex-wrap justify-between items-start gap-4 mb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto flex-grow">
                                <div>
                                    <label htmlFor="city-select" className="block text-sm font-medium text-slate-300 mb-1">Primary Market</label>
                                    <select id="city-select" value={selectedCity || ''} onChange={(e) => setSelectedCity(e.target.value)} className="bg-slate-700 border border-slate-600 text-white text-base font-semibold rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5">
                                        {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label htmlFor="comp-city-select" className="block text-sm font-medium text-slate-300 mb-1">Compare With</label>
                                    <select id="comp-city-select" value={comparisonCity || ''} onChange={(e) => setComparisonCity(e.target.value || null)} className="bg-slate-700 border border-slate-600 text-white text-base font-semibold rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5">
                                        <option value="">None</option>
                                        {availableCities.filter(c => c !== selectedCity).map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 self-end">
                                {TIME_PERIODS.map(period => (
                                    <button key={period} onClick={() => setTimePeriod(period)} className={`px-2 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${timePeriod === period ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-700/80 my-4"></div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                           <StatCard label="Median Sale Price" value={primaryCityData.medianSalePrice.latestValue ? `$${primaryCityData.medianSalePrice.latestValue.toLocaleString('en-US')}` : 'N/A'} change={calculateYoYChange(primaryCityData.medianSalePrice.series)} changeDirection="up" />
                           <StatCard label="Sale-to-List Ratio" value={primaryCityData.saleToListRatio.latestValue ? `${(primaryCityData.saleToListRatio.latestValue * 100).toFixed(1)}%` : 'N/A'} change={calculateYoYChange(primaryCityData.saleToListRatio.series)} changeDirection="up" />
                           <StatCard label="Days to Pending" value={primaryCityData.medianDaysOnMarket.latestValue?.toString() || 'N/A'} change={calculateYoYChange(primaryCityData.medianDaysOnMarket.series)} changeDirection="down" />
                           <StatCard label="Median List Price" value={primaryCityData.medianListPrice.latestValue ? `$${primaryCityData.medianListPrice.latestValue.toLocaleString('en-US')}` : 'N/A'} change={calculateYoYChange(primaryCityData.medianListPrice.series)} changeDirection="up" />
                           <StatCard label="New Listings" value={primaryCityData.newListings.latestValue?.toLocaleString('en-US') || 'N/A'} change={calculateYoYChange(primaryCityData.newListings.series)} changeDirection="up" />
                           <StatCard label="For Sale Inventory" value={primaryCityData.activeInventory.latestValue?.toLocaleString('en-US') || 'N/A'} change={calculateYoYChange(primaryCityData.activeInventory.series)} changeDirection="down" />
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ReportChart title="Median Sale Price" formatAs="currency" 
                                chartData={mergeDataForChart(getChartSeries(filteredPrimaryData.medianSalePrice.series, comparisonCityData?.medianSalePrice.series, nationalData?.medianSalePrice.series))}
                                series={[{name: primaryCityData.cityName, color: PRIMARY_COLOR}, {name: comparisonCityData?.cityName, color: COMPARISON_COLOR}, {name: 'US Average', color: NATIONAL_COLOR}].filter(s => s.name) as ChartSeries[]} />
                            <ReportChart title="Sale-to-List Price Ratio" formatAs="percent"
                                chartData={mergeDataForChart(getChartSeries(filteredPrimaryData.saleToListRatio.series, comparisonCityData?.saleToListRatio.series, nationalData?.saleToListRatio.series))}
                                series={[{name: primaryCityData.cityName, color: PRIMARY_COLOR}, {name: comparisonCityData?.cityName, color: COMPARISON_COLOR}, {name: 'US Average', color: NATIONAL_COLOR}].filter(s => s.name) as ChartSeries[]} />
                            <ReportChart title="Median Days to Pending" formatAs="days"
                                 chartData={mergeDataForChart(getChartSeries(filteredPrimaryData.medianDaysOnMarket.series, comparisonCityData?.medianDaysOnMarket.series, nationalData?.medianDaysOnMarket.series))}
                                 series={[{name: primaryCityData.cityName, color: PRIMARY_COLOR}, {name: comparisonCityData?.cityName, color: COMPARISON_COLOR}, {name: 'US Average', color: NATIONAL_COLOR}].filter(s => s.name) as ChartSeries[]} />
                            <ReportChart title="For Sale Inventory" formatAs="integer"
                                 chartData={mergeDataForChart(getChartSeries(filteredPrimaryData.activeInventory.series, comparisonCityData?.activeInventory.series, nationalData?.activeInventory.series))}
                                 series={[{name: primaryCityData.cityName, color: PRIMARY_COLOR}, {name: comparisonCityData?.cityName, color: COMPARISON_COLOR}, {name: 'US Average', color: NATIONAL_COLOR}].filter(s => s.name) as ChartSeries[]} />
                        </div>
                    </div>
                ) : (
                  <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex items-center justify-center min-h-[400px]">
                      <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <h3 className="mt-2 text-lg font-medium text-white">Awaiting Data</h3>
                          <p className="mt-1 text-sm text-slate-400">Upload the six required Zillow data files to begin analysis.</p>
                      </div>
                  </div>
                )}
                 
                <ChatInterface messages={chatHistory} onSendMessage={handleSendMessage} isLoading={isAiLoading} />
            </main>
        </div>
    );
};

export default App;
