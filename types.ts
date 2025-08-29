
export interface TimeSeriesDataPoint {
    date: string; // ISO string for the date
    value: number | null;
}

export interface Metric {
    series: TimeSeriesDataPoint[];
    latestValue: number | null;
}

export interface CityMarketData {
  cityName: string;
  stateName: string;
  medianSalePrice: Metric;
  medianListPrice: Metric;
  saleToListRatio: Metric;
  medianDaysOnMarket: Metric;
  newListings: Metric;
  activeInventory: Metric;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: { title: string; uri: string; }[];
}

export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'Max';

export interface ZillowDataFile {
    fileName: string;
    fileContent?: File; // The raw file for parsing
    data?: any[];      // The parsed data
}

export interface ZillowData {
    salePrice: { fileName: string, data: any[] };
    listPrice: { fileName: string, data: any[] };
    saleToListRatio: { fileName: string, data: any[] };
    daysToPending: { fileName: string, data: any[] };
    newListings: { fileName: string, data: any[] };
    inventory: { fileName: string, data: any[] };
}
