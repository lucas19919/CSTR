import "./App.css";
import { useState, useEffect } from "react";
import {
    Metric,
    Text,
    LineChart,
    Accordion,
    AccordionList,
    AccordionHeader,
    AccordionBody,
    NumberInput,
    Button,
} from "@tremor/react";

// --- API CONFIGURATION ---
const API_URL = "http://localhost:5053";

const bentoCard = "bg-white rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-50/50 ring-1 ring-slate-100";

// --- DEFAULT STATE CONSTANT ---
const DEFAULT_CONFIG = {
    Geometry: {
        volume: 100.0,                  // L
        heatTransferCoefficient: 1000.0,// W/(m^2·K)  [J/s]
        heatTransferArea: 5.0           // m^2
    },
    Fluid: {
        density: 1.0,                   // kg/L 
        specificHeat: 4180.0,           // J/(kgK)
        thermalConductivity: 0.6        // W/(mK)
    },
    Reaction: {
        reactionEnthalpy: -50000.0,     // J/mol
        activationEnergy: 72750.0,      // J/mol
        preExponentialFactor: 7.2e10,   // 1/s (
        reactionOrder: 1.0,
        universalGasConstant: 8.314     // J/(molK)
    },
    Operation: {
        inletFlowrate: 0.0278,          // L/s 
        inletConcentration: 1.0,        // mol/L
        inletTemperature: 350.0,        // K
        coolantTemperature: 300.0,      // K

        // Independent Variables
        timeStep: 0.1,                  // s
        currentConcentration: 0.0,      // mol/L
        currentTemperature: 350.0,      // K
        currentTime: 0.0                // s
    },

};

// Helper to format seconds into MM:SS.mmm
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000); // 3 decimal places
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

