
import React, { useState, useEffect, useCallback } from 'react';
import type { ZillowData, ZillowDataFile } from '../types';

// PapaParse is loaded from a CDN
declare global {
    interface Window {
        Papa: any;
    }
}

interface ZillowDataUploaderProps {
    onDataLoaded: (data: ZillowData) => void;
    onClearData: () => void;
    isDataLoaded: boolean;
    isParsing: boolean;
}

const ZILLOW_DATA_URL = "https://www.zillow.com/research/data/";

const FileInput: React.FC<{
    id: keyof ZillowData,
    title: string,
    description: string,
    file: ZillowDataFile | null,
    onFileChange: (id: keyof ZillowData, file: File) => void
}> = ({ id, title, description, file, onFileChange }) => {
    
    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('border-sky-500');
    };
     const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('border-sky-500');
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('border-sky-500');
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            onFileChange(id, event.dataTransfer.files[0]);
        }
    };

    if (file) {
        return (
             <div className="p-2 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300 truncate">
                    {title}: <span className="font-semibold text-sky-400">{file.fileName}</span>
                </p>
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
            <p className="text-xs text-slate-400 mb-1.5">{description}</p>
            <label 
                htmlFor={`${id}-upload`}
                className="cursor-pointer"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="border-2 border-dashed border-slate-600 hover:border-sky-500 transition-colors p-2.5 rounded-lg text-center bg-slate-700/30">
                    <input
                        id={`${id}-upload`}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => e.target.files && onFileChange(id, e.target.files[0])}
                    />
                    <p className="text-xs text-slate-400">
                        Drag & drop, or <span className="text-sky-400 font-semibold">click to select</span>.
                    </p>
                </div>
            </label>
        </div>
    )
}


const ZillowDataUploader: React.FC<ZillowDataUploaderProps> = ({ onDataLoaded, onClearData, isDataLoaded, isParsing }) => {
    const [files, setFiles] = useState<Partial<Record<keyof ZillowData, ZillowDataFile>>>({});
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (id: keyof ZillowData, file: File) => {
        setError(null);
        setFiles(prev => ({...prev, [id]: { fileName: file.name, fileContent: file } }));
    }
    
    const parseFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            if (!window.Papa) {
                 reject(new Error("CSV parsing library is not loaded."));
                 return;
            }
            window.Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: any) => resolve(results.data),
                error: (err: any) => reject(new Error(`CSV parsing error in ${file.name}: ${err.message}`)),
            });
        });
    };

    // Effect to trigger data loading when all files are present
    useEffect(() => {
        const { salePrice, listPrice, saleToListRatio, daysToPending, newListings, inventory } = files;
        if (salePrice && listPrice && saleToListRatio && daysToPending && newListings && inventory) {
            const processFiles = async () => {
                try {
                    const [
                        salePriceData, 
                        listPriceData,
                        saleToListRatioData,
                        daysToPendingData, 
                        newListingsData, 
                        inventoryData
                    ] = await Promise.all([
                        parseFile(salePrice.fileContent as File),
                        parseFile(listPrice.fileContent as File),
                        parseFile(saleToListRatio.fileContent as File),
                        parseFile(daysToPending.fileContent as File),
                        parseFile(newListings.fileContent as File),
                        parseFile(inventory.fileContent as File),
                    ]);
                    
                    onDataLoaded({
                        salePrice: { fileName: salePrice.fileName, data: salePriceData },
                        listPrice: { fileName: listPrice.fileName, data: listPriceData },
                        saleToListRatio: { fileName: saleToListRatio.fileName, data: saleToListRatioData },
                        daysToPending: { fileName: daysToPending.fileName, data: daysToPendingData },
                        newListings: { fileName: newListings.fileName, data: newListingsData },
                        inventory: { fileName: inventory.fileName, data: inventoryData },
                    });

                } catch (e: any) {
                    setError(e.message);
                }
            };
            processFiles();
        }
    }, [files, onDataLoaded]);


    if (isDataLoaded || isParsing) {
         return (
            <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-3 text-white">Zillow Market Data</h2>
                 <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                     {isParsing ? (
                         <p className="text-sm text-slate-300 animate-pulse">Processing files...</p>
                     ) : (
                        <>
                            <p className="text-sm text-slate-300 mb-2">
                                Data successfully loaded. Select markets to analyze.
                            </p>
                            <button
                                onClick={() => { setFiles({}); onClearData(); }}
                                className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-md transition-colors"
                            >
                                Clear All Data
                            </button>
                        </>
                     )}
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-1 text-white">Zillow Market Data</h2>
            <p className="text-sm text-slate-400 mb-4">
              Download and upload the six required city-level CSV files from the <a href={ZILLOW_DATA_URL} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-semibold">'Sales &amp; Listings' section</a> on the Zillow Research data page.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileInput 
                    id="salePrice"
                    title="1. Median Sale Price"
                    description="The typical sale price for homes."
                    file={files.salePrice || null}
                    onFileChange={handleFileChange}
                />
                 <FileInput 
                    id="listPrice"
                    title="2. Median List Price"
                    description="The typical asking price for homes."
                    file={files.listPrice || null}
                    onFileChange={handleFileChange}
                />
                 <FileInput 
                    id="saleToListRatio"
                    title="3. Sale-to-List Ratio"
                    description="Shows if homes sell above/below asking."
                    file={files.saleToListRatio || null}
                    onFileChange={handleFileChange}
                />
                 <FileInput 
                    id="daysToPending"
                    title="4. Median Days to Pending"
                    description="How quickly homes go under contract."
                    file={files.daysToPending || null}
                    onFileChange={handleFileChange}
                />
                 <FileInput 
                    id="newListings"
                    title="5. New Listings"
                    description="The number of new homes listed."
                    file={files.newListings || null}
                    onFileChange={handleFileChange}
                />
                 <FileInput 
                    id="inventory"
                    title="6. For Sale Inventory"
                    description="Total homes available for sale."
                    file={files.inventory || null}
                    onFileChange={handleFileChange}
                />
            </div>
             {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>
    );
};

export default ZillowDataUploader;
