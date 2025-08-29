
import type { CityMarketData, TimeSeriesDataPoint, ZillowData } from '../types';

/**
 * Finds the common cities (RegionName) across multiple Zillow datasets.
 */
export function findCommonCities(
    datasets: any[][]
): string[] {
    if (datasets.length === 0) return [];

    const getCities = (data: any[]): Set<string> => 
        new Set(data.map(row => row.RegionName).filter(Boolean));

    const sets = datasets.map(getCities);
    
    const firstSet = sets[0];
    const commonCities = [...firstSet].filter(city => {
        // "United States" should not be a selectable city, it's used for national average
        if (city === 'United States') return false;
        for (let i = 1; i < sets.length; i++) {
            if (!sets[i].has(city)) {
                return false;
            }
        }
        return true;
    });
    
    return commonCities.sort();
}

/**
 * Extracts and transforms data for a single region (city or national) from the wide-format Zillow data.
 */
export function transformCityData(
    regionName: string,
    zillowData: ZillowData
): CityMarketData | null {
    
    const findRow = (data: any[], name: string) => data.find(row => row.RegionName === name);

    const salePriceRow = findRow(zillowData.salePrice.data, regionName);
    // If we can't find the primary data for a region, it's invalid.
    if (!salePriceRow) return null;
    
    const listPriceRow = findRow(zillowData.listPrice.data, regionName);
    const saleToListRatioRow = findRow(zillowData.saleToListRatio.data, regionName);
    const daysRow = findRow(zillowData.daysToPending.data, regionName);
    const newListingsRow = findRow(zillowData.newListings.data, regionName);
    const inventoryRow = findRow(zillowData.inventory.data, regionName);

    const transformRowToSeries = (row: any): TimeSeriesDataPoint[] => {
        if (!row) return [];
        
        const series: TimeSeriesDataPoint[] = [];
        // Regex to match YYYY-MM-DD or YYYY-MM date columns
        const dateRegex = /^\d{4}-\d{2}(-\d{2})?$/; 

        for (const key in row) {
            if (dateRegex.test(key)) {
                const value = parseFloat(row[key]);
                if (!isNaN(value)) {
                    // Ensure date is in YYYY-MM-DD format, assuming day is end of month if missing.
                    const date = key.length === 7 ? `${key}-28` : key;
                    series.push({ date: new Date(date).toISOString().split('T')[0], value });
                }
            }
        }
        // Sort by date as object key order is not guaranteed
        return series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };
    
    const cityData: CityMarketData = {
        cityName: regionName,
        stateName: salePriceRow?.StateName || "",
        medianSalePrice: { series: transformRowToSeries(salePriceRow), latestValue: null },
        medianListPrice: { series: transformRowToSeries(listPriceRow), latestValue: null },
        saleToListRatio: { series: transformRowToSeries(saleToListRatioRow), latestValue: null },
        medianDaysOnMarket: { series: transformRowToSeries(daysRow), latestValue: null },
        newListings: { series: transformRowToSeries(newListingsRow), latestValue: null },
        activeInventory: { series: transformRowToSeries(inventoryRow), latestValue: null },
    };

    const setLatestValue = (metric: any) => {
        if (metric.series.length > 0) {
            metric.latestValue = metric.series[metric.series.length - 1].value;
        }
    };

    setLatestValue(cityData.medianSalePrice);
    setLatestValue(cityData.medianListPrice);
    setLatestValue(cityData.saleToListRatio);
    setLatestValue(cityData.medianDaysOnMarket);
    setLatestValue(cityData.newListings);
    setLatestValue(cityData.activeInventory);

    return cityData;
}