export default function App() {
    const [isRunning, setIsRunning] = useState(false);
    const [history, setHistory] = useState([]);
    const [reactorConfig, setReactorConfig] = useState(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));

    const handleInputChange = (category, field, value) => {
        setReactorConfig(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseFloat(value) || 0 }
        }));
    };

    // --- API HANDLERS ---
    const handleInitialize = async () => {
        try {
            const response = await fetch(`${API_URL}/reactor/initialize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reactorConfig)
            });

            if (response.ok) {
                console.log("Reactor Initialized Successfully");
                setHistory([]);
                setIsRunning(true);
            } else {
                console.error("Failed to initialize reactor");
            }
        } catch (error) {
            console.error("API Error:", error);
            alert("Could not connect to Backend. Is it running on port 5053?");
        }
    };

    const handleStop = () => setIsRunning(false);

    const handleReset = () => {
        setIsRunning(false);
        setHistory([]);
        setReactorConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    };

    useEffect(() => {
        let intervalId;

        if (isRunning) {
            intervalId = setInterval(async () => {
                try {
                    const dt = reactorConfig.Operation.timeStep;
                    const res = await fetch(`${API_URL}/reactor/step?dt=${dt}`, {
                        method: 'POST'
                    });

                    if (res.ok) {
                        const data = await res.json();

                        const mappedState = {
                            Geometry: data.geometry,
                            Fluid: data.fluid,
                            Reaction: data.reaction,
                            Operation: data.operation
                        };

                        setReactorConfig(mappedState);

                        setHistory(prev => {
                            const newPoint = {
                                time: data.operation.currentTime.toFixed(3),
                                Concentration: data.operation.currentConcentration,
                                Temp: data.operation.currentTemperature
                            };
                            const newHistory = [...prev, newPoint];
                            return newHistory;
                        });
                    }
                } catch (error) {
                    console.error("Step Error:", error);
                    setIsRunning(false);
                }
            }, 500);
        }

        return () => clearInterval(intervalId);
    }, [isRunning, reactorConfig.Operation.timeStep]);


    return (
        <div className="flex h-screen w-screen bg-[#F5F5F7] overflow-hidden font-sans text-slate-800">

            {/* --- SIDEBAR --- */}
            <aside className="w-80 h-full flex flex-col bg-white/60 backdrop-blur-md border-r border-white/50 shrink-0 z-20">
                <div className="px-8 py-8 pb-4">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Reactor<span className="text-indigo-600">.Control</span></h1>
                    <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Configuration Panel</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                    <AccordionList className="space-y-4">
                        <MinimalConfigSection title="Geometry" data={reactorConfig.Geometry} category="Geometry" onChange={handleInputChange} />
                        <MinimalConfigSection title="Fluid Properties" data={reactorConfig.Fluid} category="Fluid" onChange={handleInputChange} />
                        <MinimalConfigSection title="Kinetics" data={reactorConfig.Reaction} category="Reaction" onChange={handleInputChange} lockedFields={["universalGasConstant"]} />
                        <MinimalConfigSection
                            title="Operation"
                            data={reactorConfig.Operation}
                            category="Operation"
                            onChange={handleInputChange}
                            hiddenFields={["currentTime", "currentConcentration", "currentTemperature"]}
                        />
                    </AccordionList>
                </div>

                <div className="p-6 bg-gradient-to-t from-white/90 to-transparent flex flex-col gap-3">
                    {isRunning ? (
                        <Button size="xl" className="w-full rounded-2xl shadow-lg shadow-rose-200/50 border-0 transition-transform active:scale-95" color="rose" onClick={handleStop}>
                            Stop Simulation
                        </Button>
                    ) : (
                        <>
                            <Button size="xl" className="w-full rounded-2xl shadow-lg shadow-indigo-200/50 border-0 transition-transform active:scale-95" color="indigo" onClick={handleInitialize}>
                                Initialize System
                            </Button>
                            <Button size="md" variant="secondary" className="w-full rounded-xl border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={handleReset}>
                                Reset to Defaults
                            </Button>
                        </>
                    )}
                </div>
            </aside>


            {/* --- MAIN DASHBOARD --- */}
            <main className="flex-1 h-full flex flex-col relative overflow-hidden p-6 gap-6">

                <header className="shrink-0 flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Telemetry Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-100">
                        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></div>
                        <Text className="font-medium">{isRunning ? "System Active" : "Standby Mode"}</Text>
                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                        <div className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 rounded">
                            T+ {formatTime(reactorConfig.Operation.currentTime)}
                        </div>
                    </div>
                </header>

                <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-6 gap-4">

                    {/* TOP ROW: KPIs */}
                    <div className="col-span-12 row-span-1 grid grid-cols-4 gap-4">
                        <KPIBlock title="Current Conc." value={`${reactorConfig.Operation.currentConcentration.toFixed(4)} M`} delta={isRunning ? "Simulating" : "-"} />
                        <KPIBlock title="Current Temp." value={`${reactorConfig.Operation.currentTemperature.toFixed(1)} K`} delta={isRunning ? "Simulating" : "-"} />
                        <KPIBlock title="Residence Time" value={(reactorConfig.Geometry.volume / reactorConfig.Operation.inletFlowrate / 60).toFixed(1) + " min"} delta={"Calc"}  />
                        <KPIBlock title="Conv. Rate" value={((reactorConfig.Operation.inletConcentration - reactorConfig.Operation.currentConcentration) / reactorConfig.Operation.inletConcentration * 100).toFixed(2) + "%"} delta={"Calc"} />
                    </div>

                    {/* MIDDLE LEFT: Trends */}
                    <div className="col-span-8 row-span-5 grid grid-rows-2 gap-4">

                        {/* CHART 1: Concentration */}
                        <div className={bentoCard}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-slate-600">Concentration Progression</h3>
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <LineChart
                                    className="h-full w-full"
                                    data={history}
                                    index="time"
                                    categories={["Concentration"]}
                                    colors={["cyan"]}
                                    showYAxis={true}
                                    showXAxis={true}
                                    showLegend={false}
                                    showGridLines={true}
                                    autoMinValue={true}
                                    curveType="monotone"
                                />
                            </div>
                        </div>

                        {/* CHART 2: Temperature */}
                        <div className={bentoCard}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-slate-600">Temperature Progression</h3>
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <LineChart
                                    className="h-full w-full"
                                    data={history}
                                    index="time"
                                    categories={["Temp"]}
                                    colors={["orange"]}
                                    showYAxis={true}
                                    showLegend={false}
                                    showXAxis={true}
                                    showGridLines={true}
                                    autoMinValue={true}
                                    curveType="monotone"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE RIGHT: Live Parameter Stack */}
                    <div className="col-span-4 row-span-5 flex flex-col gap-4 h-full">
                        <RangeCard title="Inlet Flow Rate" value={reactorConfig.Operation.inletFlowrate} unit="L/s" min={0} max={0.5} color="indigo" />
                        <RangeCard title="Inlet Concentration" value={reactorConfig.Operation.inletConcentration} unit="mol/L" min={0} max={10} color="cyan" />
                        <RangeCard title="Inlet Temperature" value={reactorConfig.Operation.inletTemperature} unit="K" min={200} max={1000} color="orange" />
                        <RangeCard title="Coolant Temperature" value={reactorConfig.Operation.coolantTemperature} unit="K" min={200} max={500} color="blue" />
                    </div>

                </div>
            </main>
        </div>
    );
} 

// --- VISUALIZATION COMPONENTS ---
function RangeCard({ title, value, unit, min, max, color }) {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const colorMap = { indigo: "bg-indigo-500", cyan: "bg-cyan-500", orange: "bg-orange-500", blue: "bg-blue-500", slate: "bg-slate-500" };

    return (
        <div className="flex-1 bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
                <span className="text-lg font-bold text-slate-700 font-mono">{value} <span className="text-[10px] text-slate-400 font-sans">{unit}</span></span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div className={`h-full rounded-full transition-all duration-500 ease-out ${colorMap[color]}`} style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[9px] font-medium text-slate-300">{min}</span>
                <span className="text-[9px] font-medium text-slate-300">{max}</span>
            </div>
        </div>
    );
}

function KPIBlock({ title, value, delta }) {
    return (
        <div className={`${bentoCard} flex-col items-center justify-center text-center !p-4`}>
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</Text>
            <Metric className="text-3xl text-slate-800">{value}</Metric>
            <div className="mt-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100">{delta}</div>
        </div>
    );
}

function MinimalConfigSection({ title, data, category, onChange, lockedFields = [], hiddenFields = [] }) {
    return (
        <Accordion className="border-none shadow-none ring-0 bg-transparent">
            <AccordionHeader className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">{title}</AccordionHeader>
            <AccordionBody className="px-4 pb-2 pt-0 space-y-3">
                {Object.keys(data).filter(key => !hiddenFields.includes(key)).map((key) => (
                    <div key={key} className="group">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                        </div>
                        <NumberInput
                            value={data[key]}
                            onValueChange={(v) => onChange(category, key, v)}
                            disabled={lockedFields.includes(key)}
                            className="!border-0 !ring-0 !bg-slate-50 !shadow-none focus:!bg-white focus:!ring-1 focus:!ring-indigo-100 rounded-lg transition-all"
                            placeholder="0.00"
                        />
                    </div>
                ))}
            </AccordionBody>
        </Accordion>
    );
}